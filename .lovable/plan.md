
# AI 인식 미리보기 (AI Perception Preview)

GEO 점수의 "증거화" — 진짜 AI가 당신 브랜드를 어떻게 답하는지를 결과 화면 **최상단에 펼쳐서** 노출. 기존 "원인 분석"은 접힘 기본.

## 0. 결과 화면 레이아웃 변경

```text
[기존]
┌ 점수 게이지 ──────────────┐
├ 원인 분석 (펼침 기본) ────┤  ← 닫힘 기본으로 변경
└ 개선 액션 ────────────────┘

[변경 후]
┌ 점수 게이지 ──────────────┐
├ 🤖 AI 인식 미리보기 ──────┤  ← 신규, 펼침 기본
│   (6대 브랜드 매트릭스)    │
├ 원인 분석 (닫힘 기본) ────┤  ← 클릭 시 펼침
└ 개선 액션 ────────────────┘
```

- AI 인식 카드가 점수 바로 아래 = "AI가 당신 모름" → 점수 정당화 즉시 체감
- 원인 분석은 "더 알아보기" 식으로 접근 (한 번 클릭해야 펼침)
- 모바일도 동일 순서, Internal Expansion 패턴 유지

## 1. 브랜드 매트릭스 (6대)

| 브랜드 | 측정 방식 | 무료 노출 | 비용/콜 | 비고 |
|---|---|---|---|---|
| **ChatGPT** | OpenAI gpt-5-mini + web_search 툴 | ✅ | ~$0.04 | 진짜 ChatGPT 경험 |
| **Claude** | Anthropic claude-sonnet | ✅ | ~$0.015 | 학습컷오프 기반 |
| **Gemini** | Lovable AI Gateway | ✅ | 무료 | grounding 옵션 |
| **Perplexity** | sonar-pro (보유) | ✅ | ~$0.01 | citations로 추천 노출 입증 |
| **Bing/Copilot** | ⚠️ 공식 API 없음 | "🔒 곧 지원" 배지 | - | 자리는 표시, 진정성 ↑ |
| **Naver Cue:** | ⚠️ 공식 API 없음 | "🔒 곧 지원" 배지 | - | 한국 사이트한정 후크 |

→ 측정 가능한 4개는 진짜 답변, 안되는 2개는 솔직하게 lock 표시. 가짜 시뮬레이션 절대 ❌.

## 2. 질의 세트 (브랜드당 2콜)

1. **인지도**: `"{도메인} / {브랜드명}이 뭐 하는 곳이야? 모르면 모른다고 답해."`
2. **추천 노출**: `"{카테고리}에서 추천할 만한 곳 3~5개 알려줘"` → 답변에 내 도메인/브랜드명 포함 여부 체크

→ 4모델 × 2콜 = **8콜, 약 ₩90~120/분석**, 24h 캐시 적용 시 1/5

## 3. UI (결과 화면 점수 바로 아래, 풀폭)

```text
┌─ 🤖 지금 AI는 당신을 이렇게 봅니다 ───────────┐
│  ChatGPT     ✅ 인지   △ 추천 0/5            │
│  Claude      ❌ 모름                          │
│  Gemini      ✅ 인지   ✅ 추천 2/5            │
│  Perplexity  ❌ 인용 0/8                     │
│  Bing        🔒 곧 지원                       │
│  Naver Cue:  🔒 곧 지원                       │
│                                               │
│  → 4개 AI 중 1곳에서만 추천됨                │
│  [전체 답변 펼쳐 보기] (이메일 잠금 — Phase 2)│
└───────────────────────────────────────────────┘
```

- 펼침 기본 (collapsed=false)
- 각 행 클릭 → 실제 AI 답변 전문 펼침
- 측정 불가 행: lock 아이콘 + 회색
- 모바일: 6 카드 세로 (Internal Expansion)

## 4. 단계적 출시 (퍼널 + 유료화 레버)

| Phase | 노출 | 게이트 | 목적 |
|---|---|---|---|
| **1 (지금)** | 4브랜드 풀공개, 답변 전문도 무료 | 없음 | 바이럴/스크린샷 공유 유도 |
| **2 (1~2주 후)** | 요약 ✅❌만 무료, 답변 전문은 이메일 잠금 | 이메일 | 리드 수집 |
| **3 (트래픽 검증 후)** | 재측정/심층 = 유료 (Lite ₩4,900~) | 결제 | 전환 |

## 5. 비용 방어

- **24h 도메인 캐싱**: `ai_perception_cache(url, results jsonb, expires_at)`
- **IP 레이트리밋**: 기존 3회/일 라인 통합
- **타임아웃 8s/모델, 병렬 호출**, 한 모델 실패해도 나머지 표시
- **실패 = "측정 실패" 배지** (가짜 답변 ❌)

## 6. 구현 단계

```text
M1  DB: ai_perception_cache 테이블
M2  API 키 추가: OPENAI_API_KEY, ANTHROPIC_API_KEY
M3  Edge Function: probe-ai-perception
    - 캐시 hit 즉시 반환 / 미스 시 4모델 병렬
    - Promise.allSettled, 8s 타임아웃
    - 도메인/브랜드명 정규식 매칭으로 인지/추천 판정
    - 결과 캐시 + 반환
M4  프론트: AIPerceptionCard (점수 바로 아래 풀폭)
    - 데스크톱 6행 표, 모바일 카드
    - 펼침 기본
M5  결과 화면 통합
    - AIPerceptionCard 삽입
    - 기존 원인 분석 섹션 = collapsed 기본 (defaultOpen=false)
M6  분석 트래킹: ai_perception_shown / brand_clicked / cause_analysis_opened
```

## 7. 기술 메모

- ChatGPT 진짜 경험 = `gpt-5-mini` + Responses API `tools: [{type: "web_search_preview"}]`
- Claude `web_search` 툴 베타 — 일단 학습컷오프 기반
- 도메인 매칭: `www.` strip, query/hash 무시, 호스트 normalize
- Naver/Bing 자리는 lock 배지로 채워서 매트릭스 완성도 ↑

## 8. 메모리 영향

- `geo-scoring-strategy`, `aeo-geo-concepts` 보강
- 신규 메모: `ai-perception-preview` (브랜드 매트릭스, 캐시 정책, Phase, **결과화면 노출 순서: 점수 → AI 인식(펼침) → 원인 분석(닫힘) → 개선**)

## 9. 비반영

- Naver/Bing 시뮬레이션 ❌
- GEO 점수 산정 로직 변경 ❌ (점수는 그대로, 증거만 추가)
- 호출당 결제 ❌ (Phase 3 전까지 무료)
