DELETE FROM public.ai_perception_cache WHERE url ILIKE '%naver.com%';
DELETE FROM public.naver_store_analysis_cache WHERE created_at > now() - interval '2 days';