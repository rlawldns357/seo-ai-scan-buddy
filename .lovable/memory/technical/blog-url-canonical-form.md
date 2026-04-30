---
name: Blog URL Canonical Form
description: 블로그 공유 URL 정규형 — `/blog/{slug}/index.html` 명시 경로만 카카오/페북 OG 정상 동작
type: constraint
---

# 블로그 URL 정규형 (확정)

## 핵심 규칙
**모든 블로그 공유 URL은 `https://searchtuneos.com/blog/{slug}/index.html` 형태여야 한다.**

## 왜?
Lovable Hosting (정확히는 publish 인프라)이 다음과 같이 동작:
- `/blog/{slug}` (확장자 없음) → `application/octet-stream`으로 응답 (= 카톡에서 다운로드 버그 발생)
- `/blog/{slug}.html` (직접 파일) → SPA fallback에 가려서 home OG 노출
- `/blog/{slug}/` (디렉토리, trailing slash) → 일부 환경에서 SPA root로 빠짐
- ✅ `/blog/{slug}/index.html` (명시) → `text/html` + 글 전용 OG 정상 (카카오 디버거 검증 완료 2026-04-30)

## 적용 위치 (절대 깨지면 안 됨)
1. `src/pages/BlogPost.tsx` — `blogPostPath()` + `useEffect` 주소창 자동 정규화 (`/blog/{slug}/index.html`로 navigate replace)
2. `src/pages/Blog.tsx` — 카드 링크
3. `src/pages/Admin.tsx` — 미리보기 링크
4. `scripts/prerender-blog.mjs` — `dist/blog/{slug}/index.html`로 출력. **확장자 없는 파일(`dist/blog/{slug}`) 생성 금지** (다운로드 버그 원인)
5. `scripts/generate-sitemap.mjs` + `supabase/functions/sitemap/index.ts` — sitemap loc
6. `scripts/verify-blog-og.mjs` + `verify-blog-routing.mjs` — 빌드 검증

## 검증 방법
- 카카오 공유 디버거: https://developers.kakao.com/tool/debugger/sharing
- `https://searchtuneos.com/blog/{slug}/index.html` 입력 → "캐시 초기화" → Content-Type `text/html; charset=utf-8` + 글별 OG 이미지 표시되면 OK

## 절대 하지 말 것
- 확장자 없는 정적 파일 (`dist/blog/{slug}`) 생성
- `/blog/{slug}.html` 단독 파일 권장 형태로 사용
- trailing slash만 있는 형태(`/blog/{slug}/`)로 og:url/canonical 설정
