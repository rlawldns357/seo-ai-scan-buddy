UPDATE public.blog_posts
SET content = regexp_replace(
  content,
  '(/blog/[a-z0-9-]+)([)"[:space:]])',
  '\1.html\2',
  'g'
)
WHERE content ~ '/blog/[a-z0-9-]+[)"[:space:]]';