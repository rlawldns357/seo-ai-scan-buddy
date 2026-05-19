UPDATE public.blog_posts
SET content = regexp_replace(content, '\(/blog/[^)\s]*\)', '(/blog)', 'g')
WHERE id = '2c3ddf8f-dc0f-46f5-84b0-f4a2edde6878'
  AND content ~ '/blog/[^a-z0-9-]';