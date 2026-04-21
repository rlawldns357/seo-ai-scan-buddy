# CRD: 자동 발행 콘텐츠 점수 시스템

> Status: **Proposed (additive, not yet implemented)**
> Owner: SearchTune OS
> Related memory: `mem://features/content-scoring`

## 1. Problem
자동/수동 생성된 글이 검색·AI 답변에 실제로 인용될 가능성을 사용자가 모른 채 발행한다.
초안 개선 유인이 약하고, 발행 큐의 우선순위를 정할 근거도 없다.

## 2. Goal
- 발행 전: 초안 점수로 개선을 유도한다.
- 발행 후: 재채점으로 최종본 품질을 추적한다.
- 큐: 낮은 점수 글을 먼저 다듬도록 정렬 옵션을 제공한다.

## 3. Non-goals
- 디자인 시스템 변경.
- 실측 조회수 기반 성과 점수 (추후 별도 과제).
- 사이트 분석 엔진의 채점 기준 변경.

## 4. Scoring Model
| 항목 | 값 |
|---|---|
| 축 | SEO / AEO / GEO (사이트 분석과 동일) |
| 범위 | 0 ~ 100 정수 |
| 모델 | `google/gemini-2.5-flash` via Lovable AI Gateway |
| 결정성 | temperature = 0 |
| 입력 | title, excerpt, content(markdown), source_axis, (옵션) siteUrl |
| 출력 | `{ seo, aeo, geo, summary, tips[≤3] }` |
| 캡 규칙 | 기존 score-caps 재사용 (직접답변 부재 → AEO 캡, 출처 부재 → GEO 캡) |

## 5. Lifecycle
1. **Draft scored** — `generate-content-draft` 응답에 `score` 포함 → `site_posts.draft_score`에 저장(저장 시점은 큐 추가 시).
2. **Published rescored** — `status: published` 전이 시 `publish-site-post`가 백그라운드로 재채점 → `published_score`, `score_updated_at` 갱신.
3. **Failure** — 점수 실패는 발행을 막지 않는다. UI는 "측정 실패" 표기만.

## 6. Data (additive only)
```
site_posts:
  + draft_score        jsonb null
  + published_score    jsonb null
  + score_updated_at   timestamptz null
```
기존 컬럼/RLS 변경 없음. 마이그레이션은 별도 승인 후.

## 7. UI Surface (디자인 변경 없이)
- **Content 페이지**: draft 카드 영역에 3축 미니 점수 + 팁 1~2.
- **AutoPublish 페이지**: 큐 아이템에 점수 배지("AEO 62"), "낮은 점수 우선" 정렬 토글.
- 색상은 score-based-ui-feedback 규칙 재사용 (red <50 / orange 50~74 / blue ≥75).

## 8. Naming & Copy (확정)
**명명 규칙**
- 정식: **"콘텐츠 품질 점수"** (Content Quality Score, `contentQualityScore`) — 종합 라벨.
- 보조: **"검수 추천 점수"** (Review Priority Score, `reviewPriorityScore`) — 큐 정렬 컨텍스트 한정.
- "SEO 점수" 단독 표기 금지. 세 축은 항상 "콘텐츠 품질 점수"의 하위 지표로 표기.

**Copy**
- Headline: **"발행 전에 콘텐츠 품질 점수를 확인하세요."**
- Sub: "SEO·AEO·GEO 세 축을 합쳐 글 한 편의 인용 가능성을 점수화합니다."
- 배지 툴팁: "콘텐츠 품질 점수 — 검색·AI 답변 인용 가능성 (0~100)"
- 정렬 토글: "검수 추천 순 (낮은 점수 우선)"
- 낮은 점수: "지금 5분만 다듬으면 품질 점수를 올릴 수 있어요."
- 재채점: "발행본 품질 점수가 갱신되었어요. 초안 대비 +N점."

## 9. Rollout Order
1. Edge Function `score-content` 신설 (또는 draft 응답 확장).
2. `site_posts` 점수 컬럼 마이그레이션.
3. AutoPublish 큐 배지 + 정렬.
4. Content 초안 점수 카드 + 팁.
5. publish-site-post 재채점 훅.

## 10. Open Questions
- `score-content`를 별도 함수로 분리할지, `generate-content-draft`에 통합할지 (비용 vs 응답 시간 trade-off).
- 재채점은 동기 vs 비동기 (현재안: 비동기, 발행 흐름 차단 금지).
