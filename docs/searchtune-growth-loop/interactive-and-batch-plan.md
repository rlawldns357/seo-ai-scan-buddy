# Interactive Blog Engine + Batch Optimization Plan

## 방향

SearchTune OS 블로그는 단순 텍스트형 SEO 글이 아니라, 검색 의도 이해를 돕는 작은 인터랙션을 붙이는 방향으로 간다.

단, crawler-facing HTML에 핵심 텍스트가 남아야 하고 JS가 없어도 본문은 읽혀야 한다.

## 인터랙션 타입 v0

1. `checklist`
   - SEO 체크리스트, Naver 제출 체크리스트, AEO 준비도 체크
   - 본문에는 일반 체크박스 리스트로 남기고 React에서 향상(enhance)

2. `comparison_toggle`
   - SEO/AEO/GEO 차이 비교
   - 표 fallback + 토글 UI 향상

3. `flow_animation`
   - 검색엔진 → AI 답변엔진 → 인용 구조 흐름
   - 정적 단계 리스트 fallback

4. `canonical_demo`
   - `/blog/slug` vs `/blog/slug.html` 차이 설명
   - URL 정책 관련 글에만 사용

5. `mini_calculator`
   - 간단한 위험도/준비도 계산
   - 결과는 UX 보조용, SEO 본문 핵심 아님

## Git 작업 시작 범위

이번 브랜치 `seo/growth-loop-engine-20260521`에서 시작한 것:

- `scripts/audit-blog-growth-loop.mjs`
  - static corpus 14개 글의 TL;DR, authority link, 내부링크, FAQ, heading 상태를 점검
  - 결과: `reports/blog-growth-loop-audit.json`
- live sitemap 샘플 점검
  - 결과: `reports/live-sitemap-audit-sample.json`
- docs 설계
  - audit schema
  - growth loop DB design
  - Lovable request

다음 코드 작업 후보:

- `src/components/blog/InteractiveChecklist.tsx`
- `src/components/blog/SeoFlowAnimation.tsx`
- `src/components/blog/CanonicalUrlDemo.tsx`
- `src/lib/blogInteractions.ts`
- `src/pages/BlogPost.tsx`에 안전한 shortcode parser 추가

## shortcode 규칙 후보

Markdown 안에 아래처럼 쓰면 React 컴포넌트로 향상한다.

```md
::interactive-checklist{type="aeo-readiness" title="AEO 준비도 체크"}
- [ ] 첫 문단에 직접 답변이 있다
- [ ] FAQ 4개 이상이 있다
- [ ] 공식 출처 링크가 있다
::
```

fallback 원칙:

- shortcode 내부 항목은 마크다운 체크리스트로도 읽혀야 함
- 빌드 실패 시 일반 본문만 보여도 SEO 손상 없어야 함

## 첫 배치 최적화 대상

### Batch A — AEO cluster

1. `what-is-aeo`
   - target: `AEO란`
   - 액션: TL;DR 추가, official source 1~2개, 내부링크 3개, AEO 체크리스트 인터랙션 후보

2. `seo-vs-aeo-vs-geo`
   - target: `SEO AEO GEO 차이`
   - 액션: authority link 추가, 비교 토글/표 후보, clean URL risk 설명 내부 링크

3. `faq-schema-aeo-boost`
   - target: `FAQ 스키마 AEO`
   - 액션: schema.org/Google official link, 내부링크, FAQ 체크리스트

### Batch B — technical/indexing

1. clean URL fallback risk
   - `/blog/what-is-aeo`
   - `/blog/seo-vs-aeo-vs-geo`
   - Lovable/CDN가 redirect를 못 하면 `.html` canonical 일관성 유지 + known risk 추적

2. sitemap mismatch
   - `cafe24-seo-optimization-guide.html` live sitemap 포함 여부 추적

## 대량 관리 원칙

- 대량 스캔은 매일 가능
- 대량 수정은 금지
- 수정은 클러스터별 3~5개 단위
- 한 배치마다 build, route, sitemap, OG verification 필수
- 성과 확인 후 engine rule로 승격
