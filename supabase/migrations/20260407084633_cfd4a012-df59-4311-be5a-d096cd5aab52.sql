-- Clean up failed blog posts with wrong year or unpublished status
DELETE FROM public.blog_posts 
WHERE published = false 
AND (slug LIKE '%2024%' OR slug LIKE '%2025%' OR length(content) < 3000);