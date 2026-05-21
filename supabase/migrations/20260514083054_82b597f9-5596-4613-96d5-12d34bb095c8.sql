ALTER TABLE public.rate_limit_config
ADD COLUMN IF NOT EXISTS whitelisted_ips text[] NOT NULL DEFAULT '{}'::text[];