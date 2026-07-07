
# AEO 데일리 트래커 & 오토블로그 SEO 극대화 계획

## 현황 파악 (기존 자산 재활용 관점)

- **AI 엔진 호출 로직 이미 존재** — `supabase/functions/measure-answer-share/index.ts`(524줄)와 `probe-ai-perception/index.ts`(1,195줄)가 이미 Perplexity Sonar / OpenAI(GPT-5-mini 직결) / Anthropic Claude / Gemini(게이트웨이)를 병렬 호출하고 브랜드 언급 판정까지 수행. **AEO 트래커는 이 로직을 재사용**해서 신규 코드 표면을 최소화한다.
- **오토블로그 파이프라인 살아있음** — `generate-blog-post`(952줄)는 자체 채점(SEO/AEO/GEO 평균 70점 임계) + Firecrawl 최신 레퍼런스 주입 + `submit-indexnow` 자동 호출까지 동작 중. Cron 스케줄도 `blog-morning-850` / `blog-afternoon-1730` / `indexnow-daily-resubmit` / `sync-blog-serp-keywords-daily` 등이 모두 `active=t` 상태로 이미 돌고 있음 → **"업데이트 재개"라기보단 "품질/색인 레이어 강화"가 정확한 표현**.
- **JSON-LD 상태** — `BlogPost.tsx`에 Article + FAQPage + BreadcrumbList 세 개 모두 이미 주입됨. `public/llms.txt`, `sitemap.xml`(sitemap-pages/-posts 분할), `robots.txt`도 존재.
- **미비점**: llms.txt/sitemap-posts는 정적 파일이라 **신규 발행 시 자동 갱신 안 됨**. 자체 채점 재시도(`MAX_QUALITY_RETRIES=0`)는 타임아웃 방어로 꺼져 있음. **팩트체크 레이어는 아예 없음**. IndexNow는 있으나 네이버 IndexNow(`searchadvisor.naver.com`)는 아직 미지원.
- **AI 엔진 현실성 판단**: 웹서치 grounding이 진짜 붙는 조합은
  - ✅ **Perplexity `sonar` / `sonar-pro`** — 네이티브 web search + citations 반환
  - ✅ **OpenAI Responses API + `web_search` tool** (OPENAI_API_KEY 직결로 사용 중)
  - ✅ **Anthropic Claude + `web_search` tool** (ANTHROPIC_API_KEY 있음)
  - ⚠️ **Gemini via Lovable AI Gateway** — grounding 없음. 학습데이터만 검사됨 → 매일 점수 정체. 트래커에서는 **Gemini를 감성/근거 판정 judge로만 쓰고, "AI 엔진 응답" 축에서는 제외**하거나, 참고용 "baseline(grounding 없음)"으로 분리 표기.
  - ➕ **Firecrawl Search** — Google SERP baseline으로 별도 축(브랜드가 실제 검색결과 상위에 있는지 vs AI 답변에 있는지 갭 비교).

---

## Part 1 — AEO 데일리 트래커

### Step 1. DB 마이그레이션 (Supabase)

세 테이블 신설. 모두 `service_role`로만 write, 관리자 UI는 edge function 프록시(`ops-readonly` 패턴) 경유 read.

- **`aeo_prompts`** — 타겟 질문 세트
  - `id uuid`, `prompt text`, `category text`(SEO/AEO/GEO/네이버/브랜드 등), `intent text`(추천형/비교형/방법형), `expected_url text`(선호 랜딩), `active boolean default true`, `priority smallint default 5`, `created_at`, `updated_at`
  - 초기 시드 20~30개 (예: "GEO 진단 툴 추천", "AI 검색 최적화 도구", "ChatGPT 검색 최적화", "네이버 스마트스토어 SEO 진단" 등 — 카테고리별 밸런스).
- **`aeo_check_results`** — 원본 로그(원자적 1행 = 1엔진 x 1프롬프트 x 1일)
  - `id`, `check_date date`(KST 기준), `prompt_id uuid`, `engine text`(perplexity/chatgpt/claude/firecrawl_serp), `mentioned boolean`, `mention_rank smallint nullable`(응답 내 브랜드 등장 순번, 1이 최상), `sentiment smallint`(-1/0/1), `accuracy smallint`(0-3, judge 평가), `excerpt text`(브랜드 언급 문장), `citations jsonb`(엔진이 준 URL 리스트, searchtuneos.com 포함 여부 계산 대상), `raw_response_hash text`, `cost_usd numeric`, `created_at`
  - 인덱스: `(check_date desc, prompt_id)`, `(engine, check_date desc)`
