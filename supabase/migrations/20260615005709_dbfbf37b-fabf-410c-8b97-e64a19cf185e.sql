DROP TABLE IF EXISTS public._tmp_diag;

GRANT ALL ON public.threads_engine_config TO service_role;
GRANT ALL ON public.threads_engine_chat TO service_role;

CREATE POLICY "Service role can manage threads engine config"
ON public.threads_engine_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage threads engine chat"
ON public.threads_engine_chat
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);