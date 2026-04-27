-- =============================================================================
-- Khidma — production-safety hardening
--
-- Purpose:
--   1. Tear down any temporary debug policies that may have been added in the
--      Supabase SQL editor (anything using `with check (true)` on the
--      app's tables).
--   2. Re-affirm the secure, production policies for tables that the app
--      writes to (orders, conversations, messages, services, audit_logs,
--      notifications, wallet_transactions).
--   3. Mark every trigger function that performs an INSERT into a different
--      table as SECURITY DEFINER so RLS does not block the trigger when the
--      caller has no INSERT policy on the audited / notified table.
--
-- Apply AFTER 0001_init.sql, 0002_rls.sql, 0003_storage.sql.
-- Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop any leftover debug "with check (true)" policies on app tables.
--    These are only created if a developer added them by hand in the SQL
--    editor — production migrations never use that form.
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','services','orders','wallet_transactions',
        'quote_requests','conversations','messages',
        'notifications','audit_logs'
      )
      and (
        coalesce(with_check, '') = 'true'
        or coalesce(with_check, '') ilike '%true%' and policyname ilike '%debug%'
        or coalesce(with_check, '') ilike '%true%' and policyname ilike '%temp%'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname, pol.schemaname, pol.tablename
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Re-affirm secure write policies. These match 0002_rls.sql exactly and
--    are restated here so re-running this file alone is sufficient to bring
--    a database back into a known-good state.
-- ---------------------------------------------------------------------------

-- services: only the owning freelancer can insert / update / delete.
drop policy if exists services_insert_owner on public.services;
create policy services_insert_owner on public.services for insert
  with check (auth.uid() = freelancer_id);

drop policy if exists services_update_owner on public.services;
create policy services_update_owner on public.services for update
  using (auth.uid() = freelancer_id)
  with check (auth.uid() = freelancer_id);

-- orders: only the buying client can insert; both parties can update.
drop policy if exists orders_insert_client on public.orders;
create policy orders_insert_client on public.orders for insert
  with check (
    auth.uid() = client_id
    and client_id <> freelancer_id
  );

drop policy if exists orders_update_party on public.orders;
create policy orders_update_party on public.orders for update
  using (auth.uid() in (client_id, freelancer_id))
  with check (auth.uid() in (client_id, freelancer_id));

-- conversations: a participant must be the caller.
drop policy if exists conv_insert_party on public.conversations;
create policy conv_insert_party on public.conversations for insert
  with check (
    auth.uid() in (client_id, freelancer_id)
    and client_id <> freelancer_id
  );

-- messages: sender_id must match the caller AND the caller must be a
-- participant in the parent conversation.
drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.client_id, c.freelancer_id)
    )
  );

-- notifications & audit_logs & wallet_transactions: NO insert policy is
-- granted to clients. Writes happen only through SECURITY DEFINER triggers
-- below.

-- ---------------------------------------------------------------------------
-- 3. Make trigger writers SECURITY DEFINER so they bypass the (deliberately
--    locked-down) INSERT policies of audit_logs / notifications /
--    wallet_transactions.
-- ---------------------------------------------------------------------------

create or replace function public.notify_on_new_order()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body)
  values (new.freelancer_id, 'order.new', 'New order', 'You received a new order.');
  return new;
end;
$$;

create or replace function public.notify_on_order_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, body)
    values (new.client_id, 'order.status', 'Order updated',
            'Your order status changed to ' || new.status || '.');
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  _client uuid;
  _freelancer uuid;
  _recipient uuid;
begin
  select client_id, freelancer_id into _client, _freelancer
  from public.conversations where id = new.conversation_id;
  _recipient := case when new.sender_id = _client then _freelancer else _client end;
  insert into public.notifications (user_id, type, title, body)
  values (_recipient, 'message.new', 'New message', left(new.content, 80));
  return new;
end;
$$;

create or replace function public.notify_on_quote_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    if new.freelancer_id is not null then
      insert into public.notifications (user_id, type, title, body)
      values (new.freelancer_id, 'quote.new', 'New quote request', new.title);
    end if;
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.notifications (user_id, type, title, body)
    values (new.client_id, 'quote.status', 'Quote ' || new.status, new.title);
  end if;
  return new;
end;
$$;

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare _action text;
begin
  _action := lower(tg_op);
  insert into public.audit_logs (user_id, action, entity, entity_id)
  values (auth.uid(), _action, tg_table_name, coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

create or replace function public.record_order_earning()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    insert into public.wallet_transactions
      (freelancer_id, order_id, type, amount, status, description)
    values
      (new.freelancer_id, new.id, 'earning',
       coalesce(new.freelancer_earnings, round(new.total_price * 0.85, 2)),
       'available',
       'Order ' || new.id::text);
  end if;
  return new;
end;
$$;
