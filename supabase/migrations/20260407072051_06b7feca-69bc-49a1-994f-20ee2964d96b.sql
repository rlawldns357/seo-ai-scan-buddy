-- Add og_image column to blog_posts
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS og_image TEXT;

-- Create storage bucket for OG images
INSERT INTO storage.buckets (id, name, public)
VALUES ('og-images', 'og-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for OG images
CREATE POLICY "OG images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'og-images');

-- Service role can upload OG images
CREATE POLICY "Service role can upload OG images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'og-images');