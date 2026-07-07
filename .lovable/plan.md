# AEO 데일리 트래커 + 오토블로그 SEO 극대화 구현 계획

## 현황 요약
- **DB 마이그레이션 완료**: `aeo_prompts`, `aeo_check_results`, `aeo_daily_scores` 3개 테이블 + 시드 프롬프트 20개 이미 반영됨.
- **오토블로그 기존 자산 파악 결과**:
  - `generate-blog-post`: 발행 성공 시 `submit-indexnow` 호출 → IndexNow(Bing/Naver) 이미 동작. Inblog 미러링도 붙어있음.
  - `sitemap` edge function + `public/sitemap.xml` / `sitemap-pages.xml` / `sitemap-posts.xml` / `rss` edge function / `public/llms.txt` **모두 존재**.
  - `robots.txt`에 GPTBot/PerplexityBot/ClaudeBot/OAI-SearchBot/Google-Extended Allow 이미 설정.
  - JSON-LD: Article/FAQ 스키마는 이미 `BlogPost.tsx` / 프리렌더링 파이프라인에 존재. Breadcrumb만 점검 필요.
  - 팩트체크 레이어(`QUALITY_PASS_THRESHOLD=70`, `MAX_QUALITY_RETRIES=0`)는 재시도 0으로 사실상 off. 재활성 검토 대상.
- **가용 AI 엔진(웹 검색 grounding 관점)**:
  - `PERPLEXITY_API_KEY` ✅ (native web search — sonar/sonar-pro)
  - `OPENAI_API_KEY` ✅ (Responses API `web_search_preview` tool)
  - `ANTHROPIC_API_KEY` ✅ (Claude `web_search` tool, 2025년 GA)
  - Gemini는 Lovable AI Gateway 경유 시 grounding 지원 불확실 → **초기 3개 엔진만 사용** 권장.

---

## Phase A — AEO 트래커 Edge Function

### A1. `aeo-run-check` (핵심 실행기)
- 입력: `{ mode: "canary" | "daily", promptIds?: uuid[], dryRun?: boolean }`
- 동작:
  1. `aeo_prompts` 활성 항목 로드 (canary는 `promptIds` 지정 or `is_canary=true` 3~5개).
  2. 3개 엔진 병렬 호출:
     - **Perplexity**: `sonar-pro`, 검색 강제.
     - **OpenAI**: `gpt-5.5` + `tools: [{type:"web_search_preview"}]`.
     - **Anthropic**: `claude-sonnet-4` + `web_search` tool.
  3. 각 응답에서 다음 파싱 (동일 판정 함수로 통일):
     - `brand_mentioned`: /searchtune|서치튠|searchtuneos\.com/i 매칭
     - `mention_rank`: 응답 내 첫 등장 위치 기준 1~N 순위(경쟁 브랜드 목록과 대비)
     - `sentiment`: 별도 LLM(Gemini 2.5 flash) 소형 프롬프트로 긍정/중립/부정 분류
     - `accuracy`: 브랜드 설명 정확성(설명 없음/부정확/정확) — Gemini로 3-class 판정
     - `excerpt`: 브랜드 언급 전후 200자
     - `citations`: 반환된 소스 URL 배열
  4. `aeo_check_results` upsert (unique on `(check_date, engine, prompt_id)`).
  5. 하루치 저장 후 A2 호출.

### A2. `aeo-compute-score` (점수 집계)
- 그 날의 `aeo_check_results` → `aeo_daily_scores` 1행 계산:
  - **Presence** = 브랜드 언급 비율 (0–100)
  - **Position** = 언급된 것만 평균 순위 → `100 - (avg_rank-1) × 20` clamp
  - **Sentiment** = 긍정 100 / 중립 60 / 부정 0 평균
  - **Accuracy** = 정확 100 / 부정확 40 / 설명없음 0 평균
  - **Visibility Score** = `0.4·Presence + 0.25·Position + 0.15·Sentiment + 0.2·Accuracy`
  - 전일 대비 `delta` 저장.

### A3. `aeo-suggest-content` (개선 제안)
- 최근 7일간 Presence=0인 프롬프트 top-N을 뽑아, Gemini에게 "어떤 블로그 제목/각도가 이 질문에 노출되게 하는지" 물어서 결과를 `suggestions` JSON으로 반환. 대시보드에서 on-demand 호출(저장 안 함, 초기엔).

### A4. 비용 가드
- `api_cost_log`에 각 호출 기록. 하루 총액이 `api_cost_budget`의 aeo_daily 항목 초과 시 즉시 중단.

---

## Phase B — 관리자 대시보드 `/admin/aeo-tracker`

`src/pages/admin/AeoTracker.tsx` 신규 (AdminLayout 안, admin 세션 필요):

