-- =============================================================================
-- Khidma — Presence (last_seen heartbeat)
-- Clients update their own profiles.last_seen on app foreground + every 60s.
-- "Online" is a derived UI concept: now() - last_seen < 5 minutes.
-- The existing profiles_update_self RLS policy already authorises the write.
-- =============================================================================

alter table public.profiles
  add column if not exists last_seen timestamptz;

create index if not exists idx_profiles_last_seen on public.profiles (last_seen);
