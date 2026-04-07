# SearchTune OS — v0.10.0-beta

## 블로그 자동 생성 & 색인 규칙

### 생성 규칙
- **생성 빈도**: 매일 2회 (오전 08:50, 오후 05:30 KST)
- **일일 한도**: 최대 2개/일 (`MAX_POSTS_PER_DAY = 2`)
- **중복 방지**: 최근 50개 게시물 제목 + 최근 5개 카테고리 비교, 같은 카테고리 연속 발행 방지
- **읽기 시간**: 2~4분 제한 (이탈 방지)
- **AI 모델**: google/gemini-2.5-flash (Lovable AI Gateway)
- **작성자**: 김도윤(SEO 전략가), 박서연(콘텐츠 마케터), 이준혁(테크니컬 SEO 엔지니어) — 3명 로테이션, 같은 날 중복 방지
- **FAQ**: 5~7개 자동 생성, 본문에서 FAQ 섹션 자동 제거 후 구조화된 FAQ만 하단에 추가
- **콘텐츠 정리**: 마크다운 아티팩트(****/빈 볼드 등) 자동 정리, excerpt 160자 제한

### 색인 제출 규칙 (블로그 생성 시 자동 실행)
- **IndexNow API** → Bing, 네이버 즉시 알림
- **Google Sitemap Ping** → `https://www.google.com/ping?sitemap=...` 호출
- **동적 사이트맵** → `/sitemap.xml` Edge Function으로 실시간 블로그 URL 포함
- 제출 실패 시 non-blocking (에러 로그만 남기고 진행)

### SEO 메타태그 규칙 (react-helmet-async)
- **모든 페이지**에 동적 `<title>`, `<meta description>`, `<link canonical>`, OG 태그 필수
- **Blog 목록** (`/blog`): CollectionPage JSON-LD + BreadcrumbList
- **Blog 개별 글** (`/blog/:slug`): Article JSON-LD + FAQ JSON-LD(있는 경우) + BreadcrumbList(홈→블로그→글제목)
- OG image는 썸네일이 있으면 사용, 없으면 기본 og-image.png 폴백
- `<title>` 형식: `{글제목} – 서치튠OS 블로그` (60자 이내 권장)
- 블로그 자동 생성 시 excerpt가 meta description으로 사용되므로 160자 이내로 작성

### 관련 파일
- `supabase/functions/generate-blog-post/index.ts` — 블로그 생성 + IndexNow 호출
- `supabase/functions/submit-indexnow/index.ts` — IndexNow + Google ping 제출
- `supabase/functions/sitemap/index.ts` — 동적 사이트맵 생성

## 분석 엔진 자동 업데이트 시스템

### 아키텍처
- **engine_config 테이블**: 분석 프롬프트와 스코어링 기준을 DB에 저장 (동적 로딩)
- **engine_update_log 테이블**: 모든 업데이트 이력 기록 (버전, 변경 요약, 발견된 트렌드)
- **analyze-site**: DB에서 최신 프롬프트를 읽어 분석 실행 (DB 실패 시 하드코딩 폴백)
- **update-analysis-engine**: 트렌드 서치 → AI 분석 → 프롬프트 자동 업데이트

### 자동 업데이트 규칙
- **실행 주기**: 매월 1일, 15일 UTC 18:00 (KST 03:00) — 2주 간격
- **트렌드 소스**: Firecrawl 웹 검색 (SEO/AEO/GEO 관련 10개 쿼리 중 3개 랜덤 선택)
- **업데이트 판단**: AI가 현재 프롬프트와 트렌드를 비교 → 유의미한 변경 시에만 업데이트
- **변경 불가 항목**: JSON 출력 포맷 구조, GEO 보수적 점수 전략
- **이력 관리**: 모든 실행(변경/미변경)이 engine_update_log에 기록

### 관련 파일
- `supabase/functions/update-analysis-engine/index.ts` — 트렌드 서치 + 엔진 업데이트
- `supabase/functions/analyze-site/index.ts` — DB 기반 동적 프롬프트 로딩

## 버전 이력

### v0.11.0-beta (2026-04-07)
- 분석 엔진 자동 업데이트 시스템 구축 (2주 주기 트렌드 서치 → 프롬프트 자동 업데이트)
- 분석 프롬프트 DB화 (engine_config 테이블, 동적 로딩 + 폴백)
- 엔진 업데이트 이력 관리 (engine_update_log 테이블)
- 블로그 필진 3명 로테이션 (검색최적화 연구소, 콘텐츠 전략가, 크롤링 마스터)
- FAQ 중복 방지 + 마크다운 아티팩트 자동 정리
- 콘텐츠 중복 방지 강화 (50개 제목 + 카테고리 비교)

### v0.10.1-beta (2026-04-06)
- Google sitemap ping 자동 제출 추가
- 한국어 병기 (부가 설명에서 서치튠 OS 표기)
- 블로그 작성자 "서치튠 블로거"로 변경
- FCP 최적화 (LoadingScreen 제거, 폰트 preload)

### v0.10.0-beta (2026-04-02)
- 블로그 자동 생성 시스템 (Gemini AI 기반)
- IndexNow 프로토콜 적용 (블로그 발행 시 네이버/Bing 자동 제출)
- Admin 블로그 관리 (공개/비공개 토글)
- 단계별 퍼널 CTA (출시 알림 → 무료 상담 신청)
- 컨택트 모달 3탭 구조 (알림 신청 / 상담하기 / 비즈니스 문의)
- 퍼포먼스 마케팅 서비스 소개 (About 페이지)
- 상담 신청 DB 저장 (consultation_requests 테이블)

### v0.9.1-beta
- Admin 대시보드 1000행 제한 해결
- 분석 URL 추출 호환성 개선
- SEO 메타태그 및 JSON-LD 최적화

## 향후 계획
- 분석 결과 기반 AI 개선 프롬프트 생성
- PDF 리포트 이메일 자동 발송
- Lighthouse 점수 PDF 통합
- SSR/SSG 전환 검토
