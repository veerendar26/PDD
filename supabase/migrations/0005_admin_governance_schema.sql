-- ============================================================
-- EcoFix — Admin Governance & Audit Schema
-- 0005_admin_governance_schema.sql
-- ============================================================

-- 1. Extend provider_profiles with verification & account state metadata
ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Admin Audit Log Table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL, -- e.g. 'technician_approved', 'technician_rejected', 'status_override', 'provider_reassigned'
  target_type  TEXT NOT NULL, -- 'provider_profile', 'booking', 'user', 'category', 'system'
  target_id    UUID,
  details      JSONB NOT NULL DEFAULT '{}',
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy timeline lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- Enable RLS on admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can access admin_audit_logs
CREATE POLICY "admin_audit_logs_admin_only" ON public.admin_audit_logs
  FOR ALL USING (public.get_my_role() = 'admin');

-- 3. Stored RPC: Admin Dashboard Summary Analytics
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is admin
  IF public.get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Admins only';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.users),
    'total_customers', (SELECT count(*) FROM public.users WHERE role = 'customer'),
    'total_technicians', (SELECT count(*) FROM public.users WHERE role = 'technician'),
    'pending_verifications', (SELECT count(*) FROM public.provider_profiles WHERE verification_status = 'pending'),
    'active_technicians', (SELECT count(*) FROM public.provider_profiles WHERE verification_status = 'approved' AND is_active = TRUE),
    'rejected_technicians', (SELECT count(*) FROM public.provider_profiles WHERE verification_status = 'rejected'),
    'total_bookings', (SELECT count(*) FROM public.bookings),
    'active_repairs', (SELECT count(*) FROM public.bookings WHERE status IN ('assigned', 'diagnosis', 'awaiting_approval', 'in_repair', 'quality_check')),
    'completed_repairs', (SELECT count(*) FROM public.bookings WHERE status = 'completed'),
    'cancelled_repairs', (SELECT count(*) FROM public.bookings WHERE status = 'cancelled'),
    'total_gmv', COALESCE((SELECT SUM(amount) FROM public.payments WHERE status = 'paid'), 0),
    'total_warranties_active', (SELECT count(*) FROM public.warranties WHERE expires_at > NOW()),
    'avg_rating', COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews), 0.0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
