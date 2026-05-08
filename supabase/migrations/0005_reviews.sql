-- =============================================================================
-- Khidma — Reviews & Ratings
-- One review per (order, reviewer). Both parties can review after completion.
-- A trigger keeps profiles.rating + profiles.review_count in sync, and mirrors
-- the freelancer's totals onto every service they own (the service card shows
-- the freelancer-level rating, by product spec).
-- =============================================================================

alter table public.profiles
  add column if not exists review_count integer not null default 0;

create table if not exists public.reviews (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  reviewer_id   uuid not null references public.profiles(id) on delete cascade,
  reviewee_id   uuid not null references public.profiles(id) on delete cascade,
  rating        integer not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  unique (order_id, reviewer_id),
  constraint reviews_no_self_review check (reviewer_id <> reviewee_id)
);

create index if not exists idx_reviews_reviewee on public.reviews (reviewee_id, created_at desc);
create index if not exists idx_reviews_order    on public.reviews (order_id);

-- ---------------------------------------------------------------------------
-- Recompute reviewee's rolled-up rating + review_count, then mirror to all of
-- their services. Called from a row trigger on reviews.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_reviewee_rating()
returns trigger
language plpgsql
as $$
declare
  _reviewee uuid := coalesce(new.reviewee_id, old.reviewee_id);
  _avg numeric;
  _cnt integer;
begin
  select coalesce(round(avg(rating)::numeric, 2), 0), count(*)
    into _avg, _cnt
  from public.reviews
  where reviewee_id = _reviewee;

  update public.profiles
     set rating = _avg,
         review_count = _cnt
   where id = _reviewee;

  -- The service card shows the freelancer's rating. Keep services in sync.
  update public.services
     set rating = _avg, review_count = _cnt
   where freelancer_id = _reviewee;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reviews_recompute on public.reviews;
create trigger trg_reviews_recompute
after insert or update or delete on public.reviews
for each row execute function public.recompute_reviewee_rating();

-- ---------------------------------------------------------------------------
-- RLS
-- Anyone can read; only the reviewer themself can insert, and only against an
-- order they belong to that has reached 'completed'. Reviews are immutable
-- (no update/delete policy) to keep the rolled-up rating trustworthy.
-- ---------------------------------------------------------------------------
alter table public.reviews enable row level security;

drop policy if exists reviews_select_all     on public.reviews;
drop policy if exists reviews_insert_party   on public.reviews;
create policy reviews_select_all on public.reviews for select using (true);
create policy reviews_insert_party on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and reviewer_id <> reviewee_id
    and exists (
      select 1 from public.orders o
       where o.id = order_id
         and o.status = 'completed'
         and auth.uid() in (o.client_id, o.freelancer_id)
         and reviewee_id in (o.client_id, o.freelancer_id)
    )
  );
