ALTER TABLE public.site_posts DROP CONSTRAINT IF EXISTS site_posts_status_check;
ALTER TABLE public.site_posts ADD CONSTRAINT site_posts_status_check
  CHECK (status = ANY (ARRAY['idea'::text, 'draft'::text, 'scheduled'::text, 'published'::text, 'archived'::text]));