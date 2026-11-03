# EcoFix — Repair. Reuse. Revalue.

A multi-platform repair marketplace connecting consumers with verified technicians. One Supabase backend powers both the **Next.js web app** and the **Android (Kotlin/Compose) app**, sharing a single database, auth system, and real-time sync layer.

---

## Repository Structure

```
ecofix/
├── supabase/               # Supabase CLI project
│   ├── migrations/         # SQL migrations (schema, RLS, triggers)
│   ├── functions/          # Edge Functions (payments, notifications, AI diagnosis)
│   └── seed.sql            # Demo data
├── web/                    # Next.js 14 App Router web app
│   ├── app/                # Route groups: (auth), (customer), (provider), (admin)
│   ├── components/         # Shared UI components
│   ├── lib/supabase/       # Typed Supabase client (client + server + middleware)
│   └── types/              # Generated DB types (supabase gen types typescript)
└── android/                # Kotlin / Jetpack Compose Android app
    └── app/src/main/
        ├── data/           # Supabase SDK calls + Room local cache
        ├── domain/         # Use-cases + domain models
        └── ui/             # Compose screens
```

---

## Sync Architecture

Both the web and Android clients connect to the **same Supabase project** — no per-platform backend, no sync jobs, no data duplication.

### How real-time sync works

1. **Single schema, single API.** Every table is accessed through the same PostgREST REST API and the same Supabase Realtime WebSocket endpoint. A row written by the Android app is immediately visible to the web app and vice versa.

2. **Realtime channels per booking.** Both clients subscribe to `postgres_changes` on the `repair_status_log` table, filtered by `booking_id`. When a technician updates a job status from their Android device, the customer's web tracking page reflects the change within milliseconds — no polling, no refresh.

3. **Immutable audit trail via Postgres trigger.** Every write to `bookings.status` automatically inserts a row into `repair_status_log` through a server-side trigger (`trg_log_booking_status`). Neither client can bypass this — the log is always consistent regardless of which platform initiates the update.

4. **Optimistic UI + server reconciliation.** Clients update local state immediately on user action for responsiveness. The next Realtime event from Postgres reconciles the authoritative state.

5. **Offline support (Android).** Active bookings and recent status log rows are cached locally in a Room database. Writes are queued and flushed via WorkManager when connectivity restores, using `updated_at` for conflict resolution (last-write-wins is safe given the linear status flow).

6. **One auth system.** Supabase Auth issues JWTs consumed identically by Next.js (via `@supabase/ssr` cookie-based sessions) and Android (via `supabase-kt`). A user who registers on the web logs into the same account on Android with no separate identity.

7. **One notification pipeline.** An Edge Function triggered on `repair_status_log` INSERT writes to the `notifications` table and fans out to FCM (Android) and Web Push simultaneously. No client sends notifications independently.

### Row-Level Security

RLS is enforced at the Postgres layer — not in application code — so both clients inherit identical access rules automatically:

| Role | Access |
|------|--------|
| Customer | SELECT/INSERT/UPDATE only their own rows (`customer_id = auth.uid()`) |
| Technician/Provider | SELECT/UPDATE only jobs assigned to them (`provider_id` matches their profile) |
| Admin | Full access via service role key (Edge Functions only, never exposed to clients) |

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- A Supabase project at [supabase.com](https://supabase.com) (free tier works)
- Android Studio (for Android development)

### 1. Apply the database schema

```bash
# Log in to Supabase CLI
supabase login

# Link to your project (get the ref from your Supabase dashboard URL)
supabase link --project-ref <your-project-ref>

# Push all migrations (schema + RLS + triggers)
supabase db push

# Seed demo data
supabase db seed
```

### 2. Generate TypeScript types (web)

```bash
supabase gen types typescript --linked > web/types/database.ts
```

### 3. Run the web app

```bash
cd web
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from your Supabase dashboard
npm install
npm run dev
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy notify-status-change
supabase functions deploy payment-webhook
supabase functions deploy ai-diagnosis

# Set secrets
supabase secrets set RAZORPAY_KEY_SECRET=<your_key>
supabase secrets set FCM_SERVER_KEY=<your_fcm_key>
supabase secrets set AI_DIAGNOSIS_URL=<your_model_endpoint>  # optional, mock used if absent
```

### 5. Configure Android

```bash
cd android
cp local.properties.example local.properties
# Fill in supabase.url, supabase.anonKey, razorpay.keyId, mapsApiKey
```

Open `android/` in Android Studio, sync Gradle, run on emulator or device (API 26+).

---

## Feature Phases

| Phase | Feature | Platforms |
|-------|---------|-----------|
| 1 | Auth & Roles (email, Google) | Web + Android |
| 2 | Product & Issue Intake (photos, AI diagnosis) | Web + Android |
| 3 | Provider Discovery & Comparison (location, rating) | Web + Android |
| 4 | Booking (service type, scheduling) | Web + Android |
| 5 | Diagnosis & Quotation (technician submits, customer approves) | Web + Android |
| 6 | Live Repair Tracking (Realtime timeline) | Web + Android |
| 7 | Payment & Warranty (Razorpay + Edge Function) | Web + Android |
| 8 | Ratings & Repair History | Web + Android |
| 9 | Provider Dashboard (job queue, earnings) | Web + Android |
| 10 | Admin Panel (verification, categories, disputes) | Web only |

---

## Environment Variables

### Web (`web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — server-side only, never client |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay publishable key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret — server-side only |
| `AI_DIAGNOSIS_URL` | URL of the MobileNetV2 diagnosis endpoint |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps JS API key |

### Android (`android/local.properties`)

| Property | Description |
|----------|-------------|
| `supabase.url` | Same Supabase project URL |
| `supabase.anonKey` | Same anon key |
| `razorpay.keyId` | Razorpay key ID |
| `mapsApiKey` | Google Maps Android SDK key |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT, shared) |
| Realtime | Supabase Realtime (Postgres change streams) |
| Storage | Supabase Storage (repair photos/videos) |
| Backend logic | Supabase Edge Functions (Deno/TypeScript) |
| Web frontend | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Android frontend | Kotlin, Jetpack Compose, supabase-kt, Room |
| Payments | Razorpay (Edge Function webhook) |
| Push notifications | Firebase Cloud Messaging + Web Push |
| Maps | Google Maps JS API (web) + Maps SDK (Android) |
| AI Diagnosis | MobileNetV2 proxied via Edge Function |
