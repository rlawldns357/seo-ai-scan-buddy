# CRD: 자동 발행 콘텐츠 점수 시스템

> Status: **Proposed (additive, not yet implemented)**
> Owner: SearchTune OS
> Related memory: `mem://features/content-scoring`

## 1. Purpose (목적)
**랭킹 예측이 아닌**, 발행 전후 콘텐츠 품질 판단, 검수 우선순위 정리, 운영 재미 요소 제공.

## 2. Problem
자동/수동 생성된 글이 검색·AI 답변에 실제로 인용될 가능성을 사용자가 모른 채 발행한다.
초안 개선 유인이 약하고, 발행 큐의 우선순위를 정할 근거도 없다.

## 3. Goal
- 발행 전: 초안 점수로 개선을 유도한다.
- 발행 후: 재채점으로 최종본 품질을 추적한다.
- 큐: 낮은 점수 글을 먼저 다듬도록 정렬 옵션을 제공한다.
- 운영 재미: 품질 개선 게이미피케이션, 진척도 가시화.

## 4. Non-goals
- 검색 순위 예측/보장.
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

### 점수 2종 구분 (확정 명명)

**발행 전 — 콘텐츠 준비 점수 (Content Readiness Score)**
- 보조 라벨: **검수 추천 점수** (Review Priority Score) — 큐 정렬 컨텍스트 한정
- 시점: 초안 생성 직후
- 용도: 발행 전 개선 방향 제시, 검수 우선순위 정렬
- 저장 필드: `draft_score` (jsonb)
- 영문 변수: `readinessScore` / `reviewPriorityScore`

**발행 후 — 콘텐츠 성장 점수 (Content Growth Score)**
- 보조 라벨: **성과 건강도** (Performance Health) — 대시보드/추세 컨텍스트
- 시점: 발행 직후 재채점 (+ 추후 주기적 갱신 여지)
- 용도: 최종본 품질 추적, 초안 대비 개선 효과(Δ) 측정
- 저장 필드: `published_score` (jsonb), `score_updated_at`
- 영문 변수: `growthScore` / `performanceHealth`

> **상위 우산 명칭**은 여전히 "콘텐츠 품질 점수" (Content Quality Score). 두 점수 모두 그 하위 시점별 표현이다.

## 5. Lifecycle
1. **Readiness scored (콘텐츠 준비 점수)** — `generate-content-draft` 응답에 `score` 포함 → `draft_score` 저장.
2. **Growth rescored (콘텐츠 성장 점수)** — `status: published` 전이 시 `publish-site-post`가 백그라운드로 재채점 → `published_score`, `score_updated_at` 갱신.
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

### 7.1 노출 원칙: 총점만 보여주지 않는다
모든 점수 노출 지점은 다음 3계층을 함께 제공해야 한다.

1. **총점 (Headline Score)** — 0~100, 시점 라벨(준비/성장) + 색상 상태.
2. **세부 항목 (Breakdown)** — SEO·AEO·GEO 3축 점수 + 각 축의 *왜 깎였는지* 한 줄 사유.
   - 예: `AEO 62 — 도입부에 직접 답변 문장이 없습니다.`
   - 캡 적용 시 사유에 명시: `(캡 적용: 직접 답변 부재)`
3. **액션 제안 (Actionable Tips)** — 사용자가 바로 실행 가능한 제안 1~3개.
   - 형식: `[축] 행동 동사로 시작 + 구체 위치/예시`
   - 예: `[AEO] 첫 문단을 "결론부터: ..." 1~2문장으로 다시 써보세요.`
   - 예: `[GEO] 본문에 출처 링크 1개 이상 추가 (현재 0개).`
   - 예: `[SEO] H2를 5개로 줄이고 핵심 키워드를 H2에 1회 포함.`

**축출 데이터 모델 (확장)**
```ts
type AxisDetail = { score: number; reason: string; capped?: boolean };
type ActionTip   = { axis: 'seo'|'aeo'|'geo'; action: string; impact?: 'high'|'med'|'low' };
type ContentScore = {
  total: number;                 // 0~100 가중 평균
  seo: AxisDetail;
  aeo: AxisDetail;
  geo: AxisDetail;
  summary: string;               // 1~2문장 총평
  tips: ActionTip[];             // 최대 3개, impact 내림차순
};
```
이 구조는 `draft_score` / `published_score` jsonb에 그대로 저장한다.

