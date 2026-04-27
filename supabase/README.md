# Khidma — Supabase setup

This folder contains everything needed to provision a Khidma backend on
[Supabase](https://supabase.com). The mobile app keeps working in **mock fallback
mode** if the env vars are missing, so you can connect the backend at any time.

## 1. Create a project

1. Sign in to https://supabase.com and create a new project.
2. From **Project Settings → API**, copy:
   - `Project URL`
   - `anon` public key

## 2. Apply migrations (in order)

Open the **SQL Editor** in your Supabase project and run each file from this
folder, in order:

1. `migrations/0001_init.sql` — tables, indexes, triggers (commission, audit,
   notifications, auto-profile on signup).
2. `migrations/0002_rls.sql` — Row Level Security policies.
3. `migrations/0003_storage.sql` — `avatars`, `service-images`, `attachments`
   buckets and their policies.
4. `migrations/0004_security.sql` — drops any leftover debug `with check (true)`
   policies, re-affirms secure write rules, and marks every audit / notification
   / wallet trigger as `SECURITY DEFINER` so they can write without granting
   clients an INSERT policy on those tables. Re-run this file any time the
   policies have been edited by hand.

`seed.sql` is optional. Replace the placeholder UUIDs with real `auth.users`
IDs before running it.

## 3. Set the app env vars

Add the following two values to the Khidma artifact's environment (Replit
Secrets, with the `EXPO_PUBLIC_` prefix because Expo only exposes those to
the client bundle):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Restart the workflow. The yellow "Running in offline mode" banner at the top
of the app will disappear once both keys are detected.

## 4. Auth providers

Email/password is enabled by default. The auth signup trigger
(`on_auth_user_created`) automatically creates a row in `public.profiles` for
every new user, copying `full_name` and `role` from `raw_user_meta_data`.

## What is and isn't here

- **Implemented**: profiles, services (with soft-delete + status), orders with
  15% platform-fee trigger, wallet earnings auto-recorded on completion,
  quote requests (service-specific *and* open-brief), conversations, messages
  with realtime, notifications with per-event triggers, audit_logs.
- **Not implemented**: payouts, payment processing, KYC, admin dashboards.
  Withdraws stay client-only in the UI for now.

## Where the commission is computed

`set_order_commission()` in `0001_init.sql` runs on every insert/update of
`orders.total_price` and writes `platform_fee = round(total * 0.15, 2)` and
`freelancer_earnings = total - platform_fee`. The client never sets these.
