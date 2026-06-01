-- 기존 AI 인식 캐시를 모두 삭제: brand/aliases/category 추출 로직이 바뀌어
-- 과거 캐시(서브도메인 슬러그를 브랜드로 오인한 결과)는 신뢰할 수 없음.
DELETE FROM public.ai_perception_cache;