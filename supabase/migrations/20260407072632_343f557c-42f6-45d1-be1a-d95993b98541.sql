-- Create storage bucket for report PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-pdfs', 'report-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Report PDFs are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'report-pdfs');

-- Anon can upload report PDFs
CREATE POLICY "Anyone can upload report PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'report-pdfs');