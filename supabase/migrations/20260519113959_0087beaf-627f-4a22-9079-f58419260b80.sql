UPDATE public.blog_posts
SET content = regexp_replace(
  content,
  '\(/blog/[^)]*[가-힣][^)]*\)',
  '(/blog)',
  'g'
)
WHERE content ~ '\(/blog/[^)]*[가-힣]';