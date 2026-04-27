-- =============================================================================
-- Khidma — initial schema (tables, indexes, triggers)
-- Apply in the Supabase SQL Editor in order: 0001_init, 0002_rls, 0003_storage.
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text unique,
  role        text not null check (role in ('client','freelancer')),
  avatar_url  text,
  bio         text,
  skills      jsonb not null default '[]'::jsonb,
  rating      numeric not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth.users record is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id                    uuid primary key default uuid_generate_v4(),
  freelancer_id         uuid not null references public.profiles(id) on delete cascade,
  title_ar              text not null,
  title_en              text not null,
  description_ar        text,
  description_en        text,
  category              text not null check (category in (
                          'shopify','salla','ads','seo','branding','photography','content'
                        )),
  slug                  text unique not null,
  status                text not null default 'draft' check (status in ('draft','published')),
  basic_price           numeric check (basic_price is null or basic_price > 0),
  standard_price        numeric check (standard_price is null or standard_price > 0),
  premium_price         numeric check (premium_price is null or premium_price > 0),
  basic_description     text,
  standard_description  text,
  premium_description   text,
  packages              jsonb not null default '[]'::jsonb,   -- preserves UI shape
  add_ons               jsonb not null default '[]'::jsonb,
  tags                  text[] not null default '{}',
  cover                 text,
  images                text[] not null default '{}',
  rating                numeric not null default 0,
  review_count          integer not null default 0,
  orders_in_queue       integer not null default 0,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_services_slug          on public.services (slug);
create index if not exists idx_services_freelancer_id on public.services (freelancer_id);
create index if not exists idx_services_status        on public.services (status) where deleted_at is null;
create index if not exists idx_services_category      on public.services (category) where deleted_at is null;

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- orders + commission trigger (15%)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid not null references public.profiles(id) on delete restrict,
  freelancer_id       uuid not null references public.profiles(id) on delete restrict,
  service_id          uuid references public.services(id) on delete set null,
  package_type        text not null check (package_type in ('basic','standard','premium','custom')),
  total_price         numeric not null check (total_price > 0),
  platform_fee        numeric,
  freelancer_earnings numeric,
  status              text not null default 'pending'
                      check (status in ('pending','active','delivered','completed','cancelled')),
  requirements        text,
  due_at              timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_no_self_order check (client_id <> freelancer_id)
);

create index if not exists idx_orders_client_id     on public.orders (client_id);
create index if not exists idx_orders_freelancer_id on public.orders (freelancer_id);
create index if not exists idx_orders_service_id    on public.orders (service_id);
create index if not exists idx_orders_status        on public.orders (status);

create or replace function public.set_order_commission()
returns trigger
language plpgsql
as $$
begin
  -- 15% platform fee, banker-safe rounding to 2 dp.
  new.platform_fee := round(new.total_price * 0.15, 2);
  new.freelancer_earnings := round(new.total_price - new.platform_fee, 2);
  return new;
end;
$$;

