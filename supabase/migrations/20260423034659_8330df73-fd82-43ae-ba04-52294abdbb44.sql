-- 1. app_role enum
CREATE TYPE public.app_role AS ENUM ('free', 'beta', 'lite', 'pro', 'studio', 'admin');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'free',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role security definer (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 4. get_user_tier (returns highest tier)
CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY CASE role
    WHEN 'admin' THEN 6
    WHEN 'studio' THEN 5
    WHEN 'pro' THEN 4
    WHEN 'lite' THEN 3
    WHEN 'beta' THEN 2
    WHEN 'free' THEN 1
  END DESC
  LIMIT 1
$$;

-- user_roles RLS policies
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages user_roles"
ON public.user_roles FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- 5. regeneration_credits table
CREATE TABLE public.regeneration_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  monthly_quota INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  addon_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regeneration_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credits"
ON public.regeneration_credits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages credits"
ON public.regeneration_credits FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_regeneration_credits_updated_at
BEFORE UPDATE ON public.regeneration_credits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. regeneration_log (Fair Use monitoring)
CREATE TABLE public.regeneration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.site_posts(id) ON DELETE SET NULL,
  tier app_role NOT NULL,
  cost_credits INTEGER NOT NULL DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_regen_log_user_date ON public.regeneration_log (user_id, created_at DESC);

ALTER TABLE public.regeneration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own regen log"
ON public.regeneration_log FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all regen log"
ON public.regeneration_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages regen log"
ON public.regeneration_log FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- 7. beta_waitlist
CREATE TABLE public.beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  site_url TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_beta_waitlist_email ON public.beta_waitlist (lower(email));

ALTER TABLE public.beta_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can join beta waitlist"
ON public.beta_waitlist FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND char_length(email) BETWEEN 5 AND 255
  AND email ~ '^[^@]+@[^@]+\.[^@]+$'
);

CREATE POLICY "Admins can read beta waitlist"
ON public.beta_waitlist FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages beta_waitlist"
ON public.beta_waitlist FOR ALL
TO service_role
USING (true) WITH CHECK (true);