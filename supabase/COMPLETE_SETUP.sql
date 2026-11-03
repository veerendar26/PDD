-- ============================================================
-- EcoFix — Complete Database Setup (Schema, RLS, Triggers, RPC, Seeds)
-- Run this entire script in Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'technician', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE service_type AS ENUM ('doorstep', 'pickup', 'in_store');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLES

-- Users table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'customer',
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  avatar_url    TEXT,
  fcm_token     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Provider/Technician extended profile
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  business_name        TEXT NOT NULL,
  description          TEXT,
  categories           TEXT[] NOT NULL DEFAULT '{}',
  verification_status  verification_status NOT NULL DEFAULT 'pending',
  rating_avg           NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_reviews        INTEGER NOT NULL DEFAULT 0,
  service_radius_km    INTEGER NOT NULL DEFAULT 10,
  doorstep_available   BOOLEAN NOT NULL DEFAULT FALSE,
  address              TEXT,
  location             GEOGRAPHY(POINT, 4326),
  identity_doc_url     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  parent_id        UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  icon_url         TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id       UUID NOT NULL REFERENCES public.categories(id),
  brand             TEXT,
  model             TEXT,
  issue_description TEXT NOT NULL,
  media_urls        TEXT[] NOT NULL DEFAULT '{}',
  ai_diagnosis      JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES public.users(id),
  provider_id      UUID REFERENCES public.provider_profiles(id),
  status           booking_status NOT NULL DEFAULT 'booked',
  estimated_cost   NUMERIC(10,2),
  final_cost       NUMERIC(10,2),
  scheduled_at     TIMESTAMPTZ,
  service_type     service_type NOT NULL DEFAULT 'in_store',
  customer_address TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Status log table
CREATE TABLE IF NOT EXISTS public.repair_status_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status       booking_status NOT NULL,
  note         TEXT,
  changed_by   UUID NOT NULL REFERENCES public.users(id),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id            UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  diagnosis_notes       TEXT NOT NULL,
  quoted_amount         NUMERIC(10,2) NOT NULL,
  parts_breakdown       JSONB,
  labour_cost           NUMERIC(10,2),
  approved_by_customer  BOOLEAN,
  responded_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  method          TEXT NOT NULL DEFAULT 'razorpay',
  status          payment_status NOT NULL DEFAULT 'pending',
  transaction_ref TEXT,
  gateway_payload JSONB,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Warranties table
