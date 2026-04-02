CREATE TABLE public.consultation_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  site_url text,
  budget text,
  interests text[] DEFAULT '{}',
  concerns text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert consultation requests"
ON public.consultation_requests
FOR INSERT
TO anon
WITH CHECK (
  name IS NOT NULL
  AND char_length(name) >= 1
  AND char_length(name) <= 100
  AND email IS NOT NULL
  AND char_length(email) >= 5
  AND char_length(email) <= 255
  AND email ~ '^[^@]+@[^@]+\.[^@]+$'
);

CREATE POLICY "Service role can manage consultation requests"
ON public.consultation_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);