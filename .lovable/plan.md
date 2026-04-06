# SearchTune OS — v0.10.0-beta

## 블로그 자동 생성 & 색인 규칙

### 생성 규칙
- **생성 빈도**: 매일 2회 (오전 08:50, 오후 05:30 KST)
- **일일 한도**: 최대 2개/일 (`MAX_POSTS_PER_DAY = 2`)
- **중복 방지**: 최근 30개 게시물 제목과 비교
- **읽기 시간**: 2~4분 제한 (이탈 방지)
- **AI 모델**: google/gemini-2.5-flash (Lovable AI Gateway)
- **작성자**: 서치튠 블로거
- **FAQ**: 5~7개 자동 생성, 본문 하단에 추가

### 색인 제출 규칙 (블로그 생성 시 자동 실행)
- **IndexNow API** → Bing, 네이버 즉시 알림
- **Google Sitemap Ping** → `https://www.google.com/ping?sitemap=...` 호출
- **동적 사이트맵** → `/sitemap.xml` Edge Function으로 실시간 블로그 URL 포함
- 제출 실패 시 non-blocking (에러 로그만 남기고 진행)

### 관련 파일
- `supabase/functions/generate-blog-post/index.ts` — 블로그 생성 + IndexNow 호출
- `supabase/functions/submit-indexnow/index.ts` — IndexNow + Google ping 제출
- `supabase/functions/sitemap/index.ts` — 동적 사이트맵 생성

## 버전 이력

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
