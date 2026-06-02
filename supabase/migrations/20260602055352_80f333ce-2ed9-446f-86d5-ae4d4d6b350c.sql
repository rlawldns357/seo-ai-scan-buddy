
UPDATE public.engine_config
SET
  config_value = '[2026-06 기준 Google Search Central 공식/준공식 자료 — v10.5 통합본]
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?hl=ko  (필요 없는 것 공식 리스트: llms.txt/청킹/AI재작성)
- https://developers.google.com/search/docs/appearance/ai-features?hl=ko  (AI Overviews/AI Mode = 일반 SEO와 동일)
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko  (Helpful/People-first 자가진단, E-E-A-T)
- https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search  (AI 검색 성과 권고, RAG 친화)
- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content?hl=ko  (생성형 콘텐츠 가이드, 스팸 정책 = Non-commodity 근거)
- https://blog.google/products-and-platforms/products/search/google-search-ai-mode-update/  (AI Mode + Query Fan-out 공식 설명)
- https://developers.google.com/search/docs/essentials?hl=ko  (Search Essentials — 기본 SEO 토대)

핵심 요지:
1) llms.txt는 필수 아님. AI 마크업·청킹·AI용 재작성도 불필요.
2) AI 검색 노출의 토대 = 기존 SEO + RAG + Query Fan-out.
3) People-first, Non-commodity(고유 경험·관점), E-E-A-T가 핵심.
4) 생성형 AI 콘텐츠 자체는 OK, 단 가치 없는 양산은 스팸 정책 위반.',
  version = version + 1,
  updated_at = now()
WHERE config_key = 'google_official_refs';
