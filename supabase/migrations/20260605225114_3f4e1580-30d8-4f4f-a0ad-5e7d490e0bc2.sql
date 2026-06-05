
-- social_accounts
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'threads',
  threads_user_id text,
  username text,
  access_token text NOT NULL,
  token_expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.social_accounts TO authenticated;
GRANT ALL ON public.social_accounts TO service_role;

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read social_accounts"
  ON public.social_accounts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages social_accounts"
  ON public.social_accounts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_social_accounts_updated
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- social_publish_queue
CREATE TABLE public.social_publish_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'threads',
  body text NOT NULL,
  media_type text NOT NULL DEFAULT 'TEXT',
  media_url text,
  publish_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ready',
  threads_creation_id text,
  threads_post_id text,
  published_url text,
  error_message text,
  retry_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.social_publish_queue TO authenticated;
GRANT ALL ON public.social_publish_queue TO service_role;

ALTER TABLE public.social_publish_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read social_publish_queue"
  ON public.social_publish_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages social_publish_queue"
  ON public.social_publish_queue FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_social_publish_queue_updated
  BEFORE UPDATE ON public.social_publish_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_social_publish_queue_ready
  ON public.social_publish_queue (platform, status, publish_at)
  WHERE status = 'ready';
