# 응답 점유율 측정 — 1클릭 통합 (Phase 1)

기존 SearchTune 진단 결과 페이지에 **"AI 응답 점유율 측정"** 버튼 하나만 추가. 사용자가 브랜드/경쟁사/질문을 직접 입력하지 않고, 진단 데이터로 **전부 자동 추출**. 결과는 모달로 즉시 표시. 셋업 페이지/대시보드/프로젝트 개념 없음.

## 1. UX 흐름

```
[진단 완료] → GEO 카드 하단
              ┌─────────────────────────────────┐
              │ ⚡ AI 응답 점유율 측정하기        │  ← 버튼
              │ ChatGPT/Perplexity가 당신을      │
              │ 얼마나 추천하는지 확인           │
              └─────────────────────────────────┘
                         ↓ 클릭
              ┌─────────────────────────────────┐
              │ [측정 중...] 30~60초              │
              │  · 질문 5개 자동 생성            │
              │  · 4개 AI 엔진에 동시 질의       │
              │  · 응답 분석 중                  │
              └─────────────────────────────────┘
                         ↓ 완료
              ┌─────────────────────────────────┐
              │ [응답 점유율 결과 모달]           │
              │                                   │
              │ 응답 점유율    20%  ▓▓░░░       │
              │ 1순위 점유율    5%  ▓░░░░       │
              │ 인용 점유율     5%  ▓░░░░       │
              │                                   │
              │ 경쟁사 대비:                      │
              │  Profound  ████████ 40%          │
              │  Semrush   █████    25%          │
              │  당신       ▓▓      10%          │
              │                                   │
              │ 미노출 질문 (3개):                │
              │  · GEO 진단 툴 추천              │
              │  · AI 검색 최적화 방법           │
              │  · ...                            │
              │                                   │
              │ [PDF에 포함] [공유] [닫기]        │
              └─────────────────────────────────┘
```

추가 페이지/네비게이션 없음. 측정 가능 횟수만 게이팅:
- 무료: IP당 일 1회
- 이메일 입력: +2회
- 로그인 사용자: 별도 한도

## 2. 자동 추출 로직 (셋업 제거)

진단 결과에 이미 들어있는 데이터에서 측정 입력값 자동 생성:

| 입력값 | 어디서 가져오나 |
|---|---|
| **브랜드명** | 사이트 메타데이터 `og:site_name` / title 추출 |
| **도메인** | 진단 URL의 호스트 |
| **별칭** | title 파싱 + 한/영 변형 (예: "서치튠" ↔ "SearchTune") |
| **경쟁사** | 진단 시 추출된 카테고리 + Gemini로 "이 카테고리 한국 경쟁 브랜드 5개" 생성 |
| **카테고리** | 진단 결과의 `category` 필드 |
| **질문 5개** | Gemini가 사이트 요약 보고 "이 사이트가 답이어야 할 질문 5개" 생성. **브랜드명 절대 포함 금지** (프롬프트에 강제) |

→ 사용자가 보는 건 "측정 시작" 버튼 하나뿐.

## 3. 백엔드

### 신규 Edge Function: `measure-answer-share`
- input: `{ url, brand, domain, aliases[], competitors[], queries[] }` (모두 자동 채움)
- 처리:
  1. 4개 엔진 병렬 호출 (질문당) — Perplexity sonar / OpenAI gpt-5-mini (web search) / Gemini 2.5 flash / Claude haiku
  2. **질의 프롬프트는 순수 질문만** ("Answer naturally in Korean. {query}") — 브랜드명/경쟁사명 절대 포함 금지
  3. 응답 텍스트 받으면 → Gemini로 분석 (구조화 추출: brand_mentioned/position/citation/competitor_mentions)
  4. 점유율 4종 계산
- output: `{ responseShare, citationShare, firstMentionShare, competitorShare{}, missedQueries[], byEngine{}, byQuery[] }`
- 비용: `api_cost_log`에 기록 (function_name='measure-answer-share')
- 타임아웃: 90초

