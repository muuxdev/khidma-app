# Khidma — Freelance Marketplace for E-commerce

A mobile freelance marketplace MVP connecting Saudi/Gulf merchants with experts in Shopify, Salla, paid ads, SEO, branding, photography, and content.

## Stack
- Expo Router (TypeScript) with file-based routing
- Supabase backend (Postgres + Auth + Realtime + Storage) with mock-data fallback
- Bilingual EN/AR with conditional RTL (no I18nManager.forceRTL — instant toggle)
- Light & dark mode (system / light / dark)
- React Query, Inter fonts, Feather icons, expo-linear-gradient

## Backend
- Schema in `supabase/migrations/`: `0001_init.sql` (tables, triggers, 15% commission, audit, notifications), `0002_rls.sql` (RLS), `0003_storage.sql` (avatar/service/attachment buckets).
- Setup guide in `supabase/README.md`. Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Without env vars, the app boots in **mock fallback mode** and shows a dismissible banner.
- API surface in `artifacts/khidma/lib/api/{auth,profiles,services,orders,quotes,chat,notifications,wallet}.ts` — UI never imports `@supabase/supabase-js` directly.
- Schema↔UI translation isolated in `lib/api/mappers.ts`. Order status maps `in_progress↔active` and `review↔delivered`.
- Validation schemas (zod) in `lib/validation/`.
- 15% platform fee is computed in a Postgres trigger on `orders` — never trusted from the client.
- Quote requests support service-specific OR open-brief flows; backend-only (no UI yet).
- Withdraw flow stays client-side by design (no payout backend).

## Structure
- `app/_layout.tsx` — root with App / Auth / Data providers + Stack registry
- `app/index.tsx` — splash router (onboarding vs tabs)
- `app/onboarding.tsx` — branded splash + role selection
- `app/(auth)/login.tsx` + `signup.tsx` — local mock auth
- `app/(tabs)/{index,orders,chat,profile}.tsx` — bottom tabs
- `app/service/[id].tsx` — service detail + 3-tier package picker + checkout
- `app/order/[id].tsx` — order tracking with progress steps
- `app/chat/[id].tsx` — chat thread with auto-reply
- `app/dashboard.tsx` — freelancer earnings + weekly chart
- `app/wallet.tsx` — balance + withdraw + transactions
- `app/settings.tsx` — language + theme prefs

## Contexts
- `AppContext` — locale + theme preference, persisted
- `AuthContext` — mock signup/login/guest with role
- `DataContext` — services / orders / chats / wallet, persisted

## Brand
Purple `#5B3EFF` → Blue `#2F6BFF` gradient with mint, orange, pink accents.
