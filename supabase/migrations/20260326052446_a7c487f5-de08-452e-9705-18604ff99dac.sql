DROP POLICY IF EXISTS "Authenticated users can read email leads" ON public.email_leads;

CREATE POLICY "Service role can read email leads"
  ON public.email_leads
  FOR SELECT
  TO public
  USING (auth.role() = 'service_role'::text);