### Rate Limit
기존 `check-rate-limit` 로직 재사용. 별도 카운터 키 `answer-share`로 IP/이메일별 1일 한도 적용.

## 4. 데이터 모델 (최소)

대시보드/프로젝트 없으니 4개 테이블이 아니라 **1개 테이블로 충분**:

```sql
CREATE TABLE answer_share_results (
  id uuid PK,
  url text NOT NULL,            -- 측정 대상 URL
  brand text NOT NULL,
  ip_address text,              -- rate limit용
  email text,                   -- 이메일 입력시
  response_share numeric,       -- %
  citation_share numeric,
  first_mention_share numeric,
  avg_brand_position numeric,
  competitor_share jsonb,       -- {Profound: 40, Semrush: 25, ...}
  missed_queries jsonb,         -- [...질문 텍스트]
  queries_used jsonb,           -- 사용한 질문 5개 (재현용)
  by_engine jsonb,              -- {chatgpt: {...}, perplexity: {...}, ...}
  by_query jsonb,               -- 질문별 raw 결과
  cost_usd numeric,
  created_at timestamptz
);
```

- RLS: `Anyone can insert` (URL/brand 길이 검증), `Service role can read all` — `analysis_history`와 동일 패턴
- 같은 URL이면 이전 결과 캐시 → 모달 열 때 "이전 측정 결과 보기" 표시 가능 (Phase 1.5)

## 5. 비용/크레딧

질문 5개 × 엔진 4개 = 호출 20회 + 분석용 Gemini 5회 ≈ **₩200/회**

- 무료 1회/일: 월 1000명이면 ₩200,000/월 — 감당 가능
- 무한 반복은 막아야 함 → rate limit 필수
- PDF 리포트에 포함되면 보고서 가치 ↑ (전환에도 도움)

## 6. 프론트 변경

| 파일 | 변경 |
|---|---|
| `src/components/ResultHeader.tsx` 또는 GEO 카드 | "응답 점유율 측정" 버튼 추가 |
| `src/components/AnswerShareModal.tsx` (신규) | 측정 중 로딩 + 결과 표시 모달 |
| `src/lib/answerShare.ts` (신규) | Edge Function 호출 래퍼 |
| `src/lib/generateReportPdf.ts` | 측정 결과 있으면 PDF에 섹션 추가 |
| `src/lib/analytics.ts` | `answer_share_measure_*` 이벤트 추적 |

## 7. 범위에서 제외 (의식적으로 미룸)

- ❌ Setup 페이지, 프로젝트 개념, 별도 대시보드
- ❌ 추적 질의 직접 입력/편집
- ❌ 주간 자동 측정, 추이 그래프
- ❌ 경쟁사 직접 입력 (전부 자동)
- ❌ 로그인 필수 (무료 IP rate limit으로 보호)

이건 전부 반응 좋으면 Phase 2(별도 SaaS 라인이나 Lite 티어+)로.

## 8. 구현 순서

1. **테이블 생성** (`answer_share_results` 마이그레이션)
2. **Edge Function** `measure-answer-share` 작성 (자동 추출 + 측정 + 분석)
3. **`AnswerShareModal` 컴포넌트** + 로딩 UI
4. **GEO 카드/결과 헤더에 버튼 추가**
5. **Rate limit 통합** (기존 `check-rate-limit` 키 추가)
6. **분석 추적** 이벤트
7. **PDF 통합** (선택, 별도 단계)

## 9. 결정 필요한 부분

1. 무료 한도: IP당 일 1회로 충분한지, 아니면 처음부터 이메일 입력 후만 허용할지
2. 엔진 4개 전부 vs Perplexity+OpenAI 2개만 (비용 절반)
3. 버튼 위치: GEO 카드 안 vs 결과 페이지 상단 vs 사이드바