- **`aeo_daily_scores`** — 일별 집계(대시보드 조회용 캐시)
  - `check_date date primary key`, `visibility_score smallint`(0-100), `presence_score`, `position_score`, `sentiment_score`, `accuracy_score`, `citation_share numeric`(citations에 searchtuneos.com 비율), `total_checks int`, `mentioned_checks int`, `by_engine jsonb`, `by_prompt jsonb`, `delta_vs_yesterday smallint`, `computed_at timestamptz`

**Visibility Score 공식** (0-100, 가중 평균):
- Presence 40% = 언급된 프롬프트 비율
- Position 25% = 언급 시 mention_rank 기반(1위=100, 5위=40, 미언급=0) 평균
- Sentiment 15% = (긍정=100, 중립=60, 부정=0) 평균
- Accuracy 20% = accuracy(0-3) * 33.3 평균

RLS: `authenticated` SELECT 차단, `service_role`만 read/write, 관리자용 대시보드는 admin edge function이 서비스 롤로 조회.

### Step 2. Edge Function `aeo-daily-check`

- 입력: `{ mode: "cron" | "canary", prompt_ids?: string[] }` — canary 모드는 `prompt_ids` 3~5개만 실행.
- 흐름:
  1. `aeo_prompts` 활성 목록 조회(또는 canary IDs).
  2. 각 프롬프트에 대해 4개 엔진 병렬 호출:
     - **Perplexity Sonar**: `search_domain_filter` 없이, `citations` 배열 저장.
     - **OpenAI Responses API**: `tools: [{ type: "web_search" }]` 로 grounding 강제.
     - **Anthropic Claude**: `web_search` tool 활성화 (`claude-haiku-4-5`).
     - **Firecrawl Search**: 상위 10개 결과에서 `searchtuneos.com` 등장 여부·순위.
  3. 각 응답에 대해 **판정 단계** (Gemini 2.5 flash judge, temperature=0):
     - `mentioned`(searchtuneos / SearchTune OS 정규화 매칭 — 기존 `probe-ai-perception`의 매칭 로직 재사용)
     - `mention_rank`(문단·항목 순번)
     - `sentiment` / `accuracy` / `excerpt` 추출
  4. `aeo_check_results` 벌크 insert.
  5. 오늘자 집계 → `aeo_daily_scores` upsert(전일값 조회해 `delta_vs_yesterday` 계산).
- 비용 가드: 프롬프트 수 x 엔진 4개 = 하루 콜 상한 100회 이내 유지(초기 20 프롬프트). `api_cost_log` 이미 존재하므로 재활용.
- 타임아웃: 프롬프트당 25초 상한, 엔진별 실패 시 `null` 기록(스코어에서 제외).

### Step 3. 관리자 대시보드 `/admin/aeo-tracker`

`src/pages/admin/AeoTracker.tsx` 신설(`AdminLayout` 하위):
- **상단**: 오늘 Visibility Score 큰 숫자 + 어제 대비 델타(↑/↓ 색). 4개 서브스코어 미니 바.
- **차트**: 최근 30일 라인 차트(Presence/Position/Sentiment/Accuracy 4선 + 총점 굵은선). recharts 사용.
- **엔진별 breakdown**: 스택 바 차트(엔진 x 언급률).
- **프롬프트 테이블**: 각 프롬프트 오늘값 — 언급/순위/감성/정확성/엔진별 미니 아이콘(초록/회색/빨강). 개선·악화 화살표.
- **개선점 섹션**: 30일 연속 미언급 프롬프트 목록 → 각 항목 옆에 "이 주제로 블로그 생성" 버튼(→ `generate-blog-post` 큐에 넣는 액션. 이미 있는 파이프라인 재사용).
- **카나리 실행 버튼**: 프롬프트 3~5개 선택 후 "지금 실행" → `aeo-daily-check` 를 `mode:"canary"`로 호출, 결과 인라인 표시.

데이터 접근: 신규 edge function `admin-aeo-read`(관리자 비밀번호 검증 — 기존 `admin-auth` 패턴 재사용).

### Step 4. Cron 활성화 (카나리 이후)

카나리 3~5일간 수동 실행 → 응답 품질/비용 확인 → 이후 `pg_cron` 등록:
- `aeo-daily-check-9am` — `0 0 * * *` (UTC 00:00 = KST 09:00), `net.http_post` 로 edge function 호출.
- 등록은 `admin-run-resync-once` 패턴처럼 admin insert 도구로 (사용자별 시크릿 포함 SQL이므로 마이그레이션 아님).

---

## Part 2 — 오토블로그 SEO 노출 극대화

