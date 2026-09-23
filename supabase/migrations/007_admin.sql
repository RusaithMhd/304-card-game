-- ============================================================================
-- 007: ADMIN ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read admin roles"
  ON public.admin_roles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));
