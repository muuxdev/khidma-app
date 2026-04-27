-- =============================================================================
-- Khidma — Row Level Security policies
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.services            enable row level security;
alter table public.orders              enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.quote_requests      enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.notifications       enable row level security;
alter table public.audit_logs          enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_all   on public.profiles;
drop policy if exists profiles_update_self  on public.profiles;
drop policy if exists profiles_insert_self  on public.profiles;
create policy profiles_select_all  on public.profiles for select using (true);
create policy profiles_update_self on public.profiles for update using (auth.uid() = id);
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
drop policy if exists services_select_public on public.services;
drop policy if exists services_select_owner  on public.services;
drop policy if exists services_insert_owner  on public.services;
drop policy if exists services_update_owner  on public.services;
drop policy if exists services_delete_owner  on public.services;

create policy services_select_public on public.services for select
  using (status = 'published' and deleted_at is null);
create policy services_select_owner  on public.services for select
  using (auth.uid() = freelancer_id);
create policy services_insert_owner  on public.services for insert
  with check (auth.uid() = freelancer_id);
create policy services_update_owner  on public.services for update
  using (auth.uid() = freelancer_id);
create policy services_delete_owner  on public.services for delete
  using (auth.uid() = freelancer_id);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
drop policy if exists orders_select_party on public.orders;
drop policy if exists orders_insert_client on public.orders;
drop policy if exists orders_update_party on public.orders;

create policy orders_select_party on public.orders for select
  using (auth.uid() in (client_id, freelancer_id));
create policy orders_insert_client on public.orders for insert
  with check (auth.uid() = client_id);
create policy orders_update_party on public.orders for update
  using (auth.uid() in (client_id, freelancer_id));

-- ---------------------------------------------------------------------------
-- wallet_transactions  (read-only to the freelancer; writes are trigger-only)
-- ---------------------------------------------------------------------------
drop policy if exists wallet_select_owner on public.wallet_transactions;
create policy wallet_select_owner on public.wallet_transactions for select
  using (auth.uid() = freelancer_id);

-- ---------------------------------------------------------------------------
-- quote_requests
-- ---------------------------------------------------------------------------
drop policy if exists quotes_select_party  on public.quote_requests;
drop policy if exists quotes_insert_client on public.quote_requests;
drop policy if exists quotes_update_party  on public.quote_requests;

create policy quotes_select_party on public.quote_requests for select
  using (
    auth.uid() = client_id
    or auth.uid() = freelancer_id
    or freelancer_id is null  -- open briefs visible to logged-in freelancers below
  );
create policy quotes_insert_client on public.quote_requests for insert
  with check (auth.uid() = client_id);
create policy quotes_update_party on public.quote_requests for update
  using (auth.uid() in (client_id, freelancer_id));

-- ---------------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------------
drop policy if exists conv_select_party on public.conversations;
drop policy if exists conv_insert_party on public.conversations;
create policy conv_select_party on public.conversations for select
  using (auth.uid() in (client_id, freelancer_id));
create policy conv_insert_party on public.conversations for insert
  with check (auth.uid() in (client_id, freelancer_id));

drop policy if exists messages_select_party on public.messages;
drop policy if exists messages_insert_sender on public.messages;
drop policy if exists messages_update_recipient on public.messages;

create policy messages_select_party on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.client_id, c.freelancer_id)
    )
  );

create policy messages_insert_sender on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.client_id, c.freelancer_id)
    )
  );

-- Recipients can flip is_read; senders cannot edit their messages.
create policy messages_update_recipient on public.messages for update
  using (
    auth.uid() <> sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.client_id, c.freelancer_id)
    )
  );

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
drop policy if exists notif_select_owner on public.notifications;
drop policy if exists notif_update_owner on public.notifications;
create policy notif_select_owner on public.notifications for select
  using (auth.uid() = user_id);
create policy notif_update_owner on public.notifications for update
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- audit_logs (read-only to the actor; writes are trigger-only)
-- ---------------------------------------------------------------------------
drop policy if exists audit_select_self on public.audit_logs;
create policy audit_select_self on public.audit_logs for select
  using (auth.uid() = user_id);
