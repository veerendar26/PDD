-- ============================================================
-- EcoFix — Triggers & Stored Functions
-- 0003_triggers_and_indexes.sql
-- ============================================================

-- ============================================================
-- FUNCTION: Auto-create user profile on auth signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: Append to repair_status_log on booking status change
-- This is the critical trigger that keeps both platforms in sync.
-- Neither the web client nor Android can bypass this — the log
-- is always written server-side.
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.repair_status_log (
      booking_id,
      status,
      changed_by,
      note
    )
    VALUES (
      NEW.id,
      NEW.status,
      auth.uid(),   -- the user who triggered the change (JWT context)
      NULL          -- clients can pass a note via a separate RPC if needed
    );
  END IF;

  -- Always update the updated_at timestamp
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_booking_status
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_status_change();

-- Log the initial status on INSERT too
CREATE OR REPLACE FUNCTION public.log_initial_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.repair_status_log (
    booking_id,
    status,
    changed_by,
    note
  )
  VALUES (
    NEW.id,
    NEW.status,
    NEW.customer_id,
    'Booking created'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_initial_booking_status
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_initial_booking_status();

-- ============================================================
-- FUNCTION: Update provider rating on new review
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.provider_profiles
  SET
    rating_avg    = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM public.reviews
      WHERE provider_id = NEW.provider_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE provider_id = NEW.provider_id
    ),
    updated_at    = NOW()
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_provider_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();

-- ============================================================
-- FUNCTION: Update booking status when quotation is approved/rejected
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_quotation_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.approved_by_customer IS DISTINCT FROM NEW.approved_by_customer THEN
    NEW.responded_at = NOW();
    
    IF NEW.approved_by_customer = TRUE THEN
      UPDATE public.bookings
      SET status = 'in_repair', final_cost = NEW.quoted_amount
      WHERE id = NEW.booking_id;
    ELSIF NEW.approved_by_customer = FALSE THEN
      UPDATE public.bookings
      SET status = 'cancelled'
      WHERE id = NEW.booking_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_quotation_response
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_quotation_response();

-- ============================================================
-- FUNCTION: Update updated_at on users and provider_profiles
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_provider_profiles_updated_at
  BEFORE UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RPC: Find providers near a location within radius
-- Called by both web and Android for provider discovery
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  lat           FLOAT,
  lng           FLOAT,
  radius_km     FLOAT DEFAULT 20,
  category_id   UUID DEFAULT NULL
)
RETURNS TABLE (
  id                  UUID,
  user_id             UUID,
  business_name       TEXT,
  description         TEXT,
  categories          TEXT[],
  rating_avg          NUMERIC,
  total_reviews       INTEGER,
  service_radius_km   INTEGER,
  doorstep_available  BOOLEAN,
  address             TEXT,
  distance_km         FLOAT,
  provider_name       TEXT,
  provider_avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    pp.id,
    pp.user_id,
    pp.business_name,
    pp.description,
    pp.categories,
    pp.rating_avg,
    pp.total_reviews,
    pp.service_radius_km,
    pp.doorstep_available,
    pp.address,
    ROUND(
      ST_Distance(
        pp.location,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY
      ) / 1000.0, 2
    ) AS distance_km,
    u.name   AS provider_name,
    u.avatar_url AS provider_avatar_url
  FROM public.provider_profiles pp
  JOIN public.users u ON u.id = pp.user_id
  WHERE
    pp.verification_status = 'approved'
    AND (
      category_id IS NULL
      OR category_id::TEXT = ANY(pp.categories)
    )
    AND ST_DWithin(
      pp.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY,
      radius_km * 1000  -- convert to metres
    )
  ORDER BY distance_km ASC;
$$;