CREATE TABLE IF NOT EXISTS public.warranties (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  duration_days INTEGER NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  terms         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
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

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL DEFAULT 'general',
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at  ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repair_status_log_booking_id ON public.repair_status_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_repair_status_log_changed_at ON public.repair_status_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_customer_id ON public.products(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_provider_profiles_location ON public.provider_profiles USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_verification ON public.provider_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_rating ON public.provider_profiles(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews(provider_id);

-- 5. ROW-LEVEL SECURITY (RLS)
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_status_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- RLS Policies
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "users_insert_trigger_only" ON public.users;
CREATE POLICY "users_insert_trigger_only" ON public.users FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "providers_select_approved" ON public.provider_profiles;
CREATE POLICY "providers_select_approved" ON public.provider_profiles FOR SELECT USING (verification_status = 'approved' OR user_id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "providers_insert_own" ON public.provider_profiles;
CREATE POLICY "providers_insert_own" ON public.provider_profiles FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "providers_update_own" ON public.provider_profiles;
CREATE POLICY "providers_update_own" ON public.provider_profiles FOR UPDATE USING (user_id = auth.uid() OR public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT USING (
  customer_id = auth.uid() OR public.get_my_role() = 'admin' OR EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.provider_profiles pp ON pp.id = b.provider_id
    WHERE b.product_id = products.id AND pp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "products_insert_own" ON public.products;
CREATE POLICY "products_insert_own" ON public.products FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "products_update_own" ON public.products;
CREATE POLICY "products_update_own" ON public.products FOR UPDATE USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
CREATE POLICY "bookings_select" ON public.bookings FOR SELECT USING (
  customer_id = auth.uid() OR public.get_my_role() = 'admin' OR EXISTS (
    SELECT 1 FROM public.provider_profiles pp WHERE pp.id = bookings.provider_id AND pp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "bookings_insert_customer" ON public.bookings;
CREATE POLICY "bookings_insert_customer" ON public.bookings FOR INSERT WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE USING (
  customer_id = auth.uid() OR public.get_my_role() = 'admin' OR EXISTS (
    SELECT 1 FROM public.provider_profiles pp WHERE pp.id = bookings.provider_id AND pp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "status_log_select" ON public.repair_status_log;
CREATE POLICY "status_log_select" ON public.repair_status_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = repair_status_log.booking_id AND (
      b.customer_id = auth.uid() OR public.get_my_role() = 'admin' OR EXISTS (
        SELECT 1 FROM public.provider_profiles pp WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "status_log_no_direct_insert" ON public.repair_status_log;
CREATE POLICY "status_log_no_direct_insert" ON public.repair_status_log FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "quotations_select" ON public.quotations;
CREATE POLICY "quotations_select" ON public.quotations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = quotations.booking_id AND (
      b.customer_id = auth.uid() OR public.get_my_role() = 'admin' OR EXISTS (
        SELECT 1 FROM public.provider_profiles pp WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "quotations_insert_provider" ON public.quotations;
CREATE POLICY "quotations_insert_provider" ON public.quotations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.provider_profiles pp ON pp.id = b.provider_id
    WHERE b.id = quotations.booking_id AND pp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "quotations_update" ON public.quotations;
CREATE POLICY "quotations_update" ON public.quotations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = quotations.booking_id AND (
      b.customer_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.provider_profiles pp WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
      ) OR public.get_my_role() = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = payments.booking_id AND (
      b.customer_id = auth.uid() OR public.get_my_role() = 'admin' OR EXISTS (
        SELECT 1 FROM public.provider_profiles pp WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "payments_no_client_insert" ON public.payments;
CREATE POLICY "payments_no_client_insert" ON public.payments FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "warranties_select" ON public.warranties;
CREATE POLICY "warranties_select" ON public.warranties FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = warranties.booking_id AND (
      b.customer_id = auth.uid() OR public.get_my_role() = 'admin' OR EXISTS (
        SELECT 1 FROM public.provider_profiles pp WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "warranties_no_client_insert" ON public.warranties;
CREATE POLICY "warranties_no_client_insert" ON public.warranties FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "reviews_insert_customer" ON public.reviews;
CREATE POLICY "reviews_insert_customer" ON public.reviews FOR INSERT WITH CHECK (
  customer_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = reviews.booking_id AND b.customer_id = auth.uid() AND b.status = 'completed'
  )
);

DROP POLICY IF EXISTS "reviews_no_update" ON public.reviews;
CREATE POLICY "reviews_no_update" ON public.reviews FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_no_client_insert" ON public.notifications;
CREATE POLICY "notifications_no_client_insert" ON public.notifications FOR INSERT WITH CHECK (FALSE);

-- 6. TRIGGERS & FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, role, name, email)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.repair_status_log (booking_id, status, changed_by, note)
    VALUES (NEW.id, NEW.status, auth.uid(), NULL);
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_booking_status ON public.bookings;
CREATE TRIGGER trg_log_booking_status
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();

CREATE OR REPLACE FUNCTION public.log_initial_booking_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.repair_status_log (booking_id, status, changed_by, note)
  VALUES (NEW.id, NEW.status, NEW.customer_id, 'Booking created');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_initial_booking_status ON public.bookings;
CREATE TRIGGER trg_log_initial_booking_status
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_initial_booking_status();

CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.provider_profiles
  SET
    rating_avg    = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM public.reviews WHERE provider_id = NEW.provider_id),
    total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE provider_id = NEW.provider_id),
    updated_at    = NOW()
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_provider_rating ON public.reviews;
CREATE TRIGGER trg_update_provider_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_rating();

CREATE OR REPLACE FUNCTION public.handle_quotation_response()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.approved_by_customer IS DISTINCT FROM NEW.approved_by_customer THEN
    NEW.responded_at = NOW();
    IF NEW.approved_by_customer = TRUE THEN
      UPDATE public.bookings SET status = 'in_repair', final_cost = NEW.quoted_amount WHERE id = NEW.booking_id;
    ELSIF NEW.approved_by_customer = FALSE THEN
      UPDATE public.bookings SET status = 'cancelled' WHERE id = NEW.booking_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_quotation_response ON public.quotations;
CREATE TRIGGER trg_handle_quotation_response
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.handle_quotation_response();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_provider_profiles_updated_at ON public.provider_profiles;
CREATE TRIGGER set_provider_profiles_updated_at BEFORE UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. GEOLOCATION RPC
CREATE OR REPLACE FUNCTION find_nearby_providers(
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  radius_km   DOUBLE PRECISION DEFAULT 25,
  category_id UUID             DEFAULT NULL
)
RETURNS TABLE (
  id                  UUID,
  user_id             UUID,
  business_name       TEXT,
  description         TEXT,
  categories          TEXT[],
  verification_status TEXT,
  rating_avg          NUMERIC,
  total_reviews       INTEGER,
  service_radius_km   INTEGER,
  doorstep_available  BOOLEAN,
  address             TEXT,
  distance_km         DOUBLE PRECISION,
  provider_name       TEXT,
  provider_avatar_url TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT
    pp.id,
    pp.user_id,
    pp.business_name,
    pp.description,
    pp.categories,
    pp.verification_status::TEXT,
    pp.rating_avg,
    pp.total_reviews,
    pp.service_radius_km,
    pp.doorstep_available,
    pp.address,
    ROUND(
      (ST_Distance(
        pp.location,
        ST_MakePoint(lng, lat)::GEOGRAPHY
      ) / 1000.0)::NUMERIC,
      2
    )::DOUBLE PRECISION AS distance_km,
    u.name   AS provider_name,
    u.avatar_url AS provider_avatar_url
  FROM provider_profiles pp
  JOIN users u ON u.id = pp.user_id
  WHERE
    pp.verification_status = 'approved'
    AND pp.location IS NOT NULL
    AND ST_DWithin(
          pp.location,
          ST_MakePoint(lng, lat)::GEOGRAPHY,
          radius_km * 1000
        )
    AND (
          category_id IS NULL
          OR category_id::TEXT = ANY(pp.categories)
        )
  ORDER BY distance_km ASC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION find_nearby_providers TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_providers TO anon;

-- 8. SEED DATA (Categories)
INSERT INTO public.categories (id, name, parent_id, display_order) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Electronics',          NULL, 1),
  ('c0000001-0000-0000-0000-000000000002', 'Home Appliances',      NULL, 2),
  ('c0000001-0000-0000-0000-000000000003', 'Furniture',            NULL, 3),
  ('c0000001-0000-0000-0000-000000000004', 'Fashion & Clothing',   NULL, 4),
  ('c0000001-0000-0000-0000-000000000005', 'Automotive',           NULL, 5),
  ('c0000001-0000-0000-0000-000000000006', 'Personal Accessories', NULL, 6),
  ('c0000001-0000-0000-0000-000000000007', 'Electrical & Wiring',  NULL, 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name, parent_id, display_order) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'Smartphones',       'c0000001-0000-0000-0000-000000000001', 1),
  ('c0000002-0000-0000-0000-000000000002', 'Laptops & PCs',     'c0000001-0000-0000-0000-000000000001', 2),
  ('c0000002-0000-0000-0000-000000000003', 'Televisions',       'c0000001-0000-0000-0000-000000000001', 3),
  ('c0000002-0000-0000-0000-000000000004', 'Audio Equipment',   'c0000001-0000-0000-0000-000000000001', 4),
  ('c0000002-0000-0000-0000-000000000005', 'Cameras',           'c0000001-0000-0000-0000-000000000001', 5),
  ('c0000002-0000-0000-0000-000000000006', 'Gaming Devices',    'c0000001-0000-0000-0000-000000000001', 6),
  ('c0000003-0000-0000-0000-000000000001', 'Washing Machines',  'c0000001-0000-0000-0000-000000000002', 1),
  ('c0000003-0000-0000-0000-000000000002', 'Refrigerators',     'c0000001-0000-0000-0000-000000000002', 2),
  ('c0000003-0000-0000-0000-000000000003', 'Air Conditioners',  'c0000001-0000-0000-0000-000000000002', 3),
  ('c0000003-0000-0000-0000-000000000004', 'Microwave Ovens',   'c0000001-0000-0000-0000-000000000002', 4),
  ('c0000003-0000-0000-0000-000000000005', 'Water Purifiers',   'c0000001-0000-0000-0000-000000000002', 5),
  ('c0000003-0000-0000-0000-000000000006', 'Vacuum Cleaners',   'c0000001-0000-0000-0000-000000000002', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. ADMIN GOVERNANCE & AUDIT SCHEMA
-- ============================================================

-- Provider Verification Metadata
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  target_type  TEXT NOT NULL,
  target_id    UUID,
  details      JSONB NOT NULL DEFAULT '{}',
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "admin_audit_logs_admin_only" ON public.admin_audit_logs
    FOR ALL USING (public.get_my_role() = 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

