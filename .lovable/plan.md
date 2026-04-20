

User wants individual login + personal workspace. Currently `useUserSite.ts` uses localStorage (anyone on that browser sees that site). Need real auth.

## 계획: 로그인 + 개인 워크스페이스

### 1. 인증 시스템 (Lovable Cloud Auth)
- **이메일/비밀번호** 기본 (자동 확인 ON — 베타 마찰 줄이기)
- **Google 로그인** 추가 (`lovable.auth.signInWithOAuth("google")`)
- **유저 프로필 불필요**: `auth.users`만 사용 (이름/아바타는 v2)

### 2. DB 변경 (마이그레이션)
- `user_sites`에 `user_id uuid` 컬럼 추가 (nullable, 기존 데이터 호환)
- RLS 재정비:
  - SELECT: 본인 것만 (`auth.uid() = user_id`) + 공개 허브용 익명 SELECT는 site_slug 단일 조회 한정
  - INSERT: `auth.uid() = user_id` 강제
  - UPDATE/DELETE: 본인만
- `site_posts` RLS 재정비:
  - 작성/수정/삭제: site 소유자만 (`EXISTS user_sites WHERE user_id = auth.uid()`)
  - 공개 SELECT: status='published'만 유지

### 3. 신규 페이지
- `/auth` — 로그인/회원가입 (이메일+구글, 탭 형태)
- 기존 `/dashboard/*` 전체를 **인증 게이트**로 보호 (미로그인 → `/auth` 리다이렉트)

### 4. 수정 파일
- `src/features/publish/useUserSite.ts` — localStorage 제거, `auth.uid()`로 본인 사이트 조회
- `src/pages/dashboard/Layout.tsx` — 세션 체크 + 사이드바에 사용자 이메일/로그아웃 버튼
- `src/pages/dashboard/Index.tsx` — 사이트 생성 시 `user_id` 포함, 한 유저당 사이트 1개 정책 (베타)
- `src/components/Navbar.tsx` — 로그인 상태에 따라 "로그인" / "대시보드" 버튼 토글
- `src/App.tsx` — `/auth` 라우트 추가

### 5. 신규 파일
- `src/pages/Auth.tsx` — 로그인/회원가입 UI
- `src/features/auth/useAuth.ts` — 세션 훅 (onAuthStateChange + getSession 순서 준수)
- `src/features/auth/RequireAuth.tsx` — 보호 라우트 래퍼

### 6. 핵심 인증 룰 (중요)
- `onAuthStateChange` 리스너를 `getSession()`보다 **먼저** 등록
- 세션은 localStorage에 자동 저장 (이미 설정됨)
- Google OAuth `redirect_uri: window.location.origin`
- 회원가입 시 `emailRedirectTo: window.location.origin/dashboard`

### 7. 공개 허브는 그대로
`/sites/:siteSlug`는 인증 불필요 — 누구나 published 글 열람

### 빌드 순서
1. 마이그레이션 (user_id 추가, RLS 갱신)
2. Auth 페이지 + 훅 + 보호 래퍼
3. Navbar/Dashboard 통합
4. useUserSite 리팩터
5. Google OAuth 설정 (`configure_social_login` 도구)

### 베타 정책
- 한 유저 = 한 사이트 (변경은 v2)
- 기존 localStorage 사이트는 마이그레이션 안 함 (베타라 데이터 적음, 새로 생성 유도)

승인하면 바로 구현합니다.