**노출 컨텍스트별 표시량**
| 컨텍스트 | 총점 | 세부 항목 | 액션 제안 |
|---|---|---|---|
| AutoPublish 큐 배지 | ✅ | 가장 낮은 축만 1줄 | 0개 (호버/탭 시 1개) |
| Content 초안 카드 | ✅ | 3축 모두 + 사유 | 최대 2개 (high/med) |
| Content 상세/모달 | ✅ | 3축 + 캡 사유 | 최대 3개 (전체) |
| 발행 후 토스트 | ✅ + Δ | Δ가 가장 큰 축 1줄 | 0개 |

**액션 제안 작성 규칙 (AI 프롬프트)**
- 한국어, 명령형/권유형. ("~해보세요", "~를 추가하세요")
- "검색 순위 상승" 류 인과 금지. 행위 결과만 ("구조가 명확해집니다").
- 비어있을 수 있다 (100점 = `tips: []`, "검수 권장 항목 없음").

## 8. Naming & Copy (확정)
**명명 규칙 (계층)**
- **상위 우산**: "콘텐츠 품질 점수" (Content Quality Score, `contentQualityScore`) — 시스템 전체 라벨.
- **발행 전**: "콘텐츠 준비 점수" (Content Readiness Score, `readinessScore`)
  - 보조: "검수 추천 점수" (Review Priority Score, `reviewPriorityScore`) — 큐 정렬 한정
- **발행 후**: "콘텐츠 성장 점수" (Content Growth Score, `growthScore`)
  - 보조: "성과 건강도" (Performance Health, `performanceHealth`) — 대시보드/추세 한정
- "SEO 점수" 단독 표기 금지. 세 축은 항상 위 점수의 하위 지표로 표기.

**Copy**
- 발행 전 Headline: **"발행 전에 콘텐츠 준비 점수를 확인하세요."**
- 발행 후 Headline: **"발행 후 콘텐츠 성장 점수가 갱신됐어요."**
- Sub: "SEO·AEO·GEO 세 축을 합쳐 글 한 편의 인용 가능성을 점수화합니다."
- 준비 점수 배지 툴팁: "콘텐츠 준비 점수 — 발행 전 검수 우선순위 (0~100)"
- 성장 점수 배지 툴팁: "콘텐츠 성장 점수 — 발행본 구조 품질 추세 (0~100)"
- 정렬 토글: "검수 추천 순 (낮은 점수 우선)"
- 낮은 준비 점수: "지금 5분만 다듬으면 준비 점수를 올릴 수 있어요."
- 재채점 결과: "성장 점수가 갱신됐어요. 준비 점수 대비 +N점."

**오해 방지 (Anti-misleading) — 필수**
- 금지: "검색 1위", "상위 노출 보장", "순위 상승 점수", "랭킹 점수", "구글 점수", "SEO 보장".
- 권장: "인용 가능성", "검수 우선순위", "콘텐츠 구조 품질", "AI 답변 채택 준비도".
- 모든 점수 노출 옆/툴팁에 고지 1줄 동반: "※ 검색 순위를 보장하지 않습니다. 콘텐츠 구조 품질 지표예요."
- 도움말/모달 긴 형: "이 점수는 글의 구조·답변 명확성·인용 친화도를 평가한 내부 지표입니다. 실제 검색 순위나 트래픽을 보장하지 않으며, 검색 엔진 알고리즘과 무관하게 산정됩니다."
- 100점 = "완벽" 아님. "검수 권장 항목 없음"으로 설명.
- 점수 변화 메시지에 "순위 상승" 류 인과 표현 금지. 행위 결과만 기술("구조가 개선되었어요").
- 최초 1회 info 아이콘으로 긴 형 고지 노출 + dismiss 가능.

## 9. Rollout Order
1. Edge Function `score-content` 신설 (또는 draft 응답 확장).
2. `site_posts` 점수 컬럼 마이그레이션.
3. AutoPublish 큐 배지 + 정렬.
4. Content 초안 점수 카드 + 팁.
5. publish-site-post 재채점 훅.

## 10. Open Questions
- `score-content`를 별도 함수로 분리할지, `generate-content-draft`에 통합할지 (비용 vs 응답 시간 trade-off).
- 재채점은 동기 vs 비동기 (현재안: 비동기, 발행 흐름 차단 금지).
