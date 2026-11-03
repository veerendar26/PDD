# ECOFIX — Master Technical Build Prompt for Antigravity

> Paste this entire document into Antigravity as the project brief. It defines one synchronized backend that powers both the Web App and the Android App, so a booking, a status update, or a rating made on one platform is instantly visible on the other.

---

## 1. Project Context

**ECOFIX — "Repair. Reuse. Revalue."**
A multi-category digital marketplace that connects consumers who need product repairs (electronics, appliances, furniture, fashion, automotive, personal accessories, electrical) with verified repair businesses and independent technicians. Core flow: **Identify problem → Get matched providers → Compare → Book → Diagnosis & quotation → Track repair → Pay → Rate.** Includes AI-assisted preliminary problem identification, digital warranty tracking, and a repair history log. Two user roles at minimum: **Customer** and **Provider/Technician**, plus an **Admin** role for verification and platform management.

Build target: **one Web App + one Android App**, sharing **one backend and one database**, fully synchronized in real time.

---

## 2. High-Level Architecture

```
                         ┌─────────────────────────┐
                         │   Single Backend Layer   │
                         │  (Supabase: Postgres +   │
                         │  Auth + Storage + Realtime│
                         │      + Edge Functions)    │
                         └────────────┬─────────────┘
                                      │  REST / GraphQL / Realtime WS
                       ┌──────────────┼──────────────┐
                       │                             │
              ┌────────▼────────┐          ┌─────────▼─────────┐
              │   Web App        │          │   Android App      │
              │   Next.js 14+    │          │   Kotlin + Jetpack │
              │   (App Router)   │          │   Compose          │
              └──────────────────┘          └────────────────────┘
```

**One database. One auth system. One API. No separate backends per platform, no data duplication, no manual sync jobs.**

---

## 3. Recommended Single Backend: Supabase (Postgres)

Use **Supabase** as the single backend-as-a-service layer. Reasoning to give Antigravity as a constraint, not a suggestion to re-evaluate:

- **Postgres** as the source of truth — relational integrity matters here (bookings reference customers, technicians, categories, payments — foreign keys and transactions matter more than document flexibility).
- **Row-Level Security (RLS)** policies enforce per-role data access (a customer can only see their own bookings; a technician only sees jobs assigned to them) directly at the database layer, so both Web and Android inherit identical security rules with zero duplicated logic.
- **Built-in Auth** (email/password, OTP, Google/Apple sign-in) issues the same JWTs consumable by both the Next.js web client and the Android Kotlin client — one user table, one session model.
- **Realtime** (Postgres logical replication over WebSockets) lets both apps subscribe to live changes on the `bookings` and `repair_status_log` tables — when a technician updates status on Android, the customer's web dashboard updates without a manual refresh, and vice versa.
- **Storage** buckets for photos/videos of the damaged product, with signed URLs usable identically from web and mobile.
- **Auto-generated REST + GraphQL API** (PostgREST) means you don't hand-write a separate Express/Django layer that could drift between platforms — one schema change propagates to both API surfaces immediately.
- **Edge Functions** (Deno) for anything that shouldn't run client-side: AI diagnosis calls, payment webhook handling, notification dispatch.

