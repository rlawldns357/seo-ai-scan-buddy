# CRD: 응답 점유율(Answer Share) 측정

> GEO의 핵심 지표 "AI 응답 안에서 내 브랜드/도메인이 인용되는 비율"을 SearchTune OS 진단 라인에 통합.

## 0. 핵심 개념

- **응답 점유율 = (내 도메인이 인용된 응답 수) / (전체 질의 수)**
- 단발성 "한 번 물어보기"가 아니라 **여러 질의 × 여러 엔진**으로 봐야 의미가 있음
- 경쟁사 도메인도 같이 수집해야 "내가 몇 % 차지하는지" 비교 가능

## 1. 일회성 도구 vs 지속 추적 — 결론

**일회성으로는 의미가 약하다.** 이유:

1. 한 번 물어본 결과는 노이즈가 큼 (같은 질문도 엔진이 매번 다르게 답함)
2. "점유율"이라는 단어 자체가 시계열을 전제 (주차별 추이가 핵심 가치)
3. AI 엔진 호출 비용이 비싸서 무료 진단에 매번 끼우기 부담

**그렇다고 본 진단에 못 끼우는 것도 아님.** 절충안:

### 권장 UX: "응답 점유율 스냅샷" 버튼 + 모달
- 진단 결과 GEO 카드 안에 **"응답 점유율 측정하기"** 버튼
- 클릭 → 모달 오픈
  - 추적할 질의 3~5개 자동 추천 (사이트 컨텍스트 기반, 수정 가능)
  - 측정할 엔진 선택 (ChatGPT/Perplexity/Claude/Gemini)
  - "측정 시작" → 30~60초 로딩 → 점유율 % + 인용된 경쟁 도메인 Top 5
- 로그인 사용자만, 또는 이메일 입력 후 1회 가능 (크레딧 보호)
- 결과는 `analysis_history`에 붙여서 PDF 리포트에도 포함

## 2. 크레딧/비용 추정

질의 1개 × 엔진 4개 = 호출 4회. 질의 5개면 20회.

| 엔진 | 모델 | 1회 비용 | 5질의×1엔진 |
|---|---|---|---|
| ChatGPT | gpt-5-mini | ~$0.005 | ~$0.025 |
| Perplexity | sonar | ~$0.005 | ~$0.025 |
| Claude | sonnet | ~$0.015 | ~$0.075 |
| Gemini | 2.5-flash | ~$0.002 | ~$0.010 |
| **합계 (5질의×4엔진)** | | | **~$0.135 (₩180)** |

→ **무료 1회는 감당 가능, 무한 반복은 불가.** Lite 티어부터 월 N회로 제한 권장.

## 3. 단계별 구현 (Phase)

### Phase 1 — 스냅샷 모달 (MVP, 1~2일)
- Edge Function: `measure-answer-share`
  - input: `{ url, brand, queries[], engines[] }`
  - 각 엔진에 병렬 호출, 응답 텍스트에서 도메인 정규식 추출
  - output: `{ shareRatio, mentions[], competitorDomains[], byEngine{} }`
- 기존 `probe-ai-perception` 함수를 멀티 질의로 확장 재사용
- UI: `AIPerceptionCard` 하단에 "응답 점유율 측정" 버튼 → `AnswerShareModal`
- 비용 로깅: `api_cost_log`에 `function_name='measure-answer-share'`로 기록
- Rate limit: IP당 일 1회 (이메일 입력 시 +2회)

### Phase 2 — 키워드 셋 등록 + 주간 자동 측정 (Lite 티어+, 1주)
- 신규 테이블: `answer_share_keywords`, `answer_share_results`
- pg_cron 주 1회 측정 → 추이 그래프
- 대시보드에 "응답 점유율 추이" 위젯

### Phase 3 — 경쟁사 점유율 비교 (Pro 티어+, 1주)
- 경쟁 도메인 자동 발견 (응답에서 자주 나오는 도메인 클러스터링)
- "내 점유율 vs 경쟁사 Top 3" 막대 차트
- 어떤 글이 인용됐는지 URL 역추적

## 4. 데이터 모델 (Phase 2~3용, 미리 설계)

```sql
-- 추적 질의 셋
create table answer_share_keywords (
  id uuid pk,
  user_id uuid,
  site_url text,
  brand text,
  query text,                 -- "카페24 SEO 도구 추천"
  active boolean default true,
  created_at timestamptz
);

-- 측정 결과
create table answer_share_results (
  id uuid pk,
  keyword_id uuid,
  engine text,                -- chatgpt|perplexity|claude|gemini
  measured_at timestamptz,
  brand_mentioned boolean,
  brand_rank smallint,        -- 응답 내 등장 순서
  cited_domains text[],       -- 응답에서 추출된 모든 도메인
  raw_response text,
  cost_usd numeric
);
```

## 5. 결정 사항

- [ ] Phase 1만 먼저 구현할지, 처음부터 Phase 2까지 갈지
- [ ] 무료 사용자 호출 횟수 (제안: IP당 일 1회 × 질의 3개 × 엔진 4개 = ₩100/회)
- [ ] 추적 질의 추천 로직: Gemini로 사이트 요약 → "이 사이트가 답이어야 할 질의 5개" 생성

## 6. 미루기 좋은 이유

지금 SearchTune OS는 **사이트 진단 전용**으로 단순화한 상태. 응답 점유율은 본질적으로 "지속 모니터링" 영역이라 SaaS 색깔이 강함. **현재 단발성 진단 톤에 잘 맞는 건 Phase 1의 1회 스냅샷까지**, Phase 2~3은 별도 SaaS(또는 Pro 티어)로 분리하는 게 자연스러움.
