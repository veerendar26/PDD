-- ============================================================
-- EcoFix — Row-Level Security Policies
-- 0002_rls_policies.sql
-- ============================================================

-- Enable RLS on all tables
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

-- ============================================================
-- Helper function: get the calling user's role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ============================================================
-- USERS
-- ============================================================

-- Users can read their own row; admins read all
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR public.get_my_role() = 'admin'
  );

-- Users can update their own row
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Insert is handled by the on_auth_user_created trigger (SECURITY DEFINER)
CREATE POLICY "users_insert_trigger_only" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================================
-- PROVIDER_PROFILES
-- ============================================================

-- Anyone authenticated can view approved providers (for discovery)
CREATE POLICY "providers_select_approved" ON public.provider_profiles
  FOR SELECT USING (
    verification_status = 'approved'
    OR user_id = auth.uid()
    OR public.get_my_role() = 'admin'
  );

-- Providers manage their own profile
CREATE POLICY "providers_insert_own" ON public.provider_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "providers_update_own" ON public.provider_profiles
  FOR UPDATE USING (
    user_id = auth.uid()
    OR public.get_my_role() = 'admin'
  );

-- ============================================================
-- CATEGORIES (public read, admin write)
-- ============================================================

CREATE POLICY "categories_select_all" ON public.categories
  FOR SELECT USING (TRUE);

CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL USING (public.get_my_role() = 'admin');

-- ============================================================
-- PRODUCTS
-- ============================================================

-- Customers see their own products; providers see products in their bookings; admins see all
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (
    customer_id = auth.uid()
    OR public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.provider_profiles pp ON pp.id = b.provider_id
      WHERE b.product_id = products.id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "products_insert_own" ON public.products
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "products_update_own" ON public.products
  FOR UPDATE USING (customer_id = auth.uid());

-- ============================================================
-- BOOKINGS
-- ============================================================

-- Customers see their own bookings; providers see bookings assigned to them
CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT USING (
    customer_id = auth.uid()
    OR public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.id = bookings.provider_id
        AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_insert_customer" ON public.bookings
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Customers can update (e.g. cancel); providers can update status
CREATE POLICY "bookings_update" ON public.bookings
  FOR UPDATE USING (
    customer_id = auth.uid()
    OR public.get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.id = bookings.provider_id
        AND pp.user_id = auth.uid()
    )
  );

-- ============================================================
-- REPAIR_STATUS_LOG (append-only; read by booking participants)
-- ============================================================

CREATE POLICY "status_log_select" ON public.repair_status_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = repair_status_log.booking_id
        AND (
          b.customer_id = auth.uid()
          OR public.get_my_role() = 'admin'
          OR EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
          )
        )
    )
  );

-- Only the trigger function (SECURITY DEFINER) writes this table
-- Clients must update bookings.status, never write directly to this table
CREATE POLICY "status_log_no_direct_insert" ON public.repair_status_log
  FOR INSERT WITH CHECK (FALSE);  -- blocked for all roles; trigger uses SECURITY DEFINER

-- ============================================================
-- QUOTATIONS
-- ============================================================

CREATE POLICY "quotations_select" ON public.quotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = quotations.booking_id
        AND (
          b.customer_id = auth.uid()
          OR public.get_my_role() = 'admin'
          OR EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
          )
        )
    )
  );

-- Providers insert quotations for their bookings
CREATE POLICY "quotations_insert_provider" ON public.quotations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.provider_profiles pp ON pp.id = b.provider_id
      WHERE b.id = quotations.booking_id
        AND pp.user_id = auth.uid()
    )
  );

-- Customer can update approved_by_customer; provider can update diagnosis notes
CREATE POLICY "quotations_update" ON public.quotations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = quotations.booking_id
        AND (
          b.customer_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
          )
          OR public.get_my_role() = 'admin'
        )
    )
  );

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id
        AND (
          b.customer_id = auth.uid()
          OR public.get_my_role() = 'admin'
          OR EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
          )
        )
    )
  );

-- Payments are inserted by Edge Functions using service role — no client inserts
CREATE POLICY "payments_no_client_insert" ON public.payments
  FOR INSERT WITH CHECK (FALSE);

-- ============================================================
-- WARRANTIES
-- ============================================================

CREATE POLICY "warranties_select" ON public.warranties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = warranties.booking_id
        AND (
          b.customer_id = auth.uid()
          OR public.get_my_role() = 'admin'
          OR EXISTS (
            SELECT 1 FROM public.provider_profiles pp
            WHERE pp.id = b.provider_id AND pp.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "warranties_no_client_insert" ON public.warranties
  FOR INSERT WITH CHECK (FALSE);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE POLICY "reviews_select_all" ON public.reviews
  FOR SELECT USING (TRUE);  -- reviews are public

CREATE POLICY "reviews_insert_customer" ON public.reviews
  FOR INSERT WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.customer_id = auth.uid()
        AND b.status = 'completed'
    )
  );

-- No updates to reviews (immutable once submitted)
CREATE POLICY "reviews_no_update" ON public.reviews
  FOR UPDATE USING (FALSE);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Notifications inserted by Edge Functions using service role
CREATE POLICY "notifications_no_client_insert" ON public.notifications
  FOR INSERT WITH CHECK (FALSE);
