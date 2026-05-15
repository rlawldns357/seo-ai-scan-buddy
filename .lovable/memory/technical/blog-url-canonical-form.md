---
name: Blog URL Canonical Form
description: 블로그 canonical=`/blog/{slug}.html` (전체 본문). `/blog/{slug}/index.html`은 redirect stub만
type: constraint
---

# 블로그 URL 정규형 (확정 v2)

## 핵심 규칙
- **Canonical (전체 본문)**: `https://searchtuneos.com/blog/{slug}.html`
- **`/blog/{slug}/index.html`**: redirect stub (메타 + canonical + http-equiv refresh + JS replace). 본문 중복 금지.
- **`/blog/{slug}` (확장자 없음)**: 파일시스템 충돌로 별도 stub 작성 불가. 호스팅이 디렉토리 index.html 또는 SPA fallback로 라우팅 → 둘 다 결국 `.html`로 수렴.

## 왜 stub 분리?
- `/blog/{slug}/index.html`이 전체 본문을 가지면 네이버/구글이 중복 콘텐츠로 색인 → canonical 신호 약화
- stub만 두면 크롤러는 canonical → `.html`만 보고, 사용자는 즉시 redirect

## 적용 위치
1. `scripts/prerender-blog.mjs` — `generateRedirectStub()` (`/blog/{slug}/index.html` 작성)
2. `src/pages/BlogPost.tsx` — `blogPostPath() = /blog/{slug}.html`, useEffect로 주소창 자동 normalize
3. `src/pages/Blog.tsx` / `Admin.tsx` — 모든 카드/링크 `.html`
4. sitemap (`generate-sitemap.mjs`, `supabase/functions/sitemap`) — `.html` only
5. RSS — `.html` only
6. `scripts/verify-blog-routing.mjs` — stub과 full 양쪽 canonical/og:url 일치 검증

## 절대 금지
- `/blog/{slug}/index.html`에 본문 전체 복사 (중복 색인 위험)
- 확장자 없는 물리 파일 `dist/blog/{slug}` (디렉토리와 경로 충돌 + 일부 호스팅이 octet-stream으로 응답)
- canonical을 `.html` 외 다른 형태로 쓰는 모든 코드

## 배포 후 검증
```bash
curl -A "facebookexternalhit/1.1" -s https://searchtuneos.com/blog/what-is-aeo.html | grep -E "canonical|og:url"
# → both .html

curl -A "facebookexternalhit/1.1" -s https://searchtuneos.com/blog/what-is-aeo/ | grep -E "canonical|refresh"
# → canonical .html + refresh 0; url=/blog/...html

curl -A "facebookexternalhit/1.1" -s https://searchtuneos.com/blog/what-is-aeo | grep -E "canonical|refresh"
# → 가능: stub. 불가능: SPA fallback (BlogPost.tsx가 클라에서 normalize)
```
