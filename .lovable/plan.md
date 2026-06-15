
# 블로그 → WordPress 이전: 분석 및 단계별 계획

> 이번 계획에서는 **코드 변경 없이 현재 라이브 구조 보존** + **이전 로드맵 확정**이 목표입니다. 기존 .html, sitemap, canonical, DB 데이터는 9단계 전환 안전 조건이 모두 충족되기 전까지 절대 삭제·수정하지 않습니다.

---

## 1단계 · 현재 구조 분석 보고

| 항목 | 현황 |
|---|---|
| 프레임워크 | **React 18 + Vite 5 + TypeScript** (TanStack Start 아님). `react-router-dom` BrowserRouter |
| 블로그 데이터 위치 | **Supabase `blog_posts` 테이블 (published=true 119편)** + `src/data/blogPosts.ts` 정적 시드 6편 |
| .html 생성 방식 | `scripts/prerender-blog.mjs` (build 후 실행). Supabase에서 fetch → `dist/blog/{slug}.html` (canonical full body) + `dist/blog/{slug}/index.html` (meta-refresh stub) 두 파일 생성 |
| `/blog/{slug}` 라우트 | `src/App.tsx`에 3개 Route (`:slug.html`, `:slug/index.html`, `:slug`). `BlogPost.tsx` 마운트 시 `.html`로 `navigate(replace:true)` 정규화 |
| canonical / OG 생성 위치 | (a) **빌드 타임** `prerender-blog.mjs`가 `.html`에 inline 주입 (b) **런타임** `BlogPost.tsx`의 `react-helmet-async` (SPA hydration 후) |
| sitemap.xml | `public/sitemap.xml`(인덱스) → `public/sitemap-pages.xml` + `supabase/functions/sitemap` Edge Function(`?type=posts`). 모두 `/blog/{slug}.html` 사용 |
| WordPress 연결 | **현재 App Connector 미연결.** 코드베이스에 WordPress API 호출 없음. `tool_search`상 `wordpress_com` 커넥터(WordPress.com REST v1.1, gateway 경유)는 사용 가능 |
| 현재 WP API 구현 기능 | **없음 (0건)** |
| 배포·도메인 | Lovable 호스팅. `searchtuneos.com` / `www.searchtuneos.com` (Cloudflare DNS, A 185.158.133.1). **현재 Reverse Proxy / Worker 없음** — Lovable 정적 호스팅이 직접 응답 |
| 핵심 제약 (메모리화 됨) | Lovable 호스팅 SPA fallback은 확장자 없는 deep path를 `/index.html`(홈)로 폴백 → clean URL canonical/OG 깨짐. 그래서 현재는 `.html`을 정규형으로 유지 중 |

**문제의 근본 원인:** Lovable 정적 호스팅이 nested `index.html`을 default document로 서빙하지 않기 때문에, `/blog/{slug}` 요청 시 **서버가 글별 HTML이 아닌 홈페이지 HTML을 반환**합니다. 카카오 크롤러는 JS를 실행하지 않으므로 홈 OG만 읽습니다. → 이 문제는 **Lovable 내부 설정으로 해결 불가**. 글별 서버 응답이 필요 → WordPress 이전이 정답.

---

## 2단계 · 기존 블로그 데이터 백업 (Export)

`scripts/export-blog-inventory.mjs`가 **이미 존재**합니다 (DB 119편 + 정적 6편 머지, `/mnt/documents/blog-migration/` 출력). 다만 WordPress 이전 관점에서 다음 필드 보강이 필요합니다.

추가/검증할 필드:
- `seo_title`, `meta_description` (현재 `title`/`excerpt`로 대체 중 — 별도 컬럼화 검토)
- `image_alt` (본문 내 `<img alt>` 추출)
- `featured_image_url` + `og_image_url` 절대 URL 정규화
- `wp_categories`, `wp_tags` 매핑 표 (현재 `category` 1개 → WP 카테고리 1:1 + 본문 H2에서 태그 후보)
- `internal_links` (이미 추출 중 — `.html` → 신 URL `/blog/{slug}` 치환 매핑 포함)

출력: `blog-inventory.json` / `.csv` / `content/{slug}.md` (front-matter) / `url-redirect-map.csv` — 그대로 WP-CLI `wp import` 또는 WP All Import 플러그인이 소화 가능.

---

## 3단계 · WordPress 이전 구조 설계

### 옵션 A · WordPress.com Business 이상
- **장점**: 호스팅·백업·CDN·보안 완전 관리. 이미 Lovable에 `wordpress_com` 커넥터 존재 (App Connector 한 번에 연결).
- **제약**:
  - 커스텀 도메인 `blog.searchtuneos.com` 또는 `searchtuneos.com/blog` 매핑 가능하나, **subpath(`/blog/*`)는 WordPress.com이 직접 서빙하지 않음** → 반드시 앞단 프록시 필요.
  - 테마 코드 업로드는 Business 플랜 이상에서만.
  - 커스텀 PHP/플러그인 제약 일부 존재.

### 옵션 B · 관리형/자체 호스팅 WordPress (Kinsta · WP Engine · Cloudways · 또는 VPS)
- **장점**: 테마·플러그인·DB·헤더 완전 제어. Yoast/Rank Math, WP All Import, Redirection 자유 설치. 서버 측 캐싱·이미지 최적화 자유.
- **단점**: 관리 책임 증가, 월 비용 ($20~$50).
- **추천**: 100편+ / SEO 정밀 제어 / 디자인 토큰 이식 요구를 고려하면 **옵션 B (관리형 WordPress) 강력 권장**. 예: **Cloudways(저비용) 또는 Kinsta(품질)**.

### `/blog/*`만 WordPress가 직접 처리하는 라우팅 구조

Lovable 호스팅은 vhost 레벨 reverse proxy 룰을 제공하지 않으므로, **Cloudflare 무료 Worker를 도메인 앞단에 배치**합니다.

```text
사용자 ──▶ searchtuneos.com (Cloudflare DNS)
              │
              ├─ /blog, /blog/*  ──▶  WordPress 원본 (예: wp.searchtuneos.com 또는 origin IP)
              │                       (Worker가 Host 헤더 재작성, 응답 그대로 전달)
              │
              └─ 그 외 모든 경로 ──▶ Lovable 호스팅 (현재 그대로)
```

Worker 의사코드:
```js
export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/blog" || url.pathname.startsWith("/blog/")) {
      const origin = new URL(url.pathname + url.search, "https://wp-origin.searchtuneos.com");
      return fetch(origin, { headers: { ...req.headers, host: "wp-origin.searchtuneos.com" }, method: req.method, body: req.body });
    }
    return fetch(req); // Lovable으로 통과
  }
}
```

- WP 원본 도메인(`wp-origin.searchtuneos.com`)은 robots `Disallow: /` + `X-Robots-Tag: noindex`로 검색 노출 차단 → canonical은 항상 `searchtuneos.com/blog/{slug}`.
- Worker는 `searchtuneos.com` Zone에 Route 등록: `searchtuneos.com/blog*`.

---

## 4단계 · WordPress 디자인 이식 패키지

Lovable 프로젝트에서 WP 테마 제작자에게 전달할 디자인 토큰 패키지를 다음 파일에서 추출해 `/mnt/documents/blog-migration/design-tokens/`로 묶습니다.

| 토큰 | 출처 |
|---|---|
| 컬러 (HSL semantic) | `src/index.css` (`--primary`, `--accent`, `--score-*` 등) |
| 폰트 | `index.html` link + `tailwind.config.ts` fontFamily |
| 간격·radius | `tailwind.config.ts` extend.spacing/borderRadius |
| 컴포넌트 사양 | `src/components/ui/{button,card,badge,accordion}.tsx` (shadcn) → WP 블록 CSS로 재현 |
| 블로그 레이아웃 | `src/pages/Blog.tsx`, `src/pages/BlogPost.tsx` (목차/관련글/공유 버튼 구조) |
| 헤더/푸터 | `src/components/Navbar.tsx`, Footer (현재 Index.tsx 내) |

전달 산출물:
- `tokens.css` (CSS variables, light/dark)
- `typography.json` (heading scale)
- `components.md` (버튼/카드/CTA 사양서)
- 스크린샷 4종 (목록·상세·모바일 상세·관련글)

→ WP 측에서 **블록 테마(theme.json + 커스텀 블록)** 또는 **Astra/GeneratePress + 커스텀 CSS**로 재현.

---

## 5단계 · 시험 이전 (5~10편)

대상 글 선정 (조건별 1편 이상):
1. 이미지 다수: `imweb-seo-*` 류
2. 코드 블록: `google-search-console-technical-signals-guide-*`
3. 표: `seo-vs-aeo-vs-geo`
4. 내부 링크 다수: `what-is-aeo`, `geo-generative-engine-optimization`
5. 검색 노출 상위: `seo_actions`/SERP 결과에서 상위 3편 추출
6. 글별 OG 이미지 보유: 최근 자동발행 5편

검증 체크리스트 (사람 + 자동):
- 본문/이미지/모바일 ✅
- title/desc/canonical/og:image 글별로 다름 ✅
- Article + Breadcrumb JSON-LD 존재 ✅
- 존재하지 않는 slug → 404 (Lovable NotFound 아님) ✅
- 카카오 디버거 글별 미리보기 ✅
- Google URL 검사 통과 ✅

자동 검증 스크립트: `scripts/verify-wp-migration.mjs` (curl로 5편 fetch → meta 파싱 → diff).

---

## 6단계 · 전체 이전 (119편)

- 도구: **WP All Import Pro** (CSV/XML 매핑) 또는 **WP-CLI `wp import`** (WXR 변환 필요).
- 유지: slug, 발행일(`post_date`), 작성자(없으면 기본 author 매핑 표), 카테고리/태그, featured image, alt, og_image (Yoast `_yoast_wpseo_opengraph-image`).
- 본문 내 `/blog/{slug}.html` 링크 → `/blog/{slug}` 로 일괄 치환 (export 시 처리).
- **Lovable DB `blog_posts` 테이블은 read-only로 유지** (이전 검증 끝날 때까지 백업본 역할). 검증 종료 후 **삭제하지 않고 archived 플래그만 추가**.

---

## 7단계 · URL 전환 & 301

WP 이전 + Worker 배포 완료 후, **Cloudflare Worker에 301 규칙 추가**:

```js
// /blog/{slug}.html → 301 /blog/{slug}
if (/^\/blog\/[^/]+\.html$/.test(url.pathname)) {
  return Response.redirect(url.origin + url.pathname.replace(/\.html$/, ""), 301);
}
```

동시 갱신:
- WP 측: canonical, og:url, Article schema URL, Breadcrumb URL → `https://searchtuneos.com/blog/{slug}`
- WP sitemap(Yoast 자동 생성) → Lovable `public/sitemap.xml` 인덱스에서 `https://searchtuneos.com/blog/sitemap_index.xml` 참조로 교체
- Lovable 측 내부 링크(홈 최신글 카드 등) → 새 URL
- `supabase/functions/sitemap` 의 posts 부분 **출력 중단** (홈/about만 남김)

---

## 8단계 · Lovable ↔ WordPress 연결 범위

WP REST `wp/v2/posts?per_page=6&_embed`만 호출하는 경량 Edge Function 1개 추가:
- `supabase/functions/latest-blog-posts` (5분 캐시) → 홈 최신글 3~6편 / 진단 결과 화면 관련글 추천
- **반환 필드 제한**: `title`, `excerpt`, `link` (절대 URL), `featured_image_url`, `date`만
- Lovable이 본문 렌더링·sitemap·canonical 생성 **절대 금지** (코드 리뷰 가드)

---

## 9단계 · 라이브 전환 안전 게이트

Worker route 활성화 전 다음 자동 점검을 모두 통과해야 함:

```text
[ ] WP 글 수 == Lovable 활성 글 수 (119)
[ ] 119/119 새 URL 200
[ ] 임의 비존재 slug 10건 → 404
[ ] 119/119 .html → 301 → 새 URL
[ ] canonical / og:url 새 URL과 일치
[ ] og:image 119편 모두 unique
[ ] sitemap entry 119 / staging 도메인 0
[ ] wp-origin 도메인 robots Disallow + X-Robots noindex
[ ] 카톡 디버거 스팟체크 10편 OK
[ ] Mobile/Tablet/Desktop 반응형 OK
```

스크립트: `scripts/preflight-blog-switch.mjs` (체크리스트 자동 실행 → 보고서 출력).

---

## 10단계 · 최종 보고 요약

- **문제 원인**: Lovable 정적 호스팅의 SPA fallback이 글별 서버 HTML을 줄 수 없음 (해결 불가, 외부 분기 필요)
- **권장 WP 호스팅**: Cloudways 또는 Kinsta (자체 테마 업로드 + Yoast SEO + WP All Import)
- **`/blog/*` 분기**: Cloudflare Worker (Route `searchtuneos.com/blog*`)
- **외부 설정 필요**: Cloudflare Workers 활성화, Worker Route, WP 원본 도메인 발급(`wp-origin.searchtuneos.com`), WP 측 Yoast/Redirection 플러그인 설치
- **변경할 Lovable 파일** (단계 7~8에서만, 그 전엔 손대지 않음):
  - `public/sitemap.xml` (인덱스에 WP sitemap 참조 추가)
  - `supabase/functions/sitemap/index.ts` (posts 출력 중단)
  - `src/pages/Blog.tsx`, `src/components/`(홈 최신글) — 새 Edge Function 호출로 교체
  - `src/App.tsx` — `/blog`, `/blog/:slug*` Route 제거 (Worker가 처리)
  - 신규: `supabase/functions/latest-blog-posts/index.ts`
- **유지(절대 손대지 않을) 파일**: `src/pages/BlogPost.tsx`, `src/data/blogPosts.ts`, `scripts/prerender-blog.mjs`, `scripts/verify-blog-*.mjs`, `dist/blog/*.html`, `blog_posts` DB 테이블 — **9단계 완전 통과까지 보존**
- **이전 데이터 구조**: 2단계 인벤토리 (json/csv/markdown front-matter)
- **단계별 위험**:
  - 3단계 — Worker 라우팅 실수 시 전체 사이트 다운 → 스테이징 zone에서 먼저 검증
  - 6단계 — slug 충돌 / 발행일 손실 → import 전 dry-run
  - 7단계 — 301 누락 시 색인 손실 → 119/119 자동 검증 통과 후 활성화
- **롤백**: Cloudflare Worker Route 비활성화 한 줄이면 즉시 기존 Lovable `.html` 라이브로 100% 복귀 (Lovable 코드/DB 그대로 유지되므로 무손실)
- **Lovable에서 가능**: 인벤토리 export 스크립트 보강, latest-blog-posts Edge Function, preflight 점검 스크립트, 디자인 토큰 패키지 추출
- **Lovable 외부 작업 필수**: WP 호스팅 계약·설치·테마 제작·Yoast 설정·WP All Import·Cloudflare Worker 배포·도메인 SSL

---

## 이번 계획에서 **하지 않을** 일 (명시)

- 기존 `.html` 파일 / `blog_posts` 테이블 / `prerender-blog.mjs` / sitemap 어떤 것도 **삭제·수정하지 않음**
- 라우트 제거 / canonical 변경 / 301 추가 / WP 커넥터 연결 모두 **별도 승인 후**에만 진행
- 현재 라이브 119편의 색인·OG 동작은 **그대로 보존**

---

## 다음 액션 (사용자 결정 필요)

1. **WP 호스팅 옵션** A(WordPress.com) vs B(관리형, 권장) — 어느 쪽으로 갈지
2. **WP 원본 도메인** 후보 (`wp-origin.searchtuneos.com` 권장)
3. 위 두 가지가 정해지면 → **2단계(export 보강) + 4단계(디자인 토큰 패키지)** 부터 안전하게 착수 가능 (현 라이브 무영향)

승인하시면 빌드 모드로 전환해 2단계 + 4단계 산출물을 먼저 만들겠습니다.
