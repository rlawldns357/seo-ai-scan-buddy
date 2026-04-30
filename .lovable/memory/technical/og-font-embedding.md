---
name: OG SVG Font Embedding
description: 모든 OG SVG에 Pretendard/Noto Sans KR 웹폰트를 @font-face/@import로 임베드해 외부 OG 크롤러(카톡/페북/트위터/슬랙)에서도 한글이 깨지지 않도록 강제
type: technical
---

## 문제
SVG `<text font-family="'Pretendard','Noto Sans KR'">` 만으로는 외부 OG 렌더러가 시스템에 해당 폰트가 없을 때 한글이 □□로 깨진다. 카톡/페북/트위터/슬랙은 자체 서버에서 SVG를 PNG로 래스터라이즈하므로 우리 사이트의 폰트 로딩과 무관하다.

## 해결
`supabase/functions/_shared/og-design-rulebook.ts`의 `FONT_EMBED` 상수를 모든 OG SVG의 `<svg>` 직속 자식으로 prepend.

```xml
<defs>
  <style type="text/css"><![CDATA[
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap');
    @font-face {
      font-family: 'Pretendard';
      font-weight: 400 900;
      font-display: swap;
      src: url('https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2') format('woff2-variations');
    }
  ]]></style>
</defs>
```

## CDN 결정 근거
- ✅ `cdn.jsdelivr.net/npm/pretendard@1.3.9/...` — HTTP 200, CORS `*`
- ❌ `cdn.jsdelivr.net/gh/orioncactus/pretendard/...` — HTTP 403 (jsdelivr가 일부 GitHub raw woff2 차단)
- ✅ `fonts.googleapis.com/css2?family=Noto+Sans+KR&family=Inter` — HTTP 200, 보편적

## 폰트 우선순위 (font-family 스택)
1. **Pretendard** — 한국어 표준 (jsdelivr CDN)
2. **Noto Sans KR** — Google Fonts 보편 폴백
3. **Inter** — 영문 brand-clean
4. **Apple SD Gothic Neo, -apple-system** — macOS/iOS 시스템 폴백
5. **sans-serif** — 최종 폴백

## 적용 범위
- `buildBrandSplitSvg` (미니멀 단일 패널, 메인 OG) ✓
- `buildGradientSvg` (SearchTune OS 풀 그라데이션 폴백) ✓
- 두 빌더 모두 `<svg>` 바로 다음에 `${FONT_EMBED}` 주입

## 검증 (2026-04-30)
- `og-svg` endpoint: FONT_EMBED 정상 주입 확인 (`@import`, `@font-face` 둘 다 grep ✓)
- 브라우저 직접 렌더: 한글/영문 모두 Pretendard 적용 ✓
- 발행된 모든 글 OG (57개) FONT_EMBED 적용해서 재생성 완료
- 외부 검증 권장: Facebook Sharing Debugger, Twitter Card Validator로 실제 미리보기 확인

## 주의
- 외부 폰트 fetch가 막힌 환경(에어갭 서버 등)에서는 시스템 폴백으로 떨어짐 — 이때도 한국어 시스템 폰트가 있으면 한글은 깨지지 않음 (font-family 스택의 마지막 안전망 역할)
- `font-display: swap` 으로 폰트 로딩 지연 시에도 텍스트는 즉시 보임
