# Khidma — Supabase Integration: Phase 1 Audit & Phase 2 Plan

> Phase 1 deliverable. **No application code has been changed.** Only operational
> setup was performed: dependencies installed, the existing `Khidma` workflow
> wired to the dev script already declared in `artifacts/khidma/.replit-artifact/artifact.toml`.

---

## 1. Phase 1 — Audit findings

### 1.1 Stack & framework

| Concern | Finding |
| --- | --- |
| Framework | **Expo Router 6.0.17** (file-based routing) |
| Runtime | React Native 0.81.5 + `react-native-web` 0.21 (web preview) |
| React | 19.1.0 (workspace catalog-pinned, required by Expo) |
| Language | TypeScript 5.9 |
| Monorepo | pnpm workspaces (`artifacts/*`, `lib/*`, `lib/integrations/*`, `scripts`) |
| Khidma package | `@workspace/khidma` at `artifacts/khidma/` |
| Sibling artifacts | `@workspace/api-server` (Express skeleton, not used by Khidma yet), `@workspace/mockup-sandbox` (canvas previewer) |
| Shared libs already wired in | `@workspace/api-client-react` (orval-generated skeleton), `@workspace/api-zod`, `@workspace/api-spec` (OpenAPI skeleton at `lib/api-spec/openapi.yaml`), `@workspace/db` (Drizzle/Postgres skeleton) — **none of these are referenced by Khidma screens today** |
| Data fetching lib | `@tanstack/react-query@5.90` is installed and a `QueryClientProvider` already wraps the tree in `app/_layout.tsx`, but no `useQuery` calls exist yet |
| Existing build/serve scripts | `pnpm --filter @workspace/khidma run {dev,build,serve,typecheck}` already defined |

### 1.2 Routing map (file-based, 19 screens)

```
app/_layout.tsx                  Stack root + 4 providers
app/index.tsx                    Splash router (-> onboarding or tabs)
app/onboarding.tsx               Branded splash + role picker
app/(auth)/_layout.tsx
app/(auth)/login.tsx
app/(auth)/signup.tsx
app/(tabs)/_layout.tsx           Bottom tabs (role-aware)
app/(tabs)/index.tsx             Home / explore
app/(tabs)/orders.tsx
app/(tabs)/chat.tsx
app/(tabs)/profile.tsx
app/service/[id].tsx             Service detail + 3-tier picker + checkout
app/service-edit/[id].tsx        Freelancer service create/edit (953 lines)
app/order/[id].tsx               Order tracking
app/chat/[id].tsx                Conversation thread
app/dashboard.tsx                Freelancer earnings + chart
app/wallet.tsx                   Balance + transactions + withdraw modal
app/settings.tsx                 Locale + theme prefs
app/+not-found.tsx
```

### 1.3 State management

Three React Context providers, all in `app/_layout.tsx`:

| Provider | Shape | Persistence |
| --- | --- | --- |
| `AppProvider` (`contexts/AppContext.tsx`) | `locale` (`en`/`ar`), `isRtl`, `themePreference` (`light`/`dark`/`system`), `isDark`, `t(key)`, `dir` | AsyncStorage keys `khidma:locale`, `khidma:theme` |
| `AuthProvider` (`contexts/AuthContext.tsx`) | `user: User | null`, `ready`, `login`, `signup`, `setRole`, `logout`, `guestMode`, `updateUser` | AsyncStorage `khidma:user` |
| `DataProvider` (`contexts/DataContext.tsx`) | `services`, `orders`, `chats`, `messagesByThread`, `transactions`, `walletBalance`, `createOrder`, `updateOrderStatus`, `sendMessage`, `withdraw`, `ensureThread`, `upsertService`, `deleteService`, `setServiceStatus`, `getServiceById` | AsyncStorage `khidma:orders|chats|messages|wallet|services` |

**Important:** `useData` / `useAuth` / `useApp` are imported in **24 files** across `app/` and `components/`. The signatures are the integration contract — any backend-backed implementation must keep them stable, or every consumer needs touching.

### 1.4 Current data layer

- **All data is mock + AsyncStorage**, no backend.
- Mock fixtures in `lib/mockData.ts`: `mockServices`, `mockOrders`, `mockChats`, `mockMessages`, `mockTransactions`.
- `lib/storage.ts` exposes `getJson`, `setJson`, `removeKey`, `genId`, `StorageKeys`.
- The "user services" the freelancer creates are merged in front of the seeded system services in `DataContext` (`[...userServices, ...seededSystemServices]`).
- @tanstack/react-query is **idle**; nothing currently uses it.

### 1.5 Existing auth flow

