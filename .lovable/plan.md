
## 목표

기존 `/blog` 122개 글(DB 107 + 정적 15)을 WordPress.com에 Posts로 이전하고, SearchTune OS는 WordPress REST API를 통해 글을 받아 `/blog/{slug}` 경로에서 렌더링하는 **headless CMS** 구조로 전환.

대표 검색 URL은 항상 `https://searchtuneos.com/blog/{slug}` 로 고정. WordPress.com의 기본 도메인(`*.wordpress.com`)은 검색엔진에 노출되지 않도록 막음.

---

## 사전 확인 필요 (사용자 결정)

1. **어느 WordPress.com 사이트를 쓸지** — 워크스페이스에 2개 연결됨:
   - `searchtune-wp` (전용으로 새로 만든 듯)
   - `Deleted's WordPress.com` (기존)
   → **`searchtune-wp` 사용 권장**. 확정해 주세요.

2. **WP 카테고리/태그 매핑** — 기존 카테고리: `SEO / AEO / GEO / 가이드 / 뉴스` (5종). 그대로 WP에 생성할지, 슬러그도 영문(`seo, aeo, geo, guide, news`)으로 통일할지.

3. **이전 후 .html URL 처리** — 모든 `/blog/{slug}.html` → `/blog/{slug}/` 로 301. 이는 이미 매핑 테이블 생성 완료. SPA 측 `BlogPost.tsx`의 redirect 로직만 반대 방향으로 뒤집으면 됨.

---

## 단계별 계획

### 1단계 — WordPress.com 연결 & 분류 셋업
- `searchtune-wp` 커넥션을 프로젝트에 link (게이트웨이 사용)
- 5개 카테고리 생성 (POST `/sites/{site}/categories/new`)
- 미디어 라이브러리에 featured image 업로드 (POST `/sites/{site}/media/new`)

### 2단계 — 122개 글 일괄 업로드 스크립트
`scripts/import-to-wordpress.mjs`:
- 입력: 직전에 만든 `/mnt/documents/blog-migration/blog-inventory.json`
- 각 글마다:
  - Markdown → HTML 변환 (`marked` 또는 `remark-html`)
  - featured image 업로드 → media ID 획득
  - POST `/sites/{site}/posts/new`:
    - `title`, `slug`, `content`(HTML), `excerpt`, `date`, `categories`, `tags`, `featured_image`, `status: publish`
    - **`metadata`에 `_canonical_url = https://searchtuneos.com/blog/{slug}/` 저장**
- 결과: `blog-migration/wp-import-log.json` (slug → WP post ID 매핑)
- 멱등성: 같은 slug 재실행 시 update (POST `/posts/slug:{slug}`)

### 3단계 — Headless 렌더링 전환 (SearchTune OS 측)
- 새 edge function `fetch-wp-posts/index.ts`:
  - WP REST를 게이트웨이로 호출, 5분 캐시 (in-memory + Supabase `blog_posts` 미러)
- `src/pages/Blog.tsx`, `BlogPost.tsx`:
  - 데이터 소스 = edge function (DB blog_posts는 read-only 백업 미러로 유지)
- `BlogPost.tsx` canonical 로직 유지 (`/blog/{slug}/` 기준)
- **기존 `blog_posts` 테이블/정적 `blogPosts.ts`는 절대 삭제 안 함** — 롤백 안전망

### 4단계 — URL 매핑 & 검색엔진 노출 제어
- `public/robots.txt` 변경 없음 (이미 `/blog/` 허용)
- `scripts/generate-sitemap.mjs` 변경: WP 소스에서 슬러그 가져와 `/blog/{slug}/` 만 등록 (.html 제거)
- 기존 prerender `.html` 파일은 그대로 두되, 새 빌드부터는 redirect stub만 생성
- **WordPress.com 측 SEO 설정**:
  - 모든 WP Post에 `canonical_url` 메타 추가 (`searchtuneos.com/blog/{slug}/`)
  - WordPress.com 사이트 설정에서 `Discourage search engines` 활성화 권장 (관리자에서 수동, 또는 사이트 옵션 API로)
  - `*.wordpress.com` 도메인이 색인되지 않도록 함

### 5단계 — 매핑 테이블 영구 보관
- 이미 만들어진 `url-redirect-map.json` (122건)을 DB로 옮김:
  - 기존 `slug_redirects` 테이블 재사용 (이미 존재)
  - INSERT: `old_path → new_path` 122건

---

## 기술 세부 (개발자용)

### WP REST API 엔드포인트 (게이트웨이 경유)
```
POST https://connector-gateway.lovable.dev/wordpress_com/rest/v1.1/sites/{site_id}/posts/new
POST .../media/new          (multipart)
POST .../categories/new
GET  .../posts?number=100   (페이징)
```

헤더: `Authorization: Bearer ${LOVABLE_API_KEY}`, `X-Connection-Api-Key: ${WORDPRESS_COM_API_KEY}`

### 사이트 ID 하드코딩
백엔드 edge function 안에 환경변수 또는 상수로 site ID 고정 (지침대로 프론트엔드엔 노출 안 함)

### Markdown → WP HTML
기존 본문은 markdown. `marked` + `gfm` 으로 변환, callout/TL;DR 같은 커스텀 블록은 그대로 HTML로 passthrough (WP는 raw HTML 허용)

### Canonical 전략
- WP 측: 각 Post의 `_canonical_url` custom meta + Yoast 같은 SEO 플러그인 없으니 `<link rel="canonical">`은 SearchTune OS 측에서만 출력
- SearchTune OS 측: `BlogPost.tsx`가 `<link rel="canonical" href="https://searchtuneos.com/blog/{slug}/">` 발급 (현재 코드는 .html이므로 수정 필요)
- WordPress.com 공개 URL은 robots discouraged + noindex meta로 차단

---

## 안전장치

- 기존 DB `blog_posts` 데이터 **유지** (롤백용)
- 기존 정적 `src/data/blogPosts.ts` **유지**
- 기존 `dist/blog/{slug}.html` prerender 파일 **유지** (다음 빌드까지)
- WP 업로드 스크립트는 **dry-run 모드** 기본 — `--apply` 플래그 필요
- 마이그레이션 완료 후에도 한 달간 양쪽 병행 운영 권장

---

## 진행 순서 제안

다음 메시지에서 **사용자 결정 3가지** (어느 WP 사이트, 카테고리 슬러그 영문화 여부, 진행 시점) 확답 받은 뒤:
1. WP 커넥션 link + 카테고리 생성
2. dry-run 업로드 (3건 샘플) → 사용자 확인
3. 전체 122건 업로드
4. SearchTune OS 측 headless 전환 + canonical 수정
5. `slug_redirects` 채우기

각 단계마다 확인 받고 진행.
