-- ============================================================
-- EcoFix — Initial Schema Migration
-- 0001_initial_schema.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('customer', 'technician', 'admin');

CREATE TYPE booking_status AS ENUM (
  'booked',
  'assigned',
  'diagnosis',
  'awaiting_approval',
  'in_repair',
  'quality_check',
  'completed',
  'cancelled'
);

CREATE TYPE service_type AS ENUM ('doorstep', 'pickup', 'in_store');

CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TYPE notification_type AS ENUM (
  'booking_created',
  'booking_assigned',
  'diagnosis_ready',
  'quotation_submitted',
  'quotation_approved',
  'repair_started',
  'quality_check',
  'repair_completed',
  'payment_received',
  'warranty_created',
  'review_requested',
  'general'
);

-- ============================================================
-- CORE IDENTITY
-- ============================================================

-- Extended user profile (mirrors auth.users)
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'customer',
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  avatar_url    TEXT,
  fcm_token     TEXT,           -- Firebase Cloud Messaging token for push notifications
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider/Technician extended profile
CREATE TABLE public.provider_profiles (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  business_name        TEXT NOT NULL,
  description          TEXT,
  categories           TEXT[] NOT NULL DEFAULT '{}',   -- category ids they service
  verification_status  verification_status NOT NULL DEFAULT 'pending',
  rating_avg           NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_reviews        INTEGER NOT NULL DEFAULT 0,
  service_radius_km    INTEGER NOT NULL DEFAULT 10,
  doorstep_available   BOOLEAN NOT NULL DEFAULT FALSE,
  address              TEXT,
  location             GEOGRAPHY(POINT, 4326),          -- PostGIS point for distance queries
  identity_doc_url     TEXT,                            -- uploaded doc for admin verification
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATALOG
-- ============================================================

CREATE TABLE public.categories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  parent_id        UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  icon_url         TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CORE TRANSACTION FLOW
-- ============================================================

-- Product submitted for repair
CREATE TABLE public.products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id       UUID NOT NULL REFERENCES public.categories(id),
  brand             TEXT,
  model             TEXT,
  issue_description TEXT NOT NULL,
  media_urls        TEXT[] NOT NULL DEFAULT '{}',   -- Supabase Storage signed URLs
  ai_diagnosis      JSONB,                           -- { issue_labels: [], confidence_scores: [] }
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking — the central transaction record
CREATE TABLE public.bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES public.users(id),
  provider_id      UUID REFERENCES public.provider_profiles(id),   -- assigned after matching
  status           booking_status NOT NULL DEFAULT 'booked',
  estimated_cost   NUMERIC(10,2),
  final_cost       NUMERIC(10,2),
  scheduled_at     TIMESTAMPTZ,
  service_type     service_type NOT NULL DEFAULT 'in_store',
  customer_address TEXT,                -- for doorstep/pickup jobs
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only audit trail — every status change is logged here
-- This table drives the real-time repair timeline UI on both platforms
CREATE TABLE public.repair_status_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status       booking_status NOT NULL,
  note         TEXT,
  changed_by   UUID NOT NULL REFERENCES public.users(id),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diagnosis & Quotation submitted by technician
CREATE TABLE public.quotations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id            UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  diagnosis_notes       TEXT NOT NULL,
  quoted_amount         NUMERIC(10,2) NOT NULL,
  parts_breakdown       JSONB,          -- [{ part, cost }]
  labour_cost           NUMERIC(10,2),
  approved_by_customer  BOOLEAN,        -- NULL = pending, TRUE = approved, FALSE = rejected
  responded_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- POST-REPAIR
-- ============================================================

CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  method          TEXT NOT NULL DEFAULT 'razorpay',
  status          payment_status NOT NULL DEFAULT 'pending',
  transaction_ref TEXT,                 -- Razorpay payment ID
  gateway_payload JSONB,               -- full webhook payload for audit
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.warranties (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  duration_days INTEGER NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  terms         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reviews (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id       UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES public.users(id),
  provider_id      UUID NOT NULL REFERENCES public.provider_profiles(id),
  rating           NUMERIC(2,1) NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quality_score    INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  price_score      INTEGER CHECK (price_score BETWEEN 1 AND 5),
  timeliness_score INTEGER CHECK (timeliness_score BETWEEN 1 AND 5),
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ENGAGEMENT
-- ============================================================

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL DEFAULT 'general',
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',   -- e.g. { booking_id, status }
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX idx_bookings_status      ON public.bookings(status);
CREATE INDEX idx_bookings_created_at  ON public.bookings(created_at DESC);

CREATE INDEX idx_repair_status_log_booking_id ON public.repair_status_log(booking_id);
CREATE INDEX idx_repair_status_log_changed_at ON public.repair_status_log(changed_at DESC);

CREATE INDEX idx_products_customer_id ON public.products(customer_id);

CREATE INDEX idx_notifications_user_id    ON public.notifications(user_id);
CREATE INDEX idx_notifications_read       ON public.notifications(user_id, read) WHERE read = FALSE;

-- PostGIS spatial index for provider location queries
CREATE INDEX idx_provider_profiles_location ON public.provider_profiles USING GIST(location);

CREATE INDEX idx_provider_profiles_verification ON public.provider_profiles(verification_status);
CREATE INDEX idx_provider_profiles_rating       ON public.provider_profiles(rating_avg DESC);

CREATE INDEX idx_reviews_provider_id ON public.reviews(provider_id);