- `signup(name, email, password, role)` → builds a `User` object, persists to AsyncStorage. **Password ignored.** No duplicate-email check.
- `login(email, password)` → if a stored user has the same email, return it; otherwise mint a new client user. **Password ignored.**
- `guestMode(role)` → instant guest user.
- `logout()` → clears the stored user.
- Roles: `"freelancer" | "client"`. The role is taken at signup or via `setRole`.

### 1.6 Existing types vs the Supabase schema brief — **gaps & mismatches to flag**

| Brief table | Existing type | Mismatches that affect work |
| --- | --- | --- |
| `profiles` | `User` (`id, name, email, role, avatar?, bio?, rating?, completedJobs?, walletBalance?, joinedAt`) | Brief uses `full_name`. Easy mapper. `walletBalance`/`completedJobs`/`rating` should be **derived** server-side, but the UI reads them on `user`. Mapping layer needed. |
| `services` | `Service` (rich: nested `packages: ServicePackage[]` with `name/price/deliveryDays/revisions/features[]`, `addOns?`, `tags`, `cover` (category enum, not URL), `rating`, `reviewCount`, `ordersInQueue`) | Brief flattens packages to `basic_price/standard_price/premium_price` + `basic/standard/premium_description` only. **The current UI displays `name`, `deliveryDays`, `revisions`, `features[]` per package.** To preserve UI behaviour we must store the rich packages too — recommendation: keep brief's flat columns (so SQL queries are straightforward) **and** add a `packages jsonb` column for the parts the UI already shows. Ditto `add_ons jsonb`, `tags text[]`. |
| `orders` | `Order` (`packageTier`, `price`, `progress`, `dueAt`, `notes?`, `status: pending|in_progress|review|completed|cancelled`) | Brief renames `price → total_price`, adds `platform_fee`, `freelancer_earnings`, `requirements`, `status: pending|active|delivered|completed|cancelled`. **`in_progress` ↔ `active`** and **`review` ↔ `delivered`** need a translation map; also UI's `progress` percentage needs to live somewhere — recommendation: derive from status in the UI, or add a `progress` column. |
| `wallet_transactions` | `Transaction` (`type: earning|withdrawal|deposit|refund`) | Brief allows only `earning|refund|adjustment` (no `withdrawal` because payouts are out of scope). Map UI's `withdrawal/deposit` to `adjustment` for now, **OR** keep the local withdraw button purely cosmetic and skip writing those rows to the server. Per your direction, we'll keep withdraw client-only for now. |
| `quote_requests` | **Not present in UI** | There is no quote request screen, button, or context method. To honour "do not add new UI features", we will create the table + API + RLS but **defer the UI** as a follow-up task. |
| `conversations` | **Not present** | `ChatThread` is just `(participantId, lastMessage…)` — no link to an order or quote. We will add `conversations` server-side and expose the same `ChatThread`-shaped view to the UI. |
| `messages` | `Message` (`threadId, senderId, text, createdAt`) | Brief adds `type (text|file)`, `attachment_url`, `is_read`. UI has no file/attachment picker today; we'll keep `type='text'` only for now. |
| `notifications` | **Not present in UI** | Add table + triggers, expose via API; **no in-app notification UI exists**, so we only seed the data plumbing. |
| `audit_logs` | **Not present** | Pure backend. |

### 1.7 Bilingual / RTL / dark mode

- All three are first-class in `AppContext`. Every screen reads `useApp()` → `t(key)`, `dir`, `isRtl`, `isDark`, then composes styles via `useColors()`.
- Locale toggle is **instant** (no `I18nManager.forceRTL`, per `replit.md`).
- No risk to these from the planned work — none of the planned files touch styling or i18n.

### 1.8 Operational state

- Workflow `Khidma` is configured and running:
  `PORT=24501 BASE_PATH=/ pnpm --filter @workspace/khidma run dev`
