---
name: Blog Naver Rulebook Compliance
description: BlogPost.tsx renders content per Naver Webmaster Rulebook — alt fallback, anchor enrichment, semantic time
type: feature
---

# 블로그 네이버 룰북 100% 준수

`src/pages/BlogPost.tsx`는 네이버 웹마스터 공식 룰북에 따라 렌더링됨. 마크다운 파서 수정 시 아래 규칙 절대 깨지면 안 됨.

## 적용된 규칙

1. **이미지 alt 폴백** (`deriveAltFromSrc`)
   - `![](src)` 처럼 alt 비어있으면 파일명에서 자동 추출
   - `hero-image.png` → `hero image`
   - 빈 alt 절대 금지

2. **앵커 텍스트 보강** (`enrichAnchorText`)
   - "여기/이곳/클릭/더보기/here/click here/read more/link" 등 무의미 anchor는 도메인 자동 부착
   - `[여기](https://naver.com)` → `여기 (naver.com)`

3. **`<time datetime="">` 시맨틱**
   - 날짜는 `<time>` 태그로 마크업, ISO 날짜 attribute 필수

## 이미 갖춰진 것 (수정 금지)
- canonical 태그 (`<link rel="canonical">`)
- BreadcrumbList JSON-LD (Helmet 안)
- Article + FAQPage JSON-LD
- Single H1, semantic main/article/nav/footer
- 외부링크 `rel="noopener noreferrer"`
- 이미지 `loading="lazy" decoding="async"`
