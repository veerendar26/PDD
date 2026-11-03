# EcoFix — Setup & Running Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| Supabase CLI | ≥ 1.200 | `npm i -g supabase` |
| Android Studio | Hedgehog+ | [developer.android.com](https://developer.android.com/studio) |
| JDK | 17 | Bundled with Android Studio |

---

## 1. Clone & install

```bash
git clone <repo-url> && cd EcoFix
cd web && npm install
```

---

## 2. Supabase setup

### Option A — Local development
```bash
supabase start           # starts local Postgres + Auth + Storage + Edge Functions
supabase db push         # applies all migrations (0001–0004)
supabase db seed         # inserts categories + demo users
supabase functions serve # serves Edge Functions locally
```

### Option B — Cloud project
1. Create a project at [app.supabase.com](https://app.supabase.com)
2. Run migrations from the SQL Editor or via the CLI:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   supabase db seed
   ```
3. Enable the **PostGIS** extension in Project → Extensions

---

## 3. Web app environment

Create `web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXX
```

Start the dev server:
```bash
cd web && npm run dev
# → http://localhost:3000
```

---

## 4. Android setup

Create `android/local.properties` (not committed):
```properties
sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk
supabase.url=https://<your-project>.supabase.co
supabase.anonKey=<anon key>
razorpay.keyId=rzp_test_XXXXXXXXX
mapsApiKey=<Google Maps API key>
```

Place your `google-services.json` (from Firebase Console) into `android/app/`.

Open `android/` in Android Studio → sync Gradle → Run.

---

## 5. Edge Functions environment

Create `supabase/functions/.env` for local dev:
```env
RAZORPAY_KEY_SECRET=<your key secret>
AI_DIAGNOSIS_URL=<optional AI endpoint>
```

Deploy to cloud:
```bash
supabase functions deploy notify-status-change
supabase functions deploy payment-webhook
supabase functions deploy ai-diagnosis
```

---

## 6. Demo credentials (from seed.sql)

| Role | Email | Password |
|------|-------|----------|
| Customer | customer@demo.ecofix | Demo@12345 |
| Technician | provider@demo.ecofix | Demo@12345 |
| Admin | admin@demo.ecofix | Demo@12345 |

---

## 7. Repository structure

```
EcoFix/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql    # 12 tables + enums
│   │   ├── 0002_rls_policies.sql      # Row-level security
│   │   ├── 0003_triggers_and_functions.sql
│   │   └── 0004_geolocation_rpc.sql   # PostGIS + find_nearby_providers
│   ├── seed.sql                        # Demo data
│   └── functions/
│       ├── ai-diagnosis/
│       ├── notify-status-change/
│       └── payment-webhook/
│
├── web/                               # Next.js 15 app
│   ├── app/
│   │   ├── page.tsx                   # Landing page
│   │   ├── dashboard/page.tsx         # Customer dashboard
│   │   ├── book/page.tsx              # 4-step booking wizard
│   │   ├── bookings/[id]/page.tsx     # Live tracking
│   │   ├── history/page.tsx           # Repair history
│   │   ├── provider/
│   │   │   ├── dashboard/page.tsx
│   │   │   └── bookings/[id]/page.tsx
│   │   ├── admin/page.tsx             # Admin panel
│   │   └── auth/
│   │       ├── login/page.tsx
│   │       ├── register/page.tsx
│   │       └── callback/route.ts
│   ├── lib/supabase/
│   │   ├── client.ts                  # Browser client
│   │   └── server.ts                  # SSR + admin clients
│   ├── types/database.ts              # Generated TypeScript types
│   └── middleware.ts                  # Auth + role-based route protection
│
└── android/                           # Kotlin + Jetpack Compose app
    └── app/src/main/kotlin/com/ecofix/app/
        ├── EcoFixApplication.kt
        ├── MainActivity.kt
        ├── data/
        │   ├── model/Dtos.kt          # Mirrors Postgres tables
        │   ├── local/EcoFixDatabase.kt # Room + offline cache
        │   ├── remote/SupabaseRepositories.kt
        │   └── sync/SyncWorker.kt     # WorkManager offline sync
        ├── di/AppModule.kt            # Hilt DI
        └── ui/
            ├── navigation/NavGraph.kt
            ├── theme/Theme.kt
            ├── viewmodel/
            │   ├── AuthViewModel.kt
            │   ├── BookingViewModel.kt # Realtime subscription
            │   └── ProviderViewModel.kt
            └── screens/
                ├── splash/SplashScreen.kt
                ├── customer/
                │   ├── CustomerDashboardScreen.kt
                │   └── TrackingScreen.kt
                └── provider/
                    ├── ProviderDashboardScreen.kt
                    └── ProviderJobDetailScreen.kt
```
