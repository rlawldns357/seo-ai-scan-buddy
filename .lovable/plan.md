

User provided full marketing copy + flow. This is the **landing/marketing page** for the Auto Publish product (`/dashboard`). Currently `/dashboard/Index.tsx` is a bare site-creation form. Need to transform it into a full marketing landing that converts to signup, with the signup form integrated.

## 빌드 계획: Auto Publish 랜딩 페이지

### 위치
- **로그인 안 한 상태**: `/dashboard` 진입 시 RequireAuth가 `/auth`로 보내는 대신, 마케팅 랜딩을 보여주고 CTA → `/auth` 이동
- **로그인 한 상태**: 기존 사이트 생성 폼 + 내 사이트 카드 유지

→ `/dashboard/Index.tsx`를 **두 분기 렌더링**으로 재구성:
- 미로그인: 풀 마케팅 랜딩 (히어로 + 5단계 + 핵심가치 + FAQ + 마지막 CTA)
- 로그인: 기존 폼/카드

### RequireAuth 조정
- `/dashboard` 루트만 인증 없이 접근 가능 (랜딩 노출용)
- 하위 라우트(`/dashboard/recommendations`, `/content`, `/auto-publish`, `/reports`)는 RequireAuth 유지
- → `Layout.tsx`의 RequireAuth 래핑을 라우트 단위로 분리

### 섹션 구성 (단일 페이지)

**1. Hero (메인 헤드라인 A — 진단 연결)**
- H1: "진단에서 끝나지 말고, 콘텐츠 운영까지 자동화하세요"
- Sub: "SEO·AEO·GEO 관점에서 필요한 콘텐츠를 찾고, SearchTuneOS 전용 페이지에 자동으로 발행해 사이트 운영을 더 쉽게 시작할 수 있습니다."
- CTA: [내 사이트 연결하기] → `/auth?next=/dashboard` / [어떻게 동작하는지 보기] → 페이지 내 `#how` 스크롤
- 우측: 모의 대시보드 카드 일러스트 (CSS-only, 콘텐츠 카드 3개 stack)

**2. 가치 제안 (헤드라인 B — 블로그 불필요)**
- H2: "블로그를 따로 구축하지 않아도, 콘텐츠 운영은 바로 시작할 수 있습니다"
- Sub + 보조 문구 2줄

**3. 작동 방식 5단계 (`#how`)**
- H2: "설정은 간단하고, 운영은 자동입니다"
- 5개 단계 카드 (번호 + 제목 + 설명) — 데스크톱 5열 / 모바일 세로 스택
- 아이콘: Link2, Settings, Sparkles, FileText, CheckCircle2 (lucide-react, 이미 설치됨)

**4. 적합 대상 (섹션 D)**
- H2: "이런 분들에게 잘 맞습니다"
- 4개 체크 리스트 항목

**5. 핵심 가치 3개 (섹션 E)**
- 3-column 카드: 빠른 시작 / 자동 발행 / 가벼운 실험
- 아이콘 + 제목 + 한 줄 설명

**6. FAQ (섹션 F)**
- 기존 `accordion.tsx` (shadcn) 사용
- 3개 항목 (자체 페이지 발행 / 자동 강제 여부 / 어떤 글)

**7. 마지막 CTA (섹션 G)**
- H2: "내 사이트용 콘텐츠 운영, 오늘 바로 시작해보세요"
- 서브카피
- 버튼: "지금 가입하기" → `/auth` (유료 옵션은 추후 — v2 노트만, 지금은 무료 베타로 표기)

### 디자인 토큰
- 기존 디자인 시스템 준수 (`max-w-4xl` 데스크톱, `px-2` 모바일, `rounded-full` Toss-style 버튼, `h-10`)
- 섹션 간 spacing: `py-16 md:py-24`
- Hero는 `py-20 md:py-32`, 시각적 무게 강조
- 카드: `border border-border/50 bg-card rounded-2xl`
- 1424px 뷰포트 → 5단계 가로 배치 가능

### 신규 컴포넌트 (재사용 위해 분리)
- `src/features/publish/landing/Hero.tsx`
- `src/features/publish/landing/HowItWorks.tsx`
- `src/features/publish/landing/AudienceFit.tsx`
- `src/features/publish/landing/ValueCards.tsx`
- `src/features/publish/landing/LandingFaq.tsx`
- `src/features/publish/landing/FinalCta.tsx`
- `src/features/publish/landing/MarketingLanding.tsx` (조립)

### 수정 파일
- `src/pages/dashboard/Index.tsx` — `useAuth()` 분기: 미로그인 → `<MarketingLanding />`, 로그인 → 현행 폼/카드
- `src/pages/dashboard/Layout.tsx` — `/dashboard` 루트는 RequireAuth 우회. `<Outlet />` 부분만 보호. 사이드바도 미로그인 시 숨김 → 미로그인 사용자는 풀스크린 랜딩만 봄
- `src/App.tsx` — 라우트 구조 조정: `/dashboard` 루트는 RequireAuth 없이, 하위 라우트만 보호된 Layout 안에

### SEO
- `<Helmet>` title: "Auto Publish — 진단에서 콘텐츠 운영까지 | SearchTune OS"
- meta description: 첫 서브카피 활용
- H1 단 1개 (Hero)

### Navbar 연결
- 이미 "Product PRO" 링크 존재 → 그대로 `/dashboard`로 유지 (랜딩이 자연스럽게 노출됨)

### 범위 외 (이번 안 함)
- "발행 규칙 설정"(2단계) 실제 기능 — 마케팅 카피만, 실제 구현은 v2
- 유료 결제 — 버튼은 "지금 가입하기 (베타 무료)"로 표기
- 실제 자동 발행 스케줄러 — 기존 수동 발행 유지

승인하면 바로 빌드합니다.

