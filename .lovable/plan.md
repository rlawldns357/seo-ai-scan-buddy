

옵션 C 채택. 같은 프로젝트 내 모듈 폴더 분리로 빌드.

## 1단계 빌드 범위 (이번 작업)

### 라우팅
```text
/dashboard                  → 진입 (URL 입력 + 내 사이트 카드)
/dashboard/recommendations  → 분석 기반 콘텐츠 아이디어
/dashboard/content          → AI 글 생성/편집
/dashboard/auto-publish     → 발행 큐 + 발행 실행
/dashboard/reports          → 성과 리포트
/sites/:siteSlug            → 공개 콘텐츠 허브
/sites/:siteSlug/:postSlug  → 개별 글
```

### DB (마이그레이션)
- **user_sites**: id, owner_email, site_url, site_slug(unique), title, created_at
- **site_posts**: id, site_id(FK), slug, title, excerpt, content(md), status(draft/queued/published), source_axis, og_image, published_at, created_at
- RLS:
  - `user_sites`: anon SELECT(true), anon INSERT(이메일 검증 + 슬러그 길이)
  - `site_posts`: anon SELECT(status='published'만), anon INSERT(site 존재 확인)
  - service_role ALL

### Edge Functions (신규 2개)
- `generate-content-draft`: Lovable AI(`google/gemini-3-flash-preview`, temp=0)로 제목/메타/본문(md) 생성. 분석 결과 + 타겟 축 입력
- `publish-site-post`: site_posts.status='published', published_at=now() 업데이트 (게시 한도 체크 포함)

### 폴더 구조
```text
src/
  pages/
    dashboard/
      Layout.tsx
      Index.tsx
      Recommendations.tsx
      Content.tsx
      AutoPublish.tsx
      Reports.tsx
    sites/
      SiteHub.tsx
      SitePost.tsx
  features/
    publish/
      AppSidebar.tsx
      HeroSection.tsx
      LockedFeature.tsx
      useUserSite.ts
      api.ts
```

### 핵심 동작
1. `/dashboard` 진입 → 사이트 URL 입력 → 이메일 게이트 → user_sites 생성 → site_slug 발급
2. Recommendations: `analysis_history` 최신 row 조회 → AI로 콘텐츠 아이디어 5개 카드 → "글로 만들기" 클릭 시 Content로 이동(쿼리 파라미터)
3. Content: `generate-content-draft` 호출 → 마크다운 에디터 → "발행 큐" 버튼 → site_posts(status=queued)
4. Auto Publish: 큐 리스트 + "지금 발행" → `publish-site-post` 호출 → status=published
5. Reports: 발행 글 수 / 분석 점수 추이 (`chart.tsx`) / PDF 내보내기 (`generateReportPdf` 재활용)
6. `/sites/:siteSlug`: 공개 페이지, JSON-LD 포함, prerender 대상에 추가

### 게이팅 (베타)
- Recommendations 미리보기: 누구나
- Content 생성: 1건 무료, 그 이상은 이메일 등록 (기존 lead 흐름)
- Auto Publish: 이메일 등록 + 사이트당 월 5건 한도

### 네비게이션
- Navbar에 "Product" 링크 + 작은 PRO 배지 → `/dashboard`
- 기존 분석 결과 화면은 그대로 유지 (변경 없음)

### 재활용 자산
- `generateReportPdf.ts` (Reports 내보내기)
- `analysis_history` 테이블 (Recommendations 데이터 소스)
- `JsonLd.tsx`, `prerender-blog.mjs` (공개 허브 SEO)
- 기존 admin/lead 모달 패턴 (이메일 게이트)

### 이번에 만들 파일
신규 11개:
- `src/pages/dashboard/Layout.tsx`
- `src/pages/dashboard/Index.tsx`
- `src/pages/dashboard/Recommendations.tsx`
- `src/pages/dashboard/Content.tsx`
- `src/pages/dashboard/AutoPublish.tsx`
- `src/pages/dashboard/Reports.tsx`
- `src/pages/sites/SiteHub.tsx`
- `src/pages/sites/SitePost.tsx`
- `src/features/publish/AppSidebar.tsx`
- `src/features/publish/LockedFeature.tsx`
- `src/features/publish/useUserSite.ts`
- `supabase/functions/generate-content-draft/index.ts`
- `supabase/functions/publish-site-post/index.ts`
- 마이그레이션: user_sites + site_posts + RLS

수정 2개:
- `src/App.tsx` — 라우트 추가
- `src/components/Navbar.tsx` — Product 링크 + PRO 배지

### 2단계 (다음 차례, 이번 범위 아님)
- 스케줄 발행 (pg_cron)
- 자동 OG 이미지 생성
- 색인 자동 핑(submit-indexnow 재활용)
- `/sites/*` prerender 통합
- 사이트 단위 sitemap

승인하면 바로 1단계 전부 구현합니다.