기존 파이프라인에 얹는 **강화 레이어**만 추가.

### Step A. 동적 sitemap + llms.txt

- **`sitemap-posts.xml`** — 현재 정적. `supabase/functions/sitemap/index.ts` 이미 있으므로 `/functions/v1/sitemap` 이 `blog_posts` 조인해서 실시간 XML 반환하도록 확장. `public/sitemap-posts.xml` 은 초기 로드용 fallback으로 유지하되, `sitemap.xml` 인덱스에 `<loc>https://searchtuneos.com/api/sitemap-posts</loc>` 스타일로 edge function URL 연결(또는 발행 후 정적 파일 재생성).
- **`llms.txt`** — 정적. `generate-blog-post` 성공 시 새 신설 edge function `regenerate-llms-txt` 를 호출해 최신 블로그 20개 링크를 llms.txt에 반영, `public/llms.txt` 를 Supabase Storage(`og-images` 재사용 X — 신규 `site-assets` 버킷)에 업로드하고 Cloudflare purge. 또는 간단히 edge function `/functions/v1/llms-txt` 가 동적 서빙하고 CDN에서 캐시.

### Step B. IndexNow 확장

- 현재 Bing IndexNow만 호출. `submit-indexnow/index.ts` 에 **네이버 IndexNow**(`searchadvisor.naver.com/indexnow`) 추가.
- Google은 IndexNow 미지원이므로 그대로 GSC API(`check-indexing` 이미 있음)로 색인 요청.

### Step C. 품질/팩트체크 레이어 재활성화

- **자체 채점 재시도**: `MAX_QUALITY_RETRIES = 0 → 1` 로 상향 (타임아웃 대비 edge function `runtime` 을 늘리거나 백그라운드 큐로 이동 — 안전선을 위해 1회만).
- **팩트체크(신규)**: 초안 완성 후 Firecrawl Search로 본문 내 핵심 통계·연도·수치를 재검증하는 별도 Gemini judge 스텝 추가. 근거 URL 3개 이하 발견 시 해당 문장에 "출처 필요" 태그 자동 삽입 or 회귀 재생성 트리거.

### Step D. JSON-LD 강화

- 이미 Article/FAQPage/BreadcrumbList 있음. 추가:
  - `Author` 스키마 노드 확장(sameAs로 searchtuneos.com/about).
  - `mainEntityOfPage`, `publisher.logo` 명시(현재도 있으나 검증).
  - 신규: `HowTo` 자동 감지 — 본문에 "1단계 / 2단계" 리스트가 있으면 HowTo 스키마 자동 삽입(generate-blog-post에서 감지 후 JSON-LD 필드에 저장, BlogPost.tsx에서 렌더).

### Step E. RSS 피드

- `supabase/functions/rss` 이미 존재. Cron으로 `rss.xml` 정적 파일 갱신 스텝 추가(선택). 현재 확인 필요 — 이미 동적이면 그대로.

---

## 구현 순서 (권장)

```text
1. DB 마이그레이션 (aeo_prompts / aeo_check_results / aeo_daily_scores + 시드 20개)
2. Edge function: aeo-daily-check (canary 모드부터)
3. Edge function: admin-aeo-read (관리자 인증 + 조회)
4. 관리자 대시보드 페이지 /admin/aeo-tracker (canary 버튼 포함)
5. 3~5일 canary 실행 → 응답 품질/비용 확인
6. pg_cron 등록 (매일 09:00 KST)
7. [Part 2] submit-indexnow에 네이버 추가
8. [Part 2] sitemap-posts 동적화 + llms.txt 갱신 훅
9. [Part 2] generate-blog-post 팩트체크 레이어 + 재시도 1회 재활성
10. [Part 2] HowTo JSON-LD 자동 감지
```

## 결정 필요 사항

1. **엔진 조합 최종 확정** — 위 4개(Perplexity + OpenAI web_search + Claude web_search + Firecrawl SERP) 로 진행할지, Gemini도 "grounding 없는 baseline"으로 포함할지.
2. **프롬프트 초기 시드** — 20개 정도 예시를 제가 초안으로 제시해 승인받는 방식으로 진행할지, 사용자가 직접 목록을 주실지.
3. **팩트체크 강도** — "출처 필요 태그만 삽입"(약한 개입) vs "임계 미달 시 자동 재생성"(강한 개입, 비용↑) 중 선택.
4. **대시보드 접근** — `/admin/aeo-tracker` 로 관리자 전용이 맞는지, 아니면 `/aeo-tracker` 공개 마케팅용 대시보드로도 노출할지.
