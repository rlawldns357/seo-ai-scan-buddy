---
name: Blog URL Canonical Form
description: Canonical=`/blog/{slug}.html`. Lovable hosting SPA fallback이 디렉토리 index.html보다 우선 → stub 서빙 불가 (확정)
type: constraint
---

# 블로그 URL 정규형 (확정 v3 — 검증 완료)

## 핵심 규칙
- **Canonical (전체 본문)**: `https://searchtuneos.com/blog/{slug}.html` ✅ 정상 작동
- **`/blog/{slug}/`, `/blog/{slug}`**: ❌ **Lovable 호스팅에서 stub 서빙 불가능 (확정)**

## 검증 결과 (2026-05-15)
빌드 시 `dist/blog/{slug}/index.html` stub은 정상 생성·배포되지만, Lovable 호스팅은
디렉토리 index.html보다 SPA fallback(루트 `index.html`)을 무조건 우선 서빙함.

```
curl https://searchtuneos.com/blog/what-is-aeo/    → 200, 메인페이지 title (SPA fallback)
curl https://searchtuneos.com/blog/what-is-aeo     → 200, 메인페이지 title (SPA fallback)
curl https://searchtuneos.com/blog/what-is-aeo.html → 200, 글 메타 정상
```

`_redirects`/`_headers`/`vercel.json`/`netlify.toml` 모두 무시 → 서버 레벨 redirect 불가.

## 운영 정책
1. **canonical은 반드시 `.html`** (모든 sitemap, RSS, 내부 링크, og:url, JSON-LD)
2. **`BlogPost.tsx`의 useEffect로 클라이언트 normalize** — SPA로 진입한 사용자는 마운트 후 `.html`로 주소창 교체 (이미 구현됨)
3. **`/blog/{slug}/` stub은 빌드 산출물에 남아있지만 호스팅이 무시함** — 제거하지는 않음 (다른 호스팅 이전 시 즉시 사용 가능)
4. **404 방지**: `STATIC_POSTS`/DB/sitemap에 없는 레거시 slug(`src/data/blogPosts.ts` 전용)는 `.html` 파일이 생성 안 됨 → 노출 링크에서 제거하거나 STATIC_POSTS에 추가

## 진정한 해결책 (필요 시)
Cloudflare Pages 등 `_redirects` 지원 호스팅으로 이전 후:
```
/blog/:slug/   /blog/:slug.html  308
/blog/:slug    /blog/:slug.html  308
```

## 절대 금지
- canonical을 `.html` 외 다른 형태로 쓰는 모든 코드
- `/blog/{slug}/index.html`에 본문 전체 복사 (중복 색인)
