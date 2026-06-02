---
name: Google AI Search Alignment
description: 점수 엔진과 블로그 생성을 Google Search Central 공식 AI 검색 가이드(2025-2026)에 정합. llms.txt 감점 금지, People-first 우대, E-E-A-T 가중
type: feature
---
# Google 공식 AI 검색 가이드 정합 (절대 룰)

## 점수 엔진 (engine_config.analysis_prompt) — GOOGLE_OFFICIAL_BASELINE 블록
DB 라이브 프롬프트의 `## GOOGLE_OFFICIAL_BASELINE_START ~ END` 블록은 **불변**.
- analyze-site/index.ts FALLBACK_ANALYSIS_PROMPT에도 동일 블록 존재 (이중화)
- update-analysis-engine은 이 블록을 verbatim 보존하도록 가드 추가됨 (네이버 룰북과 동일 메커니즘)

### 6대 원칙
1. **llms.txt/AI 마크업/청킹/AI 재작성 = 필수 아님** → 가점만, 감점 금지, priorityFix로 올리지 말 것
2. **AI 검색 근간 = 기존 SEO + RAG + Query Fan-out** → 신뢰 시그널 가중
3. **People-first / Non-commodity 우대** → 1인칭·실측·고유사례 +5~10, AI 양산형 GEO/AEO 상한 80
4. **E-E-A-T 명시 평가** → 저자/조직/About 페이지 존재 여부 반영
5. **AEO 청킹·Q&A 강제 완화** → FAQPage 강제 priorityFix 금지
6. **scoreRationale 끝에 "구글 공식 가이드: <근거>" 1줄** 추가

## 공식 출처 (engine_config.google_official_refs — 비공개)
- ai-optimization-guide (불필요한 것 리스트)
- appearance/ai-features (AI Overviews = 일반 SEO)
- creating-helpful-content (People-first 자가진단)
- 2025/05 blog: succeeding-in-ai-search
- using-gen-ai-content (스팸 정책)
- blog.google/.../google-search-ai-mode-update (Query Fan-out)

## 블로그 자동생성 (generate-blog-post)
systemPrompt에 `[Non-commodity (비기성품) 룰]` 블록 주입:
고유 가치 필수, 양산형 금지, 저자성 단서, 공식 출처 우선, Query Fan-out 다층화.

## 자사 UI
- /about: "Google 공식 가이드와의 정합성" + "누가 만들고 운영하나요? (E-E-A-T)" 두 섹션
- /: 히어로 서브헤드 아래 "Google Search Central 공식 AI 검색 가이드(2026) 정합" 배지
