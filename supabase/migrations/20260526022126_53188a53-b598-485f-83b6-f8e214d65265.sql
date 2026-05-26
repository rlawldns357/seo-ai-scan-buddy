
-- Explicit admin SELECT policies for AI prompt/config history tables
CREATE POLICY "Admins can read engine_update_log"
ON public.engine_update_log
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read autoblog_engine_log"
ON public.autoblog_engine_log
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service_role cleanup of report-pdfs storage objects
CREATE POLICY "Service role can delete report-pdfs"
ON storage.objects
FOR DELETE TO service_role
USING (bucket_id = 'report-pdfs');
