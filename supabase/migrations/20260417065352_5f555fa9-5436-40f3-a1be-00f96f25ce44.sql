ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS faq_short JSONB;

COMMENT ON COLUMN public.blog_posts.faq_short IS 'Short, friendly-tone FAQ items [{q, a}] for accordion below post body';