-- ============================================================
-- EcoFix — Provider Location, Service Area & Availability
-- 0007_provider_location_service_area.sql
-- ============================================================

-- 1. Add working_hours and accepting_bookings to provider_profiles
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{
    "mon": {"open": true, "start": "09:00", "end": "19:00"},
    "tue": {"open": true, "start": "09:00", "end": "19:00"},
    "wed": {"open": true, "start": "09:00", "end": "19:00"},
    "thu": {"open": true, "start": "09:00", "end": "19:00"},
    "fri": {"open": true, "start": "09:00", "end": "19:00"},
    "sat": {"open": true, "start": "09:00", "end": "17:00"},
    "sun": {"open": false, "start": "10:00", "end": "15:00"}
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS accepting_bookings BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Enhanced find_nearby_providers with coverage boundary and availability
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
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
  provider_avatar_url TEXT,
  working_hours       JSONB,
  accepting_bookings  BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pp.id,
    pp.user_id,
    pp.business_name,
    pp.description,
    pp.categories,
    pp.verification_status,
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
    COALESCE(u.name, pp.business_name) AS provider_name,
    u.avatar_url AS provider_avatar_url,
    pp.working_hours,
    COALESCE(pp.accepting_bookings, TRUE) AS accepting_bookings
  FROM provider_profiles pp
  LEFT JOIN users u ON u.id = pp.user_id
  WHERE
    pp.verification_status = 'approved'
    AND COALESCE(pp.is_active, TRUE) = TRUE
    AND COALESCE(pp.accepting_bookings, TRUE) = TRUE
    AND pp.location IS NOT NULL
    -- Ensure customer is within both customer search radius AND technician service coverage
    AND ST_DWithin(
          pp.location,
          ST_MakePoint(lng, lat)::GEOGRAPHY,
          LEAST(COALESCE(radius_km, 25), COALESCE(pp.service_radius_km, 25)) * 1000
        )
    AND (
          category_id IS NULL
          OR category_id::TEXT = ANY(pp.categories)
        )
  ORDER BY distance_km ASC
  LIMIT 50;
$$;

-- Allow authenticated and anonymous users to call find_nearby_providers
GRANT EXECUTE ON FUNCTION public.find_nearby_providers TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_nearby_providers TO anon;
