-- site_identity: 7-day cache of authoritative site identity (brand/aliases/category/description)
CREATE TABLE public.site_identity (
  host TEXT PRIMARY KEY,
  brand TEXT,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,
  description_short TEXT,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'page_signal',
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_identity TO authenticated;
GRANT ALL ON public.site_identity TO service_role;

ALTER TABLE public.site_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read site_identity"
  ON public.site_identity FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages site_identity"
  ON public.site_identity FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_site_identity_expires_at ON public.site_identity(expires_at);

CREATE TRIGGER trg_site_identity_updated_at
  BEFORE UPDATE ON public.site_identity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- identity_audit_log: trail of every identity decision across functions
CREATE TABLE public.identity_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host TEXT NOT NULL,
  stage TEXT NOT NULL,
  function_name TEXT,
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(4,3),
  source TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.identity_audit_log TO authenticated;
GRANT ALL ON public.identity_audit_log TO service_role;

ALTER TABLE public.identity_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read identity_audit_log"
  ON public.identity_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages identity_audit_log"
  ON public.identity_audit_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_identity_audit_log_host_created ON public.identity_audit_log(host, created_at DESC);
CREATE INDEX idx_identity_audit_log_created_at ON public.identity_audit_log(created_at DESC);