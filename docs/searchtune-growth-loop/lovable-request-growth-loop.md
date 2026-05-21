# Lovable 수정 요청 — SearchTune OS AI Growth Loop 활성화

아래 내용을 Lovable에 그대로 전달한다.

---

## 요청 제목

SearchTune OS `/admin/seo-ops`에 AI Growth Loop 액션 로그/상태 머신을 연결해 주세요.

## 배경

현재 `ops-readonly` API는 정상 응답하지만 `aiGrowthLoop.total=0`, `recent=[]` 상태입니다. SEO 모니터는 미노출 키워드 23개를 감지하고 있으나, 이 결과가 블로그 수정 후보/적용/색인요청/성과 모니터링 액션으로 이어져 DB에 남지 않습니다.

목표는 리포트용 점수판이 아니라 **블로그를 계속 최적화하는 운영 루프**입니다.

## 반드시 구현할 것

### 1. DB 테이블 추가

Supabase migration으로 아래 4개 테이블을 추가해 주세요.

- `seo_blog_audit_runs`
- `seo_blog_page_audits`
- `seo_growth_actions`
- `seo_engine_rule_updates`

상세 스키마는 `docs/searchtune-growth-loop/growth-loop-db-design.md` 기준으로 구현해 주세요.

### 2. SEO Ops Center UI 업데이트

`/admin/seo-ops` 화면에 `AI Growth Loop` 섹션을 실제 DB 기반으로 연결해 주세요.

필수 카드:

- 전체 액션 수
- 상태별 카운트
  - `unhandled`
  - `planned`
  - `requested_in_lovable`
  - `edited_in_git`
  - `verified_build`
  - `deployed`
  - `index_requested`
  - `monitoring`
  - `improved`
  - `no_change`
  - `worse`
  - `blocked`
- 최근 액션 10개
- 다음 추천 액션 5개
- 마지막 audit run 시간

### 3. 액션 상태 전이 버튼

각 액션에 대해 최소한 아래 상태 변경이 가능해야 합니다.

- `unhandled → planned`
- `planned → requested_in_lovable`
- `planned → edited_in_git`
- `edited_in_git → verified_build`
- `verified_build → deployed`
- `deployed → index_requested`
- `index_requested → monitoring`
- `monitoring → improved/no_change/worse`
- any → `blocked`

상태 변경 시 `updated_at` 갱신하고, 가능하면 `evidence` JSON에 메모를 남겨 주세요.

### 4. `ops-readonly` API 확장

기존 읽기전용 API 응답의 `aiGrowthLoop`가 실제 테이블을 읽도록 해 주세요.

응답 예시:

```json
{
  "aiGrowthLoop": {
    "total": 12,
    "counts": {
      "unhandled": 3,
      "planned": 2,
      "edited_in_git": 1,
      "index_requested": 2,
      "monitoring": 3,
      "improved": 1,
      "no_change": 0,
      "worse": 0,
      "blocked": 0
    },
    "recent": [
      {
        "slug": "what-is-aeo",
        "canonical_url": "https://searchtuneos.com/blog/what-is-aeo.html",
        "target_keyword": "AEO란",
        "action_type": "title_meta_update",
        "status": "monitoring",
        "priority": "P1",
        "reason": "Google requested 상태이나 broad query 노출 약함"
      }
    ],
    "nextActions": [],
    "lastAuditRun": {
      "checked_at": "2026-05-21T00:00:00Z",
      "total_urls": 101
    }
  }
}
```

### 5. 시간대별 운영 루프

시간대별로 액션이 쌓이게 해 주세요.

- 06:00 KST: 밤사이 SEO/SERP/색인 변화 → audit run + action candidates 생성
- 11:30 KST: 콘텐츠/발행 규칙 업데이트 후보 생성
- 17:00 KST: 당일 수정 진행/성과 변화 리포트
- hourly: 색인/canonical watcher, 변경 있을 때만 액션 업데이트

자동으로 외부 Search Console/Naver 제출을 클릭하지는 말고, 제출 후보/복사 URL/상태만 관리해 주세요.

### 6. 블로그 인터랙션 규칙 저장

향후 발행 글에 가벼운 HTML/React 인터랙션을 넣을 수 있도록 `seo_engine_rule_updates` 또는 engine config에 아래 규칙을 추가해 주세요.

- JS 없이도 핵심 본문은 읽혀야 함
- crawler-facing HTML에 핵심 텍스트 유지
- 모바일에서 깨지면 안 됨
- CTA/체크리스트/비교표/흐름도/미니 진단 위주
- SEO 본문을 가리거나 lazy-only로 숨기면 안 됨

## 수락 기준

1. `/admin/seo-ops`에서 AI Growth Loop가 더 이상 0건 고정이 아니어야 함.
2. 테스트 seed action 3개 이상을 넣었을 때 상태별 카운트/최근 액션/다음 액션이 화면과 `ops-readonly`에 모두 반영되어야 함.
3. 기존 SEO Monitor / Indexing Queue 카운트와 충돌하지 않아야 함.
4. `ops-readonly`는 계속 읽기전용이어야 함. 쓰기 토큰/관리자 비밀번호를 노출하면 안 됨.
5. canonical URL은 `.html` 절대 URL 기준으로 저장해야 함.

---

## Hermes 쪽 병행 작업

Hermes는 별도 Git 브랜치 `seo/growth-loop-engine-20260521`에서 다음을 진행합니다.

- 블로그 감사 스크립트
- 수정 후보 큐 설계
- AEO cluster 첫 배치 최적화
- 인터랙션 컴포넌트 후보 설계
- 빌드/검증 후 PR 또는 머지 후보 정리
