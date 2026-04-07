CREATE POLICY "Anyone can read engine config version"
ON public.engine_config
FOR SELECT
TO public
USING (true);