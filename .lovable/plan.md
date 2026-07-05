
## 결론: 인블로그 리다이렉트는 무죄입니다

### 1) 인블로그 리다이렉트 조회 결과 (총 150건)

- **역방향/와일드카드 0건**: `to_path`가 `.html`로 끝나는 항목 **0개**, `*` 포함 항목 **0개**
- **전부 정상 방향**: `/blog/{slug}.html → /{slug}` (308)
- 샘플:
  ```
  /blog/hreflang-tag-international-seo-strategy.html  →  /hreflang-tag-international-seo-strategy  (308)
  /blog/seo-canonical-tag-duplicate-content-ranking.html → /seo-canonical-tag-duplicate-content-ranking (308)
  /blog/robots-txt-master-seo-advanced-guide.html → /robots-txt-master-seo-advanced-guide (308)
  ```
- 이 리다이렉트는 **inblog.ai 서브도메인 내부에서만** 발동함. `searchtuneos.com` / `searchtuneos.lovable.app` 하고는 무관.

### 2) publish-to-inblog의 리다이렉트 생성 코드 (인용)

`supabase/functions/publish-to-inblog/index.ts` — 방향 문제 없음:

```ts
redirect = await inblogFetch("/redirects", apiKey, {
  method: "POST",
  body: JSON.stringify({
    data: {
      type: "redirects",
      attributes: {
        from_path: `/blog/${post.slug}.html`,
        to_path: `/${post.slug}`,
        redirect_type: 308,
      },
    },
  }),
});
```

`.html → clean`. 코드도 결과도 정상.

### 3) 진짜 원인: 사이트 자체 로직

Cloudflare/Lovable 호스팅 헤더 직접 확인 결과:

| 경로 | 상태 |
|---|---|
| `/blog/{slug}` | 200 (SPA) |
| `/blog/{slug}.html` | 200 (SPA fallback) |
| `/blog/category/seo` | 200 (SPA — 하지만 매칭 라우트 없음) |
| `/blog/category/seo.html` | **404** (호스팅이 확장자 있는 경로를 파일로 취급 → SPA fallback 미적용) |

호스팅 레벨에는 308 리다이렉트가 존재하지 않습니다. 유저가 본 308은 **클라이언트 JS가 만든 것**.

**포스트 케이스** — `src/pages/BlogPost.tsx:600-606`:
```ts
useEffect(() => {
  if (!slug) return;
  const canonical = blogPostPath(slug);           // → `/blog/${slug}.html`
  if (location.pathname !== canonical) {
    window.location.replace(canonical + location.search + location.hash);
  }
}, [slug, location.pathname, ...]);
```
`/blog/{slug}` 진입 시 하드 리로드로 `.html`을 다시 요청. `.html`은 실제로 200을 주지만, 여기서 fetch 실패나 slug 미매칭이면 클라이언트 404 UI가 뜸.

**카테고리 케이스** — `src/App.tsx:58-61`:
```tsx
<Route path="/blog" element={<Blog />} />
<Route path="/blog/:slug.html" element={<BlogPost />} />
<Route path="/blog/:slug/index.html" element={<BlogPost />} />
<Route path="/blog/:slug" element={<BlogPost />} />
```
`/blog/category/:cat` 라우트가 **없음**. `/blog/category/seo`는 어느 라우트에도 매칭 안 되어 `NotFound`로 떨어지거나 (혹은 다른 로직이 `.html`을 붙임) 최종적으로 유저가 `.html` 404 화면을 목격.

### 4) 다음 액션(승인 시)

1. **인블로그 리다이렉트 150건은 그대로 유지** (건드리지 않음).
2. `src/pages/BlogPost.tsx`의 `window.location.replace(...)` 하드 리다이렉트 로직 재검토 — 정말 `.html`로 강제해야 하는지, 아니면 clean URL을 canonical로 두고 SPA로 렌더할지 결정.
3. `/blog/category/:category` 라우트 추가 (또는 카테고리 링크가 있다면 해당 링크 목적지 확인). 어느 페이지에서 카테고리 URL을 만드는지 grep 필요.
4. 수정 후 3개 경로(`/blog/{slug}`, `/blog/{slug}.html`, `/blog/category/seo`) 브라우저 재현으로 검증.

**빌드 모드 승인 필요**: 위 2/3번 수정에 착수하려면 build mode로 전환해주세요. 그 전에 어느 방향(clean URL canonical vs .html canonical) 선호하시는지 알려주시면 좋습니다.
