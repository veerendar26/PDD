-- ============================================================
-- EcoFix — Email Verification & Role Assignment Hardening
-- 0008_email_verification_security.sql
-- ============================================================

-- 1. Ensure handle_new_user() strictly sanitizes roles
--    Clients can never self-assign 'admin' via raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role user_role;
  v_meta_role TEXT;
BEGIN
  v_meta_role := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'customer')));

  -- Only permit 'technician' or 'customer'. Never 'admin'.
  IF v_meta_role = 'technician' THEN
    v_role := 'technician'::user_role;
  ELSE
    v_role := 'customer'::user_role;
  END IF;

  INSERT INTO public.users (id, role, name, email, phone)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = COALESCE(NULLIF(TRIM(EXCLUDED.name), ''), users.name),
    phone = COALESCE(EXCLUDED.phone, users.phone),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Add comment documenting email verification requirement
COMMENT ON TABLE public.users IS 'Authoritative user profiles for EcoFix. Email verification is handled by Supabase Auth (auth.users.email_confirmed_at).';