*(If Antigravity's environment strongly prefers Firebase instead: use Firestore + Firebase Auth + Cloud Functions + FCM as a drop-in equivalent architecture — same principle of one backend, two clients. Default to Supabase unless the environment dictates otherwise, since the relational booking/payment/warranty data model fits Postgres better than a NoSQL document store.)*

---

## 4. Tech Stack

| Layer | Choice |
|---|---|
| Database | Postgres (via Supabase) |
| Auth | Supabase Auth (JWT, shared across Web + Android) |
| Realtime sync | Supabase Realtime (Postgres change streams) |
| File storage | Supabase Storage (repair photos/videos, provider docs) |
| Backend logic / webhooks | Supabase Edge Functions (Deno/TypeScript) |
| Web frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Android frontend | Kotlin, Jetpack Compose, Supabase Kotlin SDK, Retrofit fallback for Edge Functions |
| Payments | Razorpay or Stripe, processed via Edge Function + webhook, one `payments` table |
| Push notifications | Firebase Cloud Messaging (Android) + Web Push (browser), triggered from Edge Functions on status changes |
| Maps / location | Google Maps SDK (Android) + Google Maps JS API (Web) for provider discovery by distance |
| AI diagnosis | Existing MobileNetV2-based model (reuse from EcoFix diagnosis engine) served via an Edge Function or a small FastAPI microservice called from Edge Functions |

---

## 5. Unified Database Schema (single source of truth)

Instruct Antigravity to create these tables in Postgres, with RLS enabled on every table:

```sql
-- Core identity
users (id, role[customer|technician|admin], name, email, phone, avatar_url, created_at)
provider_profiles (id, user_id FK, business_name, categories[], verification_status, rating_avg, service_radius_km, doorstep_available, created_at)

-- Catalog
categories (id, name, parent_category_id)

-- Core transaction flow
products (id, customer_id FK, category_id FK, brand, model, issue_description, media_urls[], created_at)
bookings (id, product_id FK, customer_id FK, provider_id FK, status[booked|assigned|diagnosis|awaiting_approval|in_repair|quality_check|completed|cancelled], estimated_cost, final_cost, scheduled_at, service_type[doorstep|pickup|in_store], created_at, updated_at)
repair_status_log (id, booking_id FK, status, note, changed_by FK, changed_at)   -- append-only audit trail, drives realtime timeline UI
quotations (id, booking_id FK, diagnosis_notes, quoted_amount, approved_by_customer BOOLEAN, created_at)

-- Post-repair
payments (id, booking_id FK, amount, method, status, transaction_ref, paid_at)
warranties (id, booking_id FK, duration_days, starts_at, expires_at, terms)
reviews (id, booking_id FK, customer_id FK, provider_id FK, rating, quality_score, price_score, timeliness_score, comment, created_at)

-- Engagement
notifications (id, user_id FK, type, payload JSONB, read BOOLEAN, created_at)
```

Instructions for Antigravity:
- Every write to `bookings.status` must also insert a row into `repair_status_log` (use a Postgres trigger, not client-side logic, so Web and Android can never drift or bypass the audit trail).
- Enable RLS: customers can `SELECT`/`INSERT` only rows where `customer_id = auth.uid()`; providers can `SELECT`/`UPDATE` only rows where `provider_id` matches their linked `provider_profiles.id`; admins bypass via a service role.
- Index `bookings(customer_id)`, `bookings(provider_id)`, `bookings(status)`, and `provider_profiles` on a PostGIS `geography` column for location-based matching.

---

## 6. Synchronization Strategy (the part that matters most)

1. **Single schema, single API surface.** Both clients talk to the exact same Supabase project — no per-platform backend, no separate mobile API version.
2. **Realtime channels per booking.** Web and Android both subscribe to `postgres_changes` on `repair_status_log` filtered by `booking_id`. Any status change from either client propagates to the other within milliseconds — this is what makes the tracking timeline feel "live" on both platforms simultaneously.
3. **Optimistic UI + server reconciliation.** Both clients may update local UI state optimistically on user action, but the Postgres row (via trigger-inserted log) is the only source of truth; reconcile local state against the next Realtime event.
4. **Offline support (Android-specific).** Cache the customer's active bookings and recent status log locally (Room database) so the Android app remains usable offline; queue writes and flush them through Supabase when connectivity returns, using the booking's `updated_at` timestamp for conflict resolution (last-write-wins is acceptable here given the linear status flow).
5. **Shared auth session.** Both apps use Supabase's JWT; a user who registers on Web and later installs the Android app logs into the *same* account with no separate identity system.
6. **One notification pipeline.** Edge Function triggered on `bookings` status change writes to `notifications` and fans out to FCM (Android) and Web Push — never let either client send notifications independently, to avoid duplicate/divergent alerts.

---

## 7. Build Instructions by Feature (map directly to the plan doc's 7-step flow)

Give Antigravity these as sequential build phases:

1. **Auth & Roles** — sign-up/login (email + Google), role selection (customer/technician), provider onboarding + verification workflow for admin approval.
2. **Product & Issue Intake** — category picker, product detail form, photo/video upload to Storage, optional AI diagnosis call.
3. **Provider Discovery & Comparison** — location + category + rating based matching query, comparison view (price, distance, rating, warranty, doorstep availability).
4. **Booking** — service type selection, scheduling, creates `bookings` row.
5. **Diagnosis & Quotation** — technician submits `quotations` row; customer approve/reject updates `bookings.status`.
6. **Live Repair Tracking** — Realtime-subscribed timeline UI on both Web and Android reading `repair_status_log`.
7. **Payment & Warranty** — payment via Razorpay/Stripe Edge Function, writes `payments` + `warranties` rows.
8. **Ratings & Repair History** — `reviews` table write, customer-facing history view joining `bookings` + `products` + `warranties`.
9. **Provider Dashboard** — job queue, status updates, earnings, analytics (both Web and a technician-facing Android view).
10. **Admin Panel** (Web only) — provider verification queue, category management, dispute handling.

---

## 8. Non-Functional Requirements to Include in the Prompt

- Enforce RLS on every table — no client ever queries with elevated privileges except through Edge Functions using the service role key server-side.
- Environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, payment keys) managed via `.env` for Web and `local.properties`/BuildConfig for Android — never hardcoded.
- API contracts (table shapes, RPC function signatures) should be generated once from the Postgres schema (Supabase CLI `gen types typescript` for Web, and a Kotlin data-class generation step or manual DTOs matching the same schema for Android) so both clients are always in structural agreement with the database.
- Responsive Web UI (mobile-web fallback) and native Android UI should mirror the same information architecture so users switching platforms recognize the flow instantly.
- Log all status transitions immutably (already covered by `repair_status_log`) for dispute resolution.

---

## 9. Deliverables to Request from Antigravity

1. Supabase project schema (SQL migration files) + RLS policies.
2. Next.js web app with the 10 feature phases above.
3. Android app (Kotlin/Compose) with the customer + technician flows.
4. Shared TypeScript/Kotlin type definitions generated from the schema.
5. Edge Functions for payments, notifications, and AI diagnosis proxying.
6. Seed data script for categories and demo providers.
7. A short README documenting the sync architecture (Section 6 above) so it's reproducible.

---

**Copy everything above this line into Antigravity as the project instructions.**
