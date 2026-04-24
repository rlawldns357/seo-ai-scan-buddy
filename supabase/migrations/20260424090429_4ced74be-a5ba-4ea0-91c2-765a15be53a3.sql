-- Subscriptions table — populated by Paddle webhook handler.
-- One row per Paddle subscription. Sandbox + live coexist; always filter by environment.
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','live')),

  -- Human-readable IDs (set via importMeta.externalId in Paddle).
  product_id text,
  price_id text,

  status text NOT NULL CHECK (status IN ('active','trialing','past_due','paused','canceled')),
  paddle_subscription_id text NOT NULL,
  paddle_customer_id text,

  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,

  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (paddle_subscription_id, environment)
);

CREATE INDEX subscriptions_user_env_idx
  ON public.subscriptions (user_id, environment, status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Helper: is the user actively subscribed in the given environment?
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid, _env text DEFAULT 'live')
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = _user_id
      AND environment = _env
      AND status IN ('active','trialing','past_due')
      AND (current_period_end IS NULL OR current_period_end > now())
  )
$$;

-- Realtime so the client can react to webhook-driven changes.
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;