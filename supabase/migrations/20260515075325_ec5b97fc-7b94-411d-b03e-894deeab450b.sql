
CREATE TABLE IF NOT EXISTS public.external_balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  label text,
  used_usd numeric NOT NULL DEFAULT 0,
  limit_usd numeric,
  topup_used_usd numeric NOT NULL DEFAULT 0,
  topup_balance_usd numeric NOT NULL DEFAULT 0,
  period_resets_at timestamptz,
  notes text,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ebs_provider_snapshot
  ON public.external_balance_snapshots (provider, snapshot_at DESC);

ALTER TABLE public.external_balance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read external balance snapshots"
  ON public.external_balance_snapshots FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages external balance snapshots"
  ON public.external_balance_snapshots FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
