
-- 1) 분석 프롬프트 v9 → v10: 구글 공식 가이드 베이스라인 추가 (앵커로 보호)
UPDATE public.engine_config
SET
  config_value = E'## GOOGLE_OFFICIAL_BASELINE_START (2026 — 절대 삭제·변경 금지, 모든 채점의 베이스)\n\n'
    || E'본 채점기는 Google Search Central 공식 가이드(2025-2026)와 정합되어야 합니다. 다음 원칙을 절대 위반하지 마세요:\n\n'
    || E'1) **llms.txt / AI 전용 마크업 / 콘텐츠 청킹 / AI용 키워드 재작성은 "필수 아님"**.\n'
    || E'   - 있으면 가점(+소폭), 없다고 감점하지 말 것. SEO/AEO/GEO 어느 축에서도 부재만으로 점수를 깎지 마세요.\n'
    || E'   - 관련 issues/fixes에 "llms.txt 추가 필요" 류 문구를 priorityFix로 올리지 마세요 (선택 보강 항목으로만 표기 가능).\n\n'
    || E'2) **AI 검색의 근간은 기존 SEO(RAG + Query Fan-out)**.\n'
    || E'   - 신뢰 시그널(저자/조직 정보, 출처 인용, 업데이트 일자, HTTPS, 명확한 메타)을 SEO·GEO 양쪽 가중에서 우선 평가.\n'
    || E'   - Query Fan-out 대응 = "한 주제를 다층(개요·비교·실행·사례·FAQ)으로 충실히 다루는 콘텐츠" 가점.\n\n'
    || E'3) **People-first / Non-commodity 콘텐츠 우대**:\n'
    || E'   - 1인칭 경험·실측 수치·고유 사례·전문가 견해가 있는 페이지를 우대 (+5~+10 GEO/AEO).\n'
    || E'   - 일반론·AI 양산형·동어반복 콘텐츠는 GEO/AEO 상한 80으로 제한.\n\n'
    || E'4) **E-E-A-T 명시 평가**:\n'
    || E'   - 저자 정보(Person/Author schema 또는 본문 byline), 조직 정보(Organization), 연락처/About 페이지 존재 여부를 GEO "Brand Authority·Officiality"와 SEO "인덱싱 준비도"에 반영.\n\n'
    || E'5) **AEO 청킹·Q&A 강제 완화**:\n'
    || E'   - FAQ/Q&A 구조가 없어도 "직접 답변 명확성"이 높으면 감점 최소화.\n'
    || E'   - "FAQPage 스키마 필수"로 priorityFix 올리지 말 것. 가점 항목으로만 권고.\n\n'
    || E'6) **scoreRationale 작성 규칙 (반드시 준수)**:\n'
    || E'   - 각 축의 scoreRationale 끝에 한국어로 "구글 공식 가이드: <짧은 근거 1문장>"을 1줄 추가.\n'
    || E'     예) "...개선 여지가 있습니다. 구글 공식 가이드: AI 검색에서도 사용자 중심·신뢰 시그널이 우선됩니다."\n'
    || E'   - 정량 수치를 적을 때만 "공식 문서 기준" 표기 (출처 미상 수치 금지).\n\n'
    || E'## GOOGLE_OFFICIAL_BASELINE_END\n\n'
    || config_value,
  version = version + 1,
  updated_at = now()
WHERE config_key = 'analysis_prompt';

-- 2) 공식 출처 URL 비공개 저장 (UI 노출 X, 채점 근거 자료)
INSERT INTO public.engine_config (config_key, config_value, version)
VALUES (
  'google_official_refs',
  E'[2026-06 기준 Google Search Central 공식/준공식 자료]\n'
  || E'- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide  (필요 없는 것 공식 리스트: llms.txt/청킹/AI재작성)\n'
  || E'- https://developers.google.com/search/docs/appearance/ai-features  (AI Overviews/AI Mode = 일반 SEO와 동일)\n'
  || E'- https://developers.google.com/search/docs/fundamentals/creating-helpful-content  (Helpful/People-first 자가진단)\n'
  || E'- https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search  (AI 검색에서 콘텐츠 성과 권고)\n'
  || E'- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content  (생성형 콘텐츠 가이드, 스팸 정책)\n'
  || E'- https://blog.google/products-and-platforms/products/search/google-search-ai-mode-update/  (AI Mode + Query Fan-out 공식 설명)\n'
  || E'\n핵심 요지:\n'
  || E'1) llms.txt는 필수 아님. AI 마크업·청킹·AI용 재작성도 불필요.\n'
  || E'2) AI 검색 노출의 토대는 기존 SEO + RAG + Query Fan-out.\n'
  || E'3) 사람 우선(People-first), 고유 경험·관점(Non-commodity), E-E-A-T가 핵심.\n'
  || E'4) 생성형 AI 콘텐츠 자체는 OK, 단 가치 없는 양산은 스팸 정책 위반.',
  1
)
ON CONFLICT (config_key) DO UPDATE
SET config_value = EXCLUDED.config_value,
    version = public.engine_config.version + 1,
    updated_at = now();