- Metro bundler started, Expo web is reachable on port 24501 (the artifact's declared port).
- Artifact registry is empty (`listArtifacts() === []`), so the workspace preview-pane dropdown won't show "Khidma Mobile" yet. We will need to register it via `createArtifact`/the artifact manager **without** rebuilding it (the source already exists). I will handle that as the very first step of phase 2.

---

## 2. Phase 2 — Implementation plan (minimal, safe, additive)

**Guiding rules I will follow** (your instructions):

- No UI redesign. No screen removal. No mass refactor.
- Keep AR/EN bilingual + RTL + dark mode + animations.
- Preserve current `useAuth`/`useData`/`useApp` signatures so the 24 consumers don't change.
- Replace the **internals** of `AuthContext` and `DataContext` with thin Supabase-backed implementations behind feature detection. If `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` are missing, fall back to today's mock+AsyncStorage behaviour and surface a single warning banner.
- Commission lives **only** in the database trigger (15 %), never the client.
- Quote requests, notifications, audit logs: backend only for now (no UI).
- Withdraw button stays client-only (per "no payout flow yet").

### 2.1 Where the user adds Supabase credentials

You'll add **two secrets** in the Replit Secrets tab (the Tools → Secrets pane). I will surface this as a banner inside the app when they're missing:

```
EXPO_PUBLIC_SUPABASE_URL   = https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOi…
```

(Expo SDK 49+ requires the `EXPO_PUBLIC_` prefix to expose env vars to the client bundle.)

### 2.2 New files to add

Path is relative to `artifacts/khidma/`.

| New file | Purpose |
| --- | --- |
| `lib/supabase/client.ts` | Centralised `getSupabase()` singleton (uses AsyncStorage as auth-storage adapter, includes `react-native-url-polyfill/auto` for Hermes). Returns `null` if env missing. |
| `lib/supabase/config.ts` | `isSupabaseConfigured()`, `getMissingEnvKeys()`, friendly enum for error codes (`AUTH_INVALID_CREDENTIALS`, `SUPABASE_NOT_CONFIGURED`, …). |
| `lib/supabase/errors.ts` | Standardised error mapping + `friendlyMessage(error, locale)`. |
| `lib/api/auth.ts` | `signUp`, `signIn`, `signOut`, `getSession`, `getCurrentProfile`. |
| `lib/api/profiles.ts` | `getProfile`, `updateProfile`, `uploadAvatar`. |
| `lib/api/services.ts` | `listPublishedServices`, `getServiceById`, `createService`, `updateService`, `publishService`, `softDeleteService`, `searchServices`. |
| `lib/api/orders.ts` | `createOrder`, `getMyOrders`, `updateOrderStatus`. |
| `lib/api/quotes.ts` | `createQuoteRequest`, `respondToQuote`, `convertQuoteToOrder` (no UI consumer yet). |
| `lib/api/chat.ts` | `getConversations`, `getMessagesPaginated`, `sendMessage`, `markMessagesAsRead`, `subscribeToMessages`. |
| `lib/api/notifications.ts` | `getNotifications`, `markAsRead`, `subscribeToNotifications`. |
| `lib/api/wallet.ts` | `getWalletTransactions`, `getComputedBalance`. |
| `lib/api/index.ts` | Barrel + `mapDbServiceToUiService`, `mapUiOrderStatusToDb` translation helpers (so existing UI types stay unchanged). |
| `lib/validation/auth.ts` | Zod schemas (email, password ≥ 8, role enum). |
| `lib/validation/service.ts` | Zod schemas for service create/update. |
| `lib/validation/order.ts`, `lib/validation/message.ts` | Same. |
| `components/SupabaseStatusBanner.tsx` | One-time dismissible banner shown when env vars are missing — uses existing `useColors()` + `t()` keys. |
| `supabase/migrations/0001_init.sql` | Tables + indexes + check constraints + `updated_at` trigger + `set_order_commission()` BEFORE INSERT trigger. |
| `supabase/migrations/0002_rls.sql` | RLS policies for every table (per brief's per-table rules). |
| `supabase/migrations/0003_storage.sql` | Bucket policies for `avatars` (public), `service-images` (public), `attachments` (private + signed URLs). |
| `supabase/seed.sql` | Optional: seeds the same demo categories/services so the app isn't empty for a brand-new project. |
| `supabase/README.md` | Step-by-step "create project → paste URL/key → run migrations → done". |

### 2.3 Existing files to modify (surgical edits only)

| File | Change |
| --- | --- |
| `artifacts/khidma/contexts/AuthContext.tsx` | Replace internals: read session via `lib/api/auth`, listen to `onAuthStateChange`, expose **the same** `login/signup/logout/setRole/guestMode/updateUser` shape. If Supabase not configured, fall back to current mock path. |
| `artifacts/khidma/contexts/DataContext.tsx` | Replace internals of `services`, `orders`, `messagesByThread`, `chats`, `transactions`, `walletBalance` with React Query–backed reads from `lib/api/*`. Mutations (`createOrder`, `upsertService`, etc.) call the API. **Public method signatures unchanged.** Mock fallback retained when Supabase is missing. |
| `artifacts/khidma/app/_layout.tsx` | Mount `<SupabaseStatusBanner />` once near the root (above the Stack). One-line addition. |
| `artifacts/khidma/lib/i18n.ts` | Add ~6 string keys: `supabaseMissingTitle`, `supabaseMissingBody`, `errAuthInvalid`, `errAuthEmailExists`, `errOrderOwnService`, `errUnauthorized`. AR + EN. |
| `artifacts/khidma/package.json` | Add `@supabase/supabase-js` and `react-native-url-polyfill`. (Will be installed by the existing `pnpm install` flow.) |
| `artifacts/khidma/lib/types.ts` | **Untouched.** Mapping layer in `lib/api/index.ts` keeps DB shape out of UI. |
| `artifacts/khidma/lib/mockData.ts` | **Untouched** — kept as fallback fixtures. |

### 2.4 Database schema decisions (summary, full SQL in 0001_init.sql)

- `profiles(id, full_name, email, role, avatar_url, bio, skills jsonb, rating numeric default 0, created_at, updated_at)` + trigger creating one row on `auth.users` insert (`handle_new_user()`).
- `services` follows the brief, **plus** `packages jsonb`, `add_ons jsonb`, `tags text[]`, and `category` constrained to `('shopify','salla','ads','seo','branding','photography','content')` to match the existing UI enum.
- `orders` per brief; `set_order_commission()` BEFORE INSERT trigger sets `platform_fee = round(total_price * 0.15, 2)` and `freelancer_earnings = total_price - platform_fee`. UI's `in_progress`/`review` translate to `active`/`delivered` in the API mapper.
- `wallet_transactions` written automatically when an order's status moves to `completed` (trigger), `type='earning'`, `status='available'`. Withdrawals stay client-side for now.
- `quote_requests` per brief; `service_id` nullable so an "open brief" works.
- `conversations` + `messages` per brief. RLS restricts both reads and writes to the two participants.
- `notifications` + `audit_logs` per brief.
- All tables: RLS enabled, indexes per brief, `updated_at` trigger.
- Storage buckets: `avatars` (public, 2 MB cap, image/* only), `service-images` (public, 5 MB cap, image/*), `attachments` (private, signed URLs).

### 2.5 Verification checklist (will be executed in phase 3 after you supply the keys)

1. App boots with Supabase env **missing** → banner visible, mock data still works.
2. App boots with env **present** → banner hidden, real data flows.
3. Sign up as client + sign up as freelancer → two `auth.users` + two `profiles`.
4. Freelancer creates a draft service → row in `services` with `status='draft'`, invisible to clients.
5. Freelancer publishes → client sees it in (tabs)/index.
6. Client orders the standard tier → `orders` row, trigger sets `platform_fee` and `freelancer_earnings`; client cannot order their own service (RLS).
7. Order completes → `wallet_transactions` row of type `earning` appears in freelancer wallet; computed balance updates.
8. Quote request (open brief and against a service) inserts cleanly via API call (no UI yet).
9. Chat: send message from client → freelancer realtime channel receives it; both can read, no third party can.
10. Hard reload on a different browser/device → same data appears (no longer device-local).
11. Bilingual EN/AR + RTL + dark mode unchanged on every screen we touch.

I'll capture screenshots for steps 1, 4, 5, 6, 7, 9 once the keys are in.

### 2.6 Things explicitly **not** in scope for phase 2

- Quote request UI screen — table + API only, UI follow-up.
- Notification UI / bell — table + API only.
- Freelancer payout request flow — per your direction.
- Refactor of `lib/api-spec` orval/openapi pipeline — Khidma will use the Supabase JS SDK directly through the new `lib/api/*` modules; the existing OpenAPI scaffold stays in place but unused by Khidma.
- Server-side rate limiting — will document the limitation; client-side throttle on login + send-message only.

### 2.7 Rough order of work in phase 2

1. Add Supabase deps + `lib/supabase/*`, banner, env detection. Verify nothing breaks with empty env. **Smallest possible PR.**
2. Add SQL migration files + `supabase/README.md`. (No app behaviour change yet.)
3. Add `lib/api/auth.ts` + swap `AuthContext` internals (with mock fallback). Verify signup/login on a test Supabase project.
4. Add `lib/api/services.ts` + swap services portion of `DataContext`. Verify draft/publish + client visibility.
5. Add `lib/api/orders.ts` + swap orders portion. Verify commission trigger + own-service block.
6. Add `lib/api/chat.ts` + realtime subscription in `DataContext`. Verify cross-device.
7. Add `lib/api/quotes.ts` + `lib/api/notifications.ts` + `lib/api/wallet.ts` (no UI changes).
8. Final verification pass + screenshots.

---

## 3. What I need from you to start phase 2

1. **Confirm the plan above** (or tell me what to drop/swap).
2. **Two secrets in Replit Secrets** — `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. If you don't have a Supabase project yet, create a free one at supabase.com (it takes ~2 minutes), then copy the values from *Project settings → API*. The app will still run with them missing — it'll just keep using mocks and show the warning banner.
3. **Confirm the order-status mapping** (`in_progress↔active`, `review↔delivered`) is OK with you, or pick one set of names. (UI keeps its own enum either way; mapping is in one place.)
