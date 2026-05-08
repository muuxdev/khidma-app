-- ===========================================================================
-- 0008_help_and_profile.sql
--
-- Profile additions for the Edit Profile screen + a support_tickets table
-- backing the Help screen's contact form. RLS scopes both reads and writes
-- to the authenticated owner.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Profiles: extra discoverable fields. (bio, avatar_url, skills already exist
-- in 0001_init.sql.)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists tags                text[] not null default '{}',
  add column if not exists keywords            text[] not null default '{}',
  add column if not exists years_of_experience integer;

create index if not exists idx_profiles_tags
  on public.profiles using gin (tags);
create index if not exists idx_profiles_keywords
  on public.profiles using gin (keywords);

-- ---------------------------------------------------------------------------
-- Support tickets backing the Help screen's contact form.
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  subject     text not null check (length(btrim(subject))  between 1 and 200),
  message     text not null check (length(btrim(message))  between 1 and 4000),
  status      text not null default 'open'
              check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_support_user
  on public.support_tickets (user_id, created_at desc);

drop trigger if exists trg_support_updated_at on public.support_tickets;
create trigger trg_support_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists support_select_owner on public.support_tickets;
drop policy if exists support_insert_owner on public.support_tickets;
drop policy if exists support_update_owner on public.support_tickets;

-- Users see only their own tickets.
create policy support_select_owner on public.support_tickets for select
  using (auth.uid() = user_id);

-- Users may file a ticket as themselves only.
create policy support_insert_owner on public.support_tickets for insert
  with check (auth.uid() = user_id);

-- Owners may edit their own ticket (e.g. close it). Status moderation is
-- expected to happen via service-role from a back office.
create policy support_update_owner on public.support_tickets for update
  using (auth.uid() = user_id);
