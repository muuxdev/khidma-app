-- ===========================================================================
-- 0010_client_orders_count.sql
--   Adds profiles.placed_orders_count, maintained by a SECURITY DEFINER
--   trigger on the orders table. Lets a freelancer see how many orders a
--   client has ever placed, even though `orders` RLS hides individual rows
--   from non-participants.
--   Mirrors the same protect-counts guard pattern from 0009.
-- ===========================================================================

alter table public.profiles
  add column if not exists placed_orders_count integer not null default 0;

-- Extend the protect-counts guard to also lock placed_orders_count. Replacing
-- the function preserves the trigger binding from 0009.
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
  new.placed_orders_count    := old.placed_orders_count;
  return new;
end;
$$;

create or replace function public.tg_placed_orders_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    perform set_config('app.bypass_count_guard', 'on', true);
    update public.profiles
       set placed_orders_count = placed_orders_count + 1
     where id = new.client_id;
    return new;
  elsif (tg_op = 'DELETE') then
    perform set_config('app.bypass_count_guard', 'on', true);
    update public.profiles
       set placed_orders_count = greatest(placed_orders_count - 1, 0)
     where id = old.client_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_orders_placed_count_ins on public.orders;
create trigger trg_orders_placed_count_ins
after insert on public.orders
for each row execute function public.tg_placed_orders_count();

drop trigger if exists trg_orders_placed_count_del on public.orders;
create trigger trg_orders_placed_count_del
after delete on public.orders
for each row execute function public.tg_placed_orders_count();

-- One-shot backfill for historical rows.
do $$
begin
  perform set_config('app.bypass_count_guard', 'on', true);
  update public.profiles p
     set placed_orders_count = coalesce(c.cnt, 0)
    from (
      select client_id, count(*)::int as cnt
        from public.orders
    group by client_id
    ) c
   where p.id = c.client_id;
end $$;
