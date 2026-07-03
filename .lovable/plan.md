## 3개 이슈 처리 플랜

### 이슈 2: 헤더 Blog 링크 (배포만 남음)

- 코드는 이전 턴에 이미 수정 완료:
  ```diff
  - <Link to="/blog" ...>Blog</Link>
  + <a href="/blog" ...>Blog</a>
  ```
- 프로덕션에서 아직 구블로그로 가는 이유는 **미해결 Critical 보안 finding 1건** 때문에 publish가 막혀 있어서.
- 처리:
  1. `security--get_scan_results`로 finding 상세 확인
  2. 오탐이면 `security--manage_security_finding`으로 `ignore` + `security--update_memory` 사유 기록
  3. 실제 위험이면 짧게 수정 후 `mark_as_fixed`
  4. `preview_ui--publish` 실행

### 이슈 1: 신블로그 카테고리 뱃지 404

- 원인 가설: 인블로그가 카드에 표시하는 카테고리 뱃지는 우리가 붙인 **태그**(SEO/AEO/GEO/가이드)를 링크로 렌더 → 클릭 시 인블로그 태그 페이지(예: `blog.searchtuneos.com/tags/seo` 같은 경로)로 이동. Cloudflare Worker 프록시가 `/blog/*` 하위 태그 경로를 인블로그로 넘겨주지 않으면 서치튠OS 도메인에서 404.
- 조사 단계 (build 진입 후):
  1. 프로덕션에서 카드 카테고리 뱃지 클릭 시 실제로 어느 URL로 이동하는지 확인 (Playwright 또는 사용자 확인)
  2. 인블로그 API로 태그 페이지 정식 경로 확인 (`GET /tags` 응답의 `web_url` 필드)
  3. Worker 라우팅 매칭 규칙 확인 (커스텀 도메인 관리자 콘솔 또는 사용자가 wrangler 설정을 붙여주면 즉시)
- 수정 방향 (원인에 따라 택 1):
  - **A. Worker 프록시 확장**: `/blog/tags/*`, `/tags/*` 등도 인블로그로 프록시하도록 라우팅 추가 (권장 — 정공법)
  - **B. 태그 부착 중단**: 카테고리 태그 자체를 인블로그에서 제거해 뱃지가 안 뜨게 함 (임시 회피, 검색·필터 기능 상실)
- Worker 코드가 이 프로젝트 저장소에 없어 보이므로, **A안 채택 시 사용자에게 Worker 소스 위치 확인 필요**.

### 이슈 3: 썸네일 규칙 — 구블로그 카드 스타일 유지

- 첨부 스크린샷은 이미 OG PNG 룰북(`buildBrandSplitSvg` — 크림 패널 + 브랜드 워드마크 + `회사 · DB카테고리` eyebrow)의 결과물. `og_image`/`thumbnail`이 이 PNG로 동기화돼 있음.
- 인블로그 카드에서 다르게 보이는 이유 가능성 3가지:
  1. 인블로그가 `image.url`만 받고 자체적으로 정사각/16:9로 크롭 → 상하 잘림
  2. 인블로그가 본문 첫 이미지를 우선 사용하도록 설정된 항목이 있음
  3. `image` 필드가 아닌 별도 커버 이미지 필드가 존재
- 조사 단계 (build 진입 후):
  1. 인블로그 API로 대표 글 3~5건의 `attributes.image` 및 카드 렌더 실측 (스크린샷 캡처)
  2. 필드 스펙 확인: `cover_image`, `thumbnail`, `featured_image` 등 다른 후보 필드 실측 PATCH
- 수정 방향:
  - 크롭이 문제 → OG SVG 룰북에 인블로그 카드 안전지대(safe area) 여백 추가하여 재생성 + 141건 백필
  - 별도 필드 문제 → 새 필드까지 세팅하도록 `publish-to-inblog` 함수 확장 + 141건 백필
- 이 이슈는 **실측 결과에 따라 세부 수정 범위가 결정**되므로, build 진입 후 1~2턴에 걸쳐 원인 확정 → 픽스 → 백필 순으로 진행.

### 실행 순서 제안

1. **이슈 2** 먼저 (보안 finding 확인 → publish) — 가장 빠름, 프로덕션 헤더 즉시 정상화
2. **이슈 1** (Worker 프록시 소스 위치 확인 후 A안 또는 대안)
3. **이슈 3** (인블로그 카드 실측 → 원인 확정 → 픽스 + 백필)

### 열려있는 확인 사항

- Cloudflare Worker 소스가 이 저장소에 없는데, **어디서 관리 중**인가요? (별도 리포지토리 / wrangler 프로젝트 / 대시보드 직접 편집) — 이슈 1 A안을 위해 필요.
- 이슈 2의 보안 finding은 "확인 후 오탐이면 즉시 ignore"로 진행 OK인지 (이미 답변 주셨음 — 오탐이면 바로 ignore).
