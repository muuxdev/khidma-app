-- ===========================================================================
-- 0009_follows.sql
--
-- Followers system:
--   * `follows` table  (follower → freelancer, no self-follow, no duplicates)
--   * `profiles.followers_count` denormalised counter, kept in sync by trigger
--   * Notifications fan-out to followers when a freelancer (re)publishes a
--     service. Uses SECURITY DEFINER to bypass the locked-down INSERT policy
--     on `notifications` (see 0004_security.sql).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- profiles.followers_count + profiles.completed_orders_count
-- Both are denormalised counters maintained exclusively by SECURITY DEFINER
-- triggers below. A guard trigger prevents end-users from tampering with the
-- columns through the broad `profiles_update_self` RLS policy.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists followers_count        integer not null default 0,
  add column if not exists completed_orders_count integer not null default 0;

-- Guard trigger: a regular UPDATE coming from the client must not change
-- followers_count or completed_orders_count. The trigger below restores the
-- previous value unless the caller has flipped a per-transaction GUC, which
-- only our SECURITY DEFINER counter triggers do.
create or replace function public.tg_profiles_protect_counts()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.bypass_count_guard', true), '') = 'on' then
    return new;
  end if;
  new.followers_count        := old.followers_count;
  new.completed_orders_count := old.completed_orders_count;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_counts on public.profiles;
create trigger trg_profiles_protect_counts
before update on public.profiles
for each row execute function public.tg_profiles_protect_counts();

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  follower_id   uuid not null references public.profiles(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, freelancer_id),
  check (follower_id <> freelancer_id)
);

create index if not exists idx_follows_freelancer
  on public.follows (freelancer_id, created_at desc);
create index if not exists idx_follows_follower
  on public.follows (follower_id, created_at desc);

alter table public.follows enable row level security;

drop policy if exists follows_select_any     on public.follows;
drop policy if exists follows_insert_self    on public.follows;
drop policy if exists follows_delete_self    on public.follows;

-- Anyone signed in may read the social graph (needed to render Follow state
-- + follower counts on public profiles).
create policy follows_select_any on public.follows for select
  using (auth.role() = 'authenticated');

-- A user may only follow / unfollow as themselves.
create policy follows_insert_self on public.follows for insert
  with check (auth.uid() = follower_id);
create policy follows_delete_self on public.follows for delete
  using (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- Maintain profiles.followers_count from follows insert/delete.
-- SECURITY DEFINER so the increment happens regardless of the actor's
-- profiles UPDATE policy (which restricts updates to the owner).
-- ---------------------------------------------------------------------------
create or replace function public.tg_follows_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Lift the protect-counts guard for this transaction so our update on
  -- profiles.followers_count succeeds. set_config(..., true) is local to
  -- the current transaction and is reset automatically on commit/rollback.
  perform set_config('app.bypass_count_guard', 'on', true);
  if (tg_op = 'INSERT') then
    update public.profiles
       set followers_count = followers_count + 1
     where id = new.freelancer_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.profiles
       set followers_count = greatest(followers_count - 1, 0)
     where id = old.freelancer_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_follows_count_ins on public.follows;
create trigger trg_follows_count_ins
after insert on public.follows
for each row execute function public.tg_follows_count();

drop trigger if exists trg_follows_count_del on public.follows;
create trigger trg_follows_count_del
after delete on public.follows
for each row execute function public.tg_follows_count();

-- ---------------------------------------------------------------------------
-- Notify followers when a freelancer (re)publishes a service.
-- Fires when a service first becomes 'published' — either inserted as such,
-- or transitions from any other status to 'published'. Avoids duplicate
-- notifications on subsequent edits while the service stays published.
-- ---------------------------------------------------------------------------
create or replace function public.notify_followers_on_publish()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  _newly_published boolean;
  _freelancer_name text;
  _title text;
begin
  _newly_published := new.status = 'published'
                      and (tg_op = 'INSERT' or old.status is distinct from 'published');
  if not _newly_published then
    return new;
  end if;

  select coalesce(full_name, 'A freelancer you follow')
    into _freelancer_name
    from public.profiles
   where id = new.freelancer_id;

  _title := coalesce(new.title_en, new.title_ar, 'New service');

  insert into public.notifications (user_id, type, title, body)
  select f.follower_id,
         'service.new',
         _freelancer_name || ' published a new service',
         _title
    from public.follows f
   where f.freelancer_id = new.freelancer_id;

  return new;
end;
$$;

drop trigger if exists trg_services_notify_followers on public.services;
create trigger trg_services_notify_followers
after insert or update of status on public.services
for each row execute function public.notify_followers_on_publish();

-- ---------------------------------------------------------------------------
-- Maintain profiles.completed_orders_count off the orders table.
-- Public profiles need a true total of delivered projects, but `orders` RLS
-- only exposes rows the viewer participated in. A trigger-maintained counter
-- on the publicly readable profiles table is the simplest safe path.
-- ---------------------------------------------------------------------------
create or replace function public.tg_completed_orders_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'UPDATE') then
    if new.status = 'completed' and old.status is distinct from 'completed' then
      perform set_config('app.bypass_count_guard', 'on', true);
      update public.profiles
         set completed_orders_count = completed_orders_count + 1
       where id = new.freelancer_id;
    elsif old.status = 'completed' and new.status is distinct from 'completed' then
      perform set_config('app.bypass_count_guard', 'on', true);
      update public.profiles
         set completed_orders_count = greatest(completed_orders_count - 1, 0)
       where id = new.freelancer_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_completed_count on public.orders;
create trigger trg_orders_completed_count
after update of status on public.orders
for each row execute function public.tg_completed_orders_count();

-- Backfill historical values once so existing rows don't show zero.
do $$
begin
  perform set_config('app.bypass_count_guard', 'on', true);
  update public.profiles p
     set completed_orders_count = coalesce(c.cnt, 0)
    from (
      select freelancer_id, count(*)::int as cnt
        from public.orders
       where status = 'completed'
    group by freelancer_id
    ) c
   where p.id = c.freelancer_id;
  perform set_config('app.bypass_count_guard', 'on', true);
  update public.profiles p
     set followers_count = coalesce(f.cnt, 0)
    from (
      select freelancer_id, count(*)::int as cnt
        from public.follows
    group by freelancer_id
    ) f
   where p.id = f.freelancer_id;
end $$;