1. **상단 KPI**: 오늘 Visibility Score + 전일 대비 델타(↑/↓/–), 4개 서브 스코어.
2. **추이 차트**: 최근 30/90일 Visibility Score 라인 차트 (recharts, 이미 사용 중).
3. **프롬프트 테이블**:
   - 컬럼: 프롬프트 | 카테고리 | Presence 7d | Perplexity | OpenAI | Claude | 최근 언급 순위 | 최근 감성 | 개선/악화 화살표 (7d 전과 비교)
   - 각 행 클릭 → 최근 답변 발췌 drawer.
4. **개선점 섹션**: `aeo-suggest-content` 결과 카드 리스트, "블로그 초안 만들기" 버튼 → `generate-blog-post`에 target keyword 전달.
5. **카나리 실행 패널**: 프롬프트 3~5개 체크박스 선택 → "지금 1회 실행" 버튼 → `aeo-run-check?mode=canary`.
6. **프롬프트 관리**: 활성/비활성 토글, 새 프롬프트 추가/수정(모달).

라우팅: `src/App.tsx`에 `/admin/aeo-tracker` 추가, AdminLayout 사이드바에 링크.

---

## Phase C — 크론 (카나리 검증 후에만)

- pg_cron 잡 `aeo-daily-run` — 매일 **00:00 UTC (KST 09:00)** — `aeo-run-check?mode=daily` POST.
- 서비스 롤 키 vault 참조. 별도 secret `AEO_CRON_TOKEN` 검증.
- **활성화는 사용자가 대시보드 카나리에서 결과 확인 후 수동 승인**할 때 별도 SQL로 진행 (본 플랜에는 스케줄 SQL만 준비, 자동 실행 X).

---

## Phase D — 오토블로그 SEO 노출 극대화 (점검 + 갭 메우기)

이미 있는 것과 없는 것을 갈라서 최소한만 손댐:

| 항목 | 상태 | 조치 |
|---|---|---|
| Article JSON-LD | 있음 (BlogPost) | 유지 |
| FAQ JSON-LD | 있음 | 유지 |
| **Breadcrumb JSON-LD** | 미확인 | **BlogPost에 추가**: Home › Blog › {title} |
| OG 메타 | 있음 | 유지 |
| sitemap.xml | 있음 (edge fn) | 발행 시 sitemap fn 캐시 무효화 호출 추가 |
| RSS | 있음 (edge fn) | 위와 동일 |
| llms.txt | public 정적 | **edge function으로 동적화** → 발행 시 최신 20개 반영 |
| IndexNow (Bing/Naver) | **이미 붙어있음** (`submit-indexnow`) | 로그 확인 및 성공률 모니터 카드 대시보드에 추가 |
| GSC 색인 요청 | `check-indexing` 존재 | 발행 즉시 색인 요청 API 호출 여부 확인 후 붙임 |
| 팩트체크 레이어 | `MAX_QUALITY_RETRIES=0` | **재활성**: 1회 재시도 + 임계 미달 시 draft로 저장하고 관리자 알림. |

**변경 파일 예상**:
- `supabase/functions/generate-blog-post/index.ts`: 재시도 1회, breadcrumb 삽입 힌트, llms.txt 재생성 트리거.
- `src/pages/BlogPost.tsx` (또는 프리렌더 스크립트): Breadcrumb JSON-LD.
- `supabase/functions/llms/index.ts` 신규 or 기존 sitemap fn 확장.

---

## 실행 순서 (승인 후)

1. **A1~A2 edge functions** + `_shared/aeo-judges.ts` 유틸 작성 → 배포.
2. **카나리 수동 실행**으로 3개 엔진 응답 파싱 정확도 검증 (프롬프트 3개, 로그로 raw response 확인).
3. **B: 대시보드 페이지** 구축 → 카나리 데이터 시각화 확인.
4. **A3 제안기** 붙임 → 대시보드에서 호출.
5. **D: 오토블로그 SEO 갭**만 골라 수정 (Breadcrumb, 팩트체크 재활성, llms.txt 동적화).
6. **C: 크론 스케줄** SQL 준비 → 사용자 승인 시 실행.

---

## 열려있는 확인 사항

- **Presence만으로도 delta가 크게 튈 것** → 초기엔 프롬프트 20개 × 3엔진 = 60콜/일. 예상 비용 대략 $1~2/일. 넘어가도 되는지?
- **경쟁 브랜드 리스트**(순위 판정용): 초기 셋으로 "Ahrefs, SEMrush, Surfer SEO, Frase, Writesonic, MarketMuse, AlsoAsked, AnswerThePublic" 사용해도 될지, 아니면 국내 경쟁자(마이리얼트립 SEO툴 등) 우선인지?
- **Sentiment/Accuracy 판정에 Gemini flash-lite 사용** 계획인데 OK?

승인 시 Phase A부터 순서대로 진행합니다.
