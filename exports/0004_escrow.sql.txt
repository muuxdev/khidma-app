-- ===========================================================================
-- 0004_escrow.sql
--
-- Escrow payment flow: replaces the 5-status order lifecycle with an
-- 8-status escrow lifecycle.
--
-- Lifecycle:
--   pending_deposit  - order created, awaiting 15% deposit from client
--   deposit_paid     - 15% deposit received, chat unlocked
--   info_received    - freelancer confirmed they have enough info to start
--   fully_paid       - client paid the remaining 85%
--   in_progress      - freelancer accepted the funds and started working
--   delivered        - freelancer marked work done, 7-day review window
--   completed        - client confirmed (or auto-released after 7 days)
--   cancelled
--
-- Auto-release: an hourly pg_cron job moves `delivered` orders to `completed`
-- once `auto_release_at` is in the past. Completion fires the existing
-- earnings trigger.
--
-- Server-side state machine: a BEFORE UPDATE trigger validates that any
-- status change follows the allowed transition graph. The auto-release
-- function (SECURITY DEFINER) goes through the same trigger and follows
-- the allowed delivered → completed edge.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Drop the old check constraint FIRST so the backfill UPDATEs below don't
-- violate it. (Updating to 'pending_deposit' under the old check would
-- fail because the old constraint only knew the legacy 5 values.)
-- ---------------------------------------------------------------------------
alter table public.orders
  drop constraint if exists orders_status_check;

-- Backfill to the new status names. 'review' (a value the UI used before
-- Supabase was wired up) maps to the new 'delivered' state.
update public.orders set status = 'pending_deposit' where status = 'pending';
update public.orders set status = 'in_progress'      where status = 'active';
update public.orders set status = 'delivered'        where status = 'review';
-- 'delivered', 'completed', 'cancelled' are already valid in the new set.

alter table public.orders
  add constraint orders_status_check
  check (status in (
    'pending_deposit',
    'deposit_paid',
    'info_received',
    'fully_paid',
    'in_progress',
    'delivered',
    'completed',
    'cancelled'
  ));

alter table public.orders
  alter column status set default 'pending_deposit';

-- ---------------------------------------------------------------------------
-- Escrow timestamps + amounts
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists deposit_amount    numeric,
  add column if not exists final_amount      numeric,
  add column if not exists deposit_paid_at   timestamptz,
  add column if not exists info_received_at  timestamptz,
  add column if not exists final_paid_at     timestamptz,
  add column if not exists delivered_at      timestamptz,
  add column if not exists auto_release_at   timestamptz;

create or replace function public.set_order_escrow_amounts()
returns trigger
language plpgsql
as $$
begin
  if new.total_price is not null then
    new.deposit_amount := round(new.total_price * 0.15, 2);
    new.final_amount   := round(new.total_price * 0.85, 2);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_set_escrow_amounts on public.orders;
create trigger trg_orders_set_escrow_amounts
before insert or update of total_price on public.orders
for each row execute function public.set_order_escrow_amounts();

update public.orders
   set deposit_amount = round(total_price * 0.15, 2),
       final_amount   = round(total_price * 0.85, 2)
 where deposit_amount is null;

-- ---------------------------------------------------------------------------
-- Server-side state machine. Any status change has to be a legal edge in the
-- escrow graph. This is the second layer of defence — RLS still controls
-- *who* can update, this trigger controls *what* transitions are valid.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
as $$
declare
  ok boolean := false;
begin
  if old.status = new.status then
    return new;  -- no-op
  end if;

  ok := case old.status
    when 'pending_deposit' then new.status in ('deposit_paid', 'cancelled')
    when 'deposit_paid'    then new.status in ('info_received', 'cancelled')
    when 'info_received'   then new.status in ('fully_paid', 'cancelled')
    when 'fully_paid'      then new.status in ('in_progress', 'cancelled')
    when 'in_progress'     then new.status in ('delivered', 'cancelled')
    when 'delivered'       then new.status in ('completed', 'cancelled')
    when 'completed'       then false
    when 'cancelled'       then false
    else false
  end;

  if not ok then
    raise exception
      'Invalid order status transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_status_transition on public.orders;
create trigger trg_orders_status_transition
before update of status on public.orders
for each row execute function public.enforce_order_status_transition();

-- ---------------------------------------------------------------------------
-- messages.is_system - flags automated escrow chatter so the UI can render
-- it as a centered system bubble instead of as one of the parties.
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists is_system boolean not null default false;

-- ---------------------------------------------------------------------------
-- Auto-release: runs hourly via pg_cron. Any 'delivered' order whose
-- auto_release_at has elapsed is moved to 'completed', firing the existing
-- earnings trigger. Uses a status-guarded UPDATE so a concurrent client
-- confirmation can't race with the cron run.
-- ---------------------------------------------------------------------------
create index if not exists idx_orders_auto_release
  on public.orders (auto_release_at)
  where status = 'delivered';

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
    -- Status-guarded update: if the client confirmed in the meantime, the
    -- WHERE clause won't match and we just skip.
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

create extension if not exists pg_cron;

do $$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'escrow_auto_release_hourly';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
  perform cron.schedule(
    'escrow_auto_release_hourly',
    '0 * * * *',
    $cron$ select public.escrow_auto_release(); $cron$
  );
end;
$$;
