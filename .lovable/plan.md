## 목표
SERP 추적을 **전체 발행 블로그 글**로 확장하고, 매일 올라오는 신규 글도 자동으로 100% 커버.

## 변경 사항

### 1. `sync_blog_serp_keywords()` DB 함수 수정
- 현재: 최신 80편만 등록 (`LIMIT 80`)
- 변경: **LIMIT 제거** → `published = true`인 모든 글을 등록
- 비활성화 로직(stale)은 그대로 유지 (삭제/언퍼블리시된 글은 자동 off)
- 반환값에 `total_active` 추가해서 어드민에서 실제 추적 중인 키워드 수 확인 가능

### 2. DB 트리거 (`blog_posts_serp_autosync`)
- 이미 INSERT/UPDATE/DELETE에 걸려 있어 신규 글 자동 동기화는 OK
- 그대로 유지 (변경 없음)

### 3. `track-serp-keywords` Edge Function 안정화
현재 전체 키워드를 순차 처리하면서 키워드당 250ms 대기 → 키워드가 100+개로 늘어나면 함수 타임아웃 위험.
- **배치 처리**: `?batch=N&offset=M` 쿼리로 분할 실행 지원
- **cron 분산**: 06:00 KST 한 번에 전체 대신, 키워드 그룹별로 시간 분산
  - 06:00 KST: priority ≥ 5 (브랜드/핵심)
  - 06:15 KST: blog 카테고리 1/2 (offset 0)
  - 06:30 KST: blog 카테고리 2/2 (offset N)
- 또는 단순하게 **함수 내부에서 키워드를 50개 청크로 나눠 순차 처리** + 타임아웃 가드(전체 8분 예산 내)

### 4. 관리자 UI (`/admin/seo-monitor`)
- "블로그 키워드 동기화" 버튼 결과 토스트에 `총 활성 키워드 N개` 표시
- KPI 카드에 "추적 대상 (전체)" 추가 — 필터링 전 전체 활성 키워드 수

### 5. cron 스케줄 재정비
- `sync-blog-serp-keywords-daily` (05:55 KST) — 그대로
- `track-serp-keywords` — 배치 분산 적용 (위 #3 방식 중 선택)

## 비용/쿼터 고려사항
현재 119편 → 키워드 ~119개 × Google + Naver 2엔진 = 일 238 SERP 호출.
- Naver Search API: 25,000 req/day 무료 → 여유 충분
- Firecrawl: 플랜 따라 다름 — 확인 필요

## 결정 필요
- **A안 (단순)**: 함수 내부 청크 처리, cron 1회 유지 (구현 빠름)
- **B안 (분산)**: cron 3개로 그룹 분산 (안전, 복잡)

A안으로 진행할까요, B안으로 갈까요? (특별한 요청 없으면 **A안**으로 진행하겠습니다.)