drop trigger if exists trg_orders_set_commission on public.orders;
create trigger trg_orders_set_commission
before insert or update of total_price on public.orders
for each row execute function public.set_order_commission();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- wallet_transactions  (no payouts; balance is computed)
-- ---------------------------------------------------------------------------
create table if not exists public.wallet_transactions (
  id            uuid primary key default uuid_generate_v4(),
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete set null,
  type          text not null check (type in ('earning','refund','adjustment')),
  amount        numeric not null,
  status        text not null default 'pending' check (status in ('pending','available','cancelled')),
  description   text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_wallet_freelancer on public.wallet_transactions (freelancer_id);

-- When an order moves to 'completed', record an available earning row.
create or replace function public.record_order_earning()
returns trigger
language plpgsql
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

drop trigger if exists trg_orders_record_earning on public.orders;
create trigger trg_orders_record_earning
after update of status on public.orders
for each row execute function public.record_order_earning();

-- ---------------------------------------------------------------------------
-- quote_requests (open brief OR against a service)
-- ---------------------------------------------------------------------------
create table if not exists public.quote_requests (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references public.profiles(id) on delete cascade,
  freelancer_id   uuid references public.profiles(id) on delete set null,
  service_id      uuid references public.services(id) on delete set null,
  title           text not null,
  description     text not null,
  budget          numeric check (budget is null or budget > 0),
  proposed_price  numeric check (proposed_price is null or proposed_price > 0),
  status          text not null default 'pending'
                  check (status in ('pending','responded','accepted','rejected','converted')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_quotes_client     on public.quote_requests (client_id);
create index if not exists idx_quotes_freelancer on public.quote_requests (freelancer_id);
create index if not exists idx_quotes_status     on public.quote_requests (status);

drop trigger if exists trg_quotes_updated_at on public.quote_requests;
create trigger trg_quotes_updated_at
before update on public.quote_requests
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id                uuid primary key default uuid_generate_v4(),
  order_id          uuid references public.orders(id) on delete set null,
  quote_request_id  uuid references public.quote_requests(id) on delete set null,
  client_id         uuid not null references public.profiles(id) on delete cascade,
  freelancer_id     uuid not null references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  constraint conversations_distinct_parties check (client_id <> freelancer_id)
);

create index if not exists idx_conv_pair  on public.conversations (client_id, freelancer_id);
create index if not exists idx_conv_order on public.conversations (order_id);

create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  content         text not null check (char_length(content) between 1 and 2000),
  type            text not null default 'text' check (type in ('text','file')),
  attachment_url  text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_messages_conv on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- notifications (with triggers)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, is_read, created_at desc);

create or replace function public.notify_on_new_order()
returns trigger language plpgsql as $$
begin
  insert into public.notifications (user_id, type, title, body)
  values (new.freelancer_id, 'order.new', 'New order', 'You received a new order.');
  return new;
end; $$;

drop trigger if exists trg_orders_notify_new on public.orders;
create trigger trg_orders_notify_new
after insert on public.orders
for each row execute function public.notify_on_new_order();

create or replace function public.notify_on_order_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, body)
    values (new.client_id, 'order.status', 'Order updated',
            'Your order status changed to ' || new.status || '.');
  end if;
  return new;
end; $$;

drop trigger if exists trg_orders_notify_status on public.orders;
create trigger trg_orders_notify_status
after update of status on public.orders
for each row execute function public.notify_on_order_status();

create or replace function public.notify_on_new_message()
returns trigger language plpgsql as $$
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
end; $$;

drop trigger if exists trg_messages_notify_new on public.messages;
create trigger trg_messages_notify_new
after insert on public.messages
for each row execute function public.notify_on_new_message();

create or replace function public.notify_on_quote_change()
returns trigger language plpgsql as $$
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
end; $$;

drop trigger if exists trg_quotes_notify on public.quote_requests;
create trigger trg_quotes_notify
after insert or update of status on public.quote_requests
for each row execute function public.notify_on_quote_change();

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_entity on public.audit_logs (entity, entity_id, created_at desc);
create index if not exists idx_audit_user   on public.audit_logs (user_id, created_at desc);

create or replace function public.audit_row()
returns trigger language plpgsql as $$
declare _action text;
begin
  _action := lower(tg_op);
  insert into public.audit_logs (user_id, action, entity, entity_id)
  values (auth.uid(), _action, tg_table_name, coalesce(new.id, old.id));
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_audit_services on public.services;
create trigger trg_audit_services
after insert or update or delete on public.services
for each row execute function public.audit_row();

drop trigger if exists trg_audit_orders on public.orders;
create trigger trg_audit_orders
after insert or update or delete on public.orders
for each row execute function public.audit_row();

drop trigger if exists trg_audit_quotes on public.quote_requests;
create trigger trg_audit_quotes
after insert or update or delete on public.quote_requests
for each row execute function public.audit_row();
