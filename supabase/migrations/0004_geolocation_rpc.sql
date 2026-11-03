-- Migration: find_nearby_providers RPC function
-- Used by both the web booking wizard and the Android BookRepairScreen
-- to show only providers within a configurable radius of the customer.
--
-- Requires: PostGIS extension (enabled in Supabase by default)
-- Input:  lat, lng (WGS-84), radius_km, optional category_id filter
-- Output: provider_profiles joined with users, plus computed distance

CREATE EXTENSION IF NOT EXISTS postgis;

-- Add PostGIS geography column to provider_profiles
ALTER TABLE provider_profiles
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Spatial index for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_provider_profiles_location
  ON provider_profiles USING GIST (location);

-- Helper to set location from lat/lng
CREATE OR REPLACE FUNCTION set_provider_location(
  p_provider_id UUID,
  p_lat         DOUBLE PRECISION,
  p_lng         DOUBLE PRECISION
)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE provider_profiles
  SET location = ST_MakePoint(p_lng, p_lat)::GEOGRAPHY
  WHERE id = p_provider_id;
$$;

-- ── Main RPC ────────────────────────────────────────────────
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
    u.avatar_url AS provider_avatar_url
  FROM provider_profiles pp
  LEFT JOIN users u ON u.id = pp.user_id
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

-- RLS: allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION find_nearby_providers TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_providers TO anon;
