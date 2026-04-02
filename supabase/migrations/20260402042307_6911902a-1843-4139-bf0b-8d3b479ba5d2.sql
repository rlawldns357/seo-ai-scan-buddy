-- Create blog_posts table for AI-generated content
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'SEO',
  author TEXT NOT NULL DEFAULT 'SearchTune OS',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  thumbnail TEXT NOT NULL DEFAULT '/placeholder.svg',
  featured BOOLEAN NOT NULL DEFAULT false,
  read_time TEXT NOT NULL DEFAULT '5분',
  content TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published blog posts
CREATE POLICY "Anyone can read published blog posts"
ON public.blog_posts
FOR SELECT
USING (published = true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage blog posts"
ON public.blog_posts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Index for slug lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts (slug);

-- Index for date ordering
CREATE INDEX idx_blog_posts_date ON public.blog_posts (date DESC);