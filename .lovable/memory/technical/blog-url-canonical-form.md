---
name: Blog URL Canonical Form
description: Canonical=`/blog/{slug}` (clean URL). Cloudflare 301s legacy `.html` → clean. All internal links/sitemap/RSS/og:url must omit `.html`
type: constraint
---

# 블로그 URL 정규형 (확정 v4 — clean URL)

## 핵심 규칙
- **Canonical / og:url / twitter:url**: `https://searchtuneos.com/blog/{slug}` (no `.html`, no trailing slash)
- **Legacy `/blog/{slug}.html`**: Cloudflare에서 301 → clean URL로 redirect됨. 앱은 `.html` URL을 **새로 생성하지 않음**
- **og:image / twitter:image**: 절대 영향 없음. Supabase Storage / og-svg endpoint URL 그대로 유지

## 빌드 산출물 구조
- `dist/blog/{slug}/index.html` — **canonical 본문** (전체 HTML + Article JSON-LD + canonical/og 모두 clean URL)
- `dist/blog/{slug}.html` — **생성하지 않음** (Cloudflare 301 처리)

## 코드 위치
- `BlogPost.tsx`: `blogPostPath(slug) = /blog/${slug}` / `blogPostUrl(slug) = https://searchtuneos.com/blog/${slug}`
- `Blog.tsx`, `Admin.tsx`: 동일 형식 사용
- `App.tsx`: 3 route 유지 (`:slug`, `:slug.html`, `:slug/index.html`) — legacy 진입 시 useEffect가 clean URL로 normalize
- Edge functions: `sitemap`, `rss`, `blog-share`, `submit-indexnow` 모두 `.html` 없음
- Build scripts: `prerender-blog.mjs`, `generate-sitemap.mjs`, `verify-blog-og.mjs`, `verify-blog-routing.mjs` 모두 clean URL 기준

## 절대 금지
- 새 코드에서 `/blog/${slug}.html` 형태 URL 생성
- Asset/이미지/og:image URL에 `.html` 변환 적용 (slug 변환은 텍스트 URL에만 적용)
- canonical과 og:url을 서로 다른 형태로 지정
