# 어드민 SEO 운영 화면 분리 + 자가학습 루프

기존 `/admin` 한 페이지에 SERP 추적까지 욱여넣은 구조를 4개 라우트로 분리하고, 매일의 운영 루프(추적 → 색인 요청 → 결과 측정 → 다음 액션)를 데이터 모델까지 갖춰 만듭니다.

## 1. 라우트 구조

```
/admin                  → /admin/insights 로 redirect
/admin/insights         → 기존 운영 인사이트 (세션·리드·블로그 관리·엔진 업데이트·Clarity 등)
/admin/blog             → 기존 블로그/실패 글 관리 (인사이트에서 분리)
/admin/seo-monitor      → 키워드/노출/순위 모니터링 (현 SERP 카드 확장판)
/admin/indexing-queue   → 네이버/구글 색인 요청 작업대
/admin/ai-growth-loop   → 수정 액션 ↔ 노출 변화 학습 리포트
```

공통 좌측 사이드바(또는 상단 탭) 컴포넌트 `AdminShell`을 만들어 5개 메뉴를 노출. 비밀번호 인증/Admin 권한 체크는 한 번만 통과시키고 모든 하위 라우트가 공유.

## 2. 데이터 모델 (마이그레이션 1건)

기존 `serp_keywords`, `serp_tracking_results` 유지. 다음 3개 테이블 신규 + 1개 컬럼 추가.

- `serp_keywords`에 컬럼 추가
  - `status text default 'monitoring'` — `monitoring | exposed | missing | needs_fix | indexing_pending`
  - `last_action_at timestamptz`
- `indexing_queue`
  - `id, url text, target_keyword text, engine text(naver|google|both), reason text, priority smallint, status text(pending|requested|verified|failed|re_request|hold), requested_at, verified_at, result text, note text, created_at, updated_at`
- `seo_actions` (자가학습 루프)
  - `id, page_url text, target_keyword text, action_type text, before_state jsonb, after_state jsonb, result text(improved|no_change|worse|waiting|unclear), ai_judgement text, next_action text, remeasure_at timestamptz, created_at, updated_at`
- `seo_action_metrics` (액션 ↔ SERP 결과 연결)
  - `id, action_id uuid, keyword text, engine text, rank_before int, rank_after int, measured_at timestamptz`

모든 테이블 RLS: service_role ALL + admin SELECT (`has_role`). INSERT/UPDATE는 어드민 전용 edge function 경유.

## 3. Edge Functions

- `seo-monitor` — 추적 키워드 + 최신 결과 + 전일 대비 순위 변화 + 그룹별 카운트 반환. 필터(engine/status/group/days) 지원.
- `indexing-queue` — list / add / update_status / bulk_add_from_missing 액션. 자동 제출은 하지 않음(요구사항).
- `seo-actions` — list / create / update_result / mark_remeasure / ai_judge(LOVABLE_API_KEY로 Gemini 호출, 액션 전후 SERP 데이터 보고 판단 1줄 생성).
- 기존 `track-serp-keywords` 는 그대로. `seo-monitor`가 결과 조회만 담당.

## 4. UI 컴포넌트

`/admin/seo-monitor`
- 상단 6개 KPI 카드: 추적 키워드/노출/미노출/색인대기/상승/하락
- 필터바: 엔진·상태·그룹·기간(1·7·14·30일)
- 메인 테이블: 키워드, 그룹, 엔진, 상태 뱃지, 현재 순위, 전일 순위, Δ, 매칭 URL, 실제 노출 URL, 마지막 확인/수정/색인 요청, 다음 추천 액션
- 행 액션: URL 복사 / 검색 결과 새 탭 / 색인 큐 추가 / 수정 액션 생성 / 모니터링 완료

`/admin/indexing-queue`
- 상단 5개 KPI: 오늘 후보/완료/색인확인/재요청/보류
- 테이블 컬럼: 우선순위, URL, 타겟 키워드, 엔진, 사유, 상태, 요청일, 확인일, 결과, 메모
- 각 행: **URL 복사 버튼(굵게 강조)**, 외부 링크(네이버 서치어드바이저/구글 서치 콘솔), 상태 변경 버튼들
- 일괄 자동 제출 없음 — 후보 선정·상태 관리 only

`/admin/ai-growth-loop`
- 상단 5개 KPI: 총 액션/효과 확인/미확인/재검토/평균 개선 일수
- 테이블: 수정일, 페이지, 키워드, 수정 유형, 전·후 상태, 결과 뱃지, AI 판단, 다음 액션, 재측정 예정일
- "AI 재판단" 버튼 — `seo-actions/ai_judge` 호출, 결과 1줄 갱신
- "재측정" 버튼 — 해당 키워드 `track-serp-keywords` 강제 실행 후 결과 비교

상태 뱃지 색상: 노출중/개선됨=score-excellent, 미노출/악화=destructive, 색인대기/대기=warning, 수정필요=accent, 상승=primary↑, 하락=destructive↓.

## 5. 기존 Admin.tsx 정리

현재 SERP 추적 카드 + 트리거 버튼은 `/admin/seo-monitor`로 이전. `/admin/insights`에는 SERP 카드 자리에 "SEO 모니터로 이동" 링크 카드 1개만 남김. 인사이트 페이지의 다른 기능(엔진 업데이트, Clarity, 블로그 실패 글 등)은 그대로 유지하되, 블로그 관리는 `/admin/blog`로 이동.

## 6. 구현 순서

1. 마이그레이션: 컬럼 추가 + 3개 테이블 + RLS
2. `AdminShell` + 라우트 5개 등록 (App.tsx, 중첩 라우트)
3. edge functions 3개 작성 + 배포
4. `/admin/seo-monitor` 구현 (현 카드 이전 + 확장)
5. `/admin/indexing-queue` 구현
6. `/admin/ai-growth-loop` 구현
7. 기존 Admin.tsx에서 SERP/블로그 카드 분리 정리
8. 빌드 확인

## 기술 노트

- 라우트 중첩: `<Route path="/admin" element={<AdminShell/>}><Route index .../><Route path="seo-monitor" .../>...`
- 상태/그룹 카운트는 edge function 내 SQL 집계로 1회 조회, 클라이언트는 표시만.
- "다음 추천 액션"은 룰 기반(미노출+매칭 URL 있음→수정필요, 미노출+매칭 URL 없음→신규 글 필요, 노출중+순위>10→FAQ/내부링크 보강 등). AI 호출은 ai-growth-loop만 사용.
- Naver 서치어드바이저 외부 링크: `https://searchadvisor.naver.com/console/board/request`, Google: `https://search.google.com/search-console`.
