-- ============================================================
-- EcoFix — Technician Verification Security Hardening
-- 0006_verification_security.sql
-- ============================================================

-- ============================================================
-- 1. Add missing fields to provider_profiles
--    (verified_at / verified_by / is_active already exist from 0005)
-- ============================================================

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Back-fill application_submitted_at from created_at for existing rows
UPDATE public.provider_profiles
SET application_submitted_at = created_at
WHERE application_submitted_at IS NULL;

-- ============================================================
-- 2. SECURE the provider_profiles UPDATE policy
--    Previously: providers could update any column including
--    verification_status.
--    Now: providers may only update non-sensitive columns;
--    admins may update everything.
-- ============================================================

DROP POLICY IF EXISTS "providers_update_own" ON public.provider_profiles;

-- Providers can update their own profile BUT NOT verification columns
CREATE POLICY "providers_update_own_safe" ON public.provider_profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    -- Providers may not change their own verification status
    verification_status = (
      SELECT verification_status FROM public.provider_profiles WHERE id = provider_profiles.id
    )
    AND is_active = (
      SELECT is_active FROM public.provider_profiles WHERE id = provider_profiles.id
    )
  );

-- Admins can update everything (uses service_role key in practice, but belt + suspenders)
CREATE POLICY "providers_update_admin" ON public.provider_profiles
  FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ============================================================
-- 3. SECURE the users UPDATE policy
--    Prevent users from assigning themselves admin / technician role
-- ============================================================

DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Users can update their own row but cannot change their own role
CREATE POLICY "users_update_own_safe" ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    -- Role must stay the same as current DB value
    role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- Admins can update anything in users table (via service_role key)
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ============================================================
-- 4. Secure RPC: Submit technician application
--    Called from the web app to safely create a provider profile.
--    Always sets verification_status = 'pending'.
--    Cannot be called to self-approve.
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_technician_application(
  p_business_name      TEXT,
  p_description        TEXT DEFAULT NULL,
  p_categories         TEXT[] DEFAULT '{}',
  p_service_radius_km  INTEGER DEFAULT 10,
  p_doorstep_available BOOLEAN DEFAULT FALSE,
  p_address            TEXT DEFAULT NULL,
  p_identity_doc_url   TEXT DEFAULT NULL,
  p_contact_name       TEXT DEFAULT NULL,
  p_phone              TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_profile_id UUID;
  v_profile_id UUID;
BEGIN
  -- Must be authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Validate required fields
  IF TRIM(p_business_name) = '' THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  IF array_length(p_categories, 1) IS NULL OR array_length(p_categories, 1) = 0 THEN
    RAISE EXCEPTION 'At least one category must be selected';
  END IF;

  -- Update user role to technician (only if currently customer)
  UPDATE public.users
  SET
    role = 'technician',
    name = COALESCE(NULLIF(TRIM(p_contact_name), ''), name),
    phone = COALESCE(NULLIF(TRIM(p_phone), ''), phone),
    updated_at = NOW()
  WHERE id = v_user_id
    AND role != 'admin';  -- never downgrade an admin

  -- Check if profile already exists
  SELECT id INTO v_existing_profile_id
  FROM public.provider_profiles
  WHERE user_id = v_user_id;

  IF v_existing_profile_id IS NOT NULL THEN
    -- Update existing profile; force status back to pending if rejected
    UPDATE public.provider_profiles
    SET
      business_name            = TRIM(p_business_name),
      description              = TRIM(p_description),
      categories               = p_categories,
      service_radius_km        = p_service_radius_km,
      doorstep_available       = p_doorstep_available,
      address                  = p_address,
      identity_doc_url         = COALESCE(p_identity_doc_url, identity_doc_url),
      -- Only allow re-submission from rejected state; pending/approved stay as-is
      verification_status      = CASE
                                    WHEN verification_status = 'rejected' THEN 'pending'::verification_status
                                    ELSE verification_status
                                  END,
      application_submitted_at = NOW(),
      rejection_reason         = CASE
                                    WHEN verification_status = 'rejected' THEN NULL
                                    ELSE rejection_reason
                                  END,
      updated_at               = NOW()
    WHERE id = v_existing_profile_id;

    RETURN jsonb_build_object('success', true, 'profile_id', v_existing_profile_id, 'action', 'updated');
  ELSE
    -- Insert new profile — ALWAYS pending, never self-approved
    INSERT INTO public.provider_profiles (
      user_id,
      business_name,
      description,
      categories,
      service_radius_km,
      doorstep_available,
      address,
      identity_doc_url,
      verification_status,
      is_active,
      application_submitted_at
    ) VALUES (
      v_user_id,
      TRIM(p_business_name),
      TRIM(p_description),
      p_categories,
      p_service_radius_km,
      p_doorstep_available,
      p_address,
      p_identity_doc_url,
      'pending',     -- ALWAYS pending — admin must approve
      TRUE,          -- is_active default (active but not verified)
      NOW()
    )
    RETURNING id INTO v_profile_id;

    RETURN jsonb_build_object('success', true, 'profile_id', v_profile_id, 'action', 'created');
  END IF;
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.submit_technician_application FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_technician_application TO authenticated;

-- ============================================================
-- 5. Secure RPC: Get own provider verification status
--    Used by the dashboard gate to check status server-side.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_provider_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  SELECT jsonb_build_object(
    'role', u.role,
    'has_profile', pp.id IS NOT NULL,
    'profile_id', pp.id,
    'verification_status', pp.verification_status,
    'is_active', pp.is_active,
    'business_name', pp.business_name,
    'rejection_reason', pp.rejection_reason,
    'application_submitted_at', pp.application_submitted_at,
    'verified_at', pp.verified_at
  )
  INTO v_result
  FROM public.users u
  LEFT JOIN public.provider_profiles pp ON pp.user_id = u.id
  WHERE u.id = v_user_id;

  RETURN COALESCE(v_result, jsonb_build_object('error', 'user_not_found'));
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_provider_status FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_provider_status TO authenticated;

-- ============================================================
-- 6. Index for fast verification status lookups
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_provider_profiles_is_active
  ON public.provider_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_user_active
  ON public.provider_profiles(user_id, verification_status, is_active);
