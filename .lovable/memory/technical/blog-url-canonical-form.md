---
name: Blog URL Canonical Form
description: Canonical=`/blog/{slug}.html`. Lovable host serves .html directly; clean URLs SPA-fallback to homepage HTML (breaks SEO). All canonical/og/sitemap/RSS/internal links use .html
type: constraint
---

# 블로그 URL 정규형 (확정 v5 — .html canonical, Lovable hosting reality)

## 왜 .html인가
- **Lovable 호스팅의 SPA fallback**: 확장자 없는 deep path(`/blog/{slug}` 또는 `/blog/{slug}/`)는 **무조건 루트 `/index.html`**(=홈페이지)로 폴백됨. 중첩 디렉토리의 index.html을 default document로 서빙하지 않음
- 결과적으로 clean URL은 홈페이지 title/description/canonical/og를 반환 → per-route SEO 깨짐
- `.html` 파일은 정상적으로 직접 서빙됨 → 유일하게 작동하는 canonical 형태

## 핵심 규칙
- **Canonical / og:url / twitter:url**: `https://searchtuneos.com/blog/{slug}.html`
- **빌드 산출물**:
  - `dist/blog/{slug}.html` — canonical full article body
  - `dist/blog/{slug}/index.html` — meta-refresh + JS redirect stub → canonical `.html`
- **SPA 라우팅**: `/blog/{slug}` 진입 시 `BlogPost.tsx` useEffect가 `/blog/{slug}.html` 로 즉시 `navigate(..., {replace:true})`

## 코드 위치
- `BlogPost.tsx`: `blogPostPath(slug) = /blog/${slug}.html` / `blogPostUrl = https://searchtuneos.com/blog/${slug}.html`
- `Blog.tsx`: 동일
- `App.tsx`: 3 routes (`:slug.html`, `:slug/index.html`, `:slug`) 유지 — clean URL 진입 시 normalize redirect
- Edge functions: `sitemap`, `rss`, `blog-share`, `submit-indexnow` 전부 `.html`
- Build scripts: `prerender-blog.mjs`, `generate-sitemap.mjs`, `verify-blog-og.mjs`, `verify-blog-routing.mjs` 모두 `.html` 기준

## 절대 금지
- 새 코드에서 `/blog/${slug}` (확장자 없음) 형태 canonical/og:url/sitemap entry 생성
- `dist/blog/{slug}/index.html`에 full article body 출력 (반드시 redirect stub)
- canonical과 og:url을 서로 다른 형태로 지정
