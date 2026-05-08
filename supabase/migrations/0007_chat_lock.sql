-- ===========================================================================
-- 0007_chat_lock.sql
--
-- Lock conversations once the linked order is completed (or the escrow
-- auto-release fires). The UI hides the composer and renders a closed-chat
-- banner; old messages stay readable. Server-side enforcement: an INSERT
-- guard on `messages` blocks new non-system rows on locked conversations.
-- ===========================================================================

alter table public.conversations
  add column if not exists is_locked boolean not null default false;

create index if not exists idx_conv_locked
  on public.conversations (is_locked)
  where is_locked = true;

-- ---------------------------------------------------------------------------
-- When an order moves to 'completed', flip is_locked on its conversation and
-- post the closure system message. Idempotent — the status guard on the
-- update plus the existing-row check prevent duplicate banners.
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER + fixed search_path so the trigger bypasses RLS on
-- conversations / messages (clients confirming delivery don't have UPDATE
-- rights on conversations and can't insert messages with sender_id !=
-- auth.uid()). Owned by the migration role.
create or replace function public.lock_conversation_on_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    select id into conv_id
      from public.conversations
     where order_id = new.id
     limit 1;
    if conv_id is not null then
      update public.conversations
         set is_locked = true
       where id = conv_id
         and is_locked = false;
      insert into public.messages
        (conversation_id, sender_id, content, type, is_system)
      values
        (conv_id, new.freelancer_id,
         'تم إغلاق المحادثة بعد اكتمال الطلب والإفراج عن المبلغ.',
         'text', true);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_lock_chat on public.orders;
create trigger trg_orders_lock_chat
after update of status on public.orders
for each row execute function public.lock_conversation_on_completion();

-- ---------------------------------------------------------------------------
-- Block new non-system messages on locked conversations. System messages
-- (audit trail, the closure notice) are still allowed so triggers keep
-- working.
-- ---------------------------------------------------------------------------
create or replace function public.guard_locked_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  locked boolean;
begin
  if coalesce(new.is_system, false) then
    return new;
  end if;
  select is_locked into locked
    from public.conversations
   where id = new.conversation_id;
  if locked then
    raise exception 'Conversation is closed'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_messages_guard_locked on public.messages;
create trigger trg_messages_guard_locked
before insert on public.messages
for each row execute function public.guard_locked_conversation();

-- ---------------------------------------------------------------------------
-- Backfill: any already-completed orders should have their conversation
-- locked too, so freshly migrated deployments behave consistently.
-- ---------------------------------------------------------------------------
update public.conversations c
   set is_locked = true
  from public.orders o
 where c.order_id = o.id
   and o.status = 'completed'
   and c.is_locked = false;

-- ---------------------------------------------------------------------------
-- Update the auto-release function to lock the conversation alongside the
-- existing system message. SECURITY DEFINER bypasses the message guard.
-- ---------------------------------------------------------------------------
create or replace function public.escrow_auto_release()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released_count integer := 0;
  o record;
  conv_id uuid;
  upd_count integer;
begin
  for o in
    select id, freelancer_id, client_id
      from public.orders
     where status = 'delivered'
       and auto_release_at is not null
       and auto_release_at <= now()
  loop
    update public.orders
       set status = 'completed'
     where id = o.id
       and status = 'delivered';
    get diagnostics upd_count = row_count;
    if upd_count = 0 then
      continue;
    end if;

    select id into conv_id
      from public.conversations
     where order_id = o.id
     limit 1;

    if conv_id is not null then
      -- The completion trigger already flips is_locked and posts the closure
      -- notice; this row is the legacy auto-release banner kept for the
      -- audit trail.
      insert into public.messages
        (conversation_id, sender_id, content, type, is_system)
      values
        (conv_id, o.freelancer_id,
         'Auto-released after 7-day review window. Funds transferred to the freelancer.',
         'text', true);
    end if;

    released_count := released_count + 1;
  end loop;

  return released_count;
end;
$$;
