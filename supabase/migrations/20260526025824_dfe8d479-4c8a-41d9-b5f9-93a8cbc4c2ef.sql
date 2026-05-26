DROP POLICY IF EXISTS "Anyone can upload report PDFs" ON storage.objects;

CREATE POLICY "Anyone can upload report PDFs (UUID-named only)"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'report-pdfs'
  AND name ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.pdf$'
  AND (octet_length(COALESCE(metadata->>'size','0')::text) < 20)
  AND COALESCE((metadata->>'size')::bigint, 0) <= 10485760
);