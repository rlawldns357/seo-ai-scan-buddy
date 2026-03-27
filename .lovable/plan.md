
# SearchTune OS — 매니페스트

## 📖 SEO 바이블
- **Google SEO 기본 가이드**: https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=ko
- 모든 SEO 관련 결정의 기준점. 변경 전 반드시 참고할 것.

## ✅ 완료

- SEO·AEO·GEO 점수 엔진 & 결과 화면 (Beta)
- Lighthouse PSI 실측 연동 (모바일+데스크톱)
- OG 메타·파비콘·JSON-LD 세팅
- 서치콘솔 / 네이버 / 빙 웹마스터 등록
- 이메일 리드 수집 (게이팅 + 확인 메일)
- 관리자 인사이트 대시보드 (/admin)
- 관리자 무제한 분석
- About 페이지 + 바로 분석/문의 CTA
- Navbar (About / Contact / 관리자 뱃지 → 관리자 페이지 링크)
- 로고 → 홈 링크
- 워터마크 PDF 리포트 (이메일 등록 후 다운로드)
- 베타 출시 & 배포
- email_leads SELECT 정책 service_role 전용으로 보안 강화
- **정적 JSON-LD 5종 index.html 직접 주입** (WebSite, SoftwareApplication, Organization, BreadcrumbList, FAQPage)
- **noscript 폴백** (JS 미실행 크롤러용 핵심 텍스트 + FAQ 전문)
- **메타태그 최적화** (title/description 네이버 권장 길이 준수)
- **GSC 인증 메타태그 추가** + 사이트맵 제출 완료
- **네이버 서치어드바이저** 전항목 통과 (접속/robots/메타/제목/설명/OG)
- **Bing Webmaster Tools** 등록 + 사이트맵 제출 (Status: Success, 2 URLs)
- **분석 엔진 JSON-LD 감지 개선** (HTML 잘림 무관하게 별도 추출 → AI 전달)
- **이미지 alt 텍스트 점검 완료** (Google 가이드 기준 적합)
- **보안 린터 전체 해결** — analytics_events SELECT service_role 전용, INSERT anon 전용(검증 추가), DB 함수 search_path 4개 적용 → 경고 0건
- **AEO/GEO 점수 최적화** (45/50 → 60/60)
  - FAQ 7→10개 확장 (구조화 데이터, Lighthouse vs SEO 차이, 분석 결과 수령 방법 추가)
  - About 페이지 Q&A 콘텐츠를 noscript 폴백에 추가
  - index.html 정적 FAQPage JSON-LD 10문항으로 갱신
  - analyze-site 엣지 함수: /about 서브페이지 병렬 크롤링 추가 (Firecrawl)

## ⏳ 확인 필요 (인덱싱 대기)

- **Google 색인생성**: GSC에서 "데이터 처리 중" — 1~3일 대기 후 확인
- **Bing 인덱싱**: 최대 48시간 대기 후 Search Performance 확인
- **네이버 인덱싱**: SPA 특성상 수일~2주 소요, `site:searchtuneos.com` 검색으로 확인

## ✅ SEO 인프라 점검 결과

| 항목 | 상태 | 비고 |
|------|------|------|
| robots.txt | ✅ 정상 | 모든 주요 봇 Allow, AI봇(GPTBot, OAI-SearchBot) 포함 |
| noindex 태그 | ✅ 없음 | 인덱싱 차단 메타 태그 없음 |
| canonical | ✅ 정상 | `<link rel="canonical" href="https://searchtuneos.com/">` 설정됨 |
| sitemap.xml | ✅ 정상 | `/`, `/about` 2개 URL 포함, robots.txt에서 참조 |
| 구조화 데이터 | ✅ 정적 주입 완료 | 5종 JSON-LD가 초기 HTML에 포함 |
| noscript 폴백 | ✅ 추가 완료 | JS 없이도 핵심 콘텐츠 제공 |
| GSC 인증 | ✅ 메타태그 추가 | google-site-verification 설정 |
| 네이버 인증 | ✅ 통과 | naver-site-verification + 사이트 간단 체크 전항목 통과 |
| 메타태그 길이 | ✅ 최적화 | 네이버 권장(title 40자, description 80자) 준수 |
| SSR/SSG | ⚠️ 미적용 | Vite SPA 구조상 프레임워크 전환 필요 (향후 과제) |
| 이미지 alt 텍스트 | ✅ 점검 완료 | Google 가이드 기준 적합 |
| 보안 린터 | ✅ 0건 | 모든 RLS 정책 + DB 함수 search_path 해결 |

## 🔲 예정 — 아이디어 / 퍼널 확장

### PDF 다운로드 퍼널
- 이메일 등록 완료 후 → 풀 PDF 리포트 다운로드 (현재 구현됨, 워터마크 포함)
- 모달에 "이메일 등록 시 상세 PDF 리포트를 받을 수 있습니다" 명시 문구 추가
- PDF 리포트에 Lighthouse 점수 포함 고려
- 이메일로 풀 PDF 발송 (다운로드 외 이메일 첨부/링크 전달)

### 프롬프트 복사 기능
- 분석 결과 기반 AI 개선 프롬프트 자동 생성
- "이 프롬프트를 ChatGPT에 붙여넣으세요" 형태의 원클릭 복사
- 리드 전환 포인트로 활용 가능 (프롬프트 일부만 무료 공개 → 이메일 등록 시 전체 공개)

### 연계 퍼널 (리드 → 전환)
- 무료 분석 → 이메일 수집 → PDF 리포트 → 프롬프트 복사 → 유료 컨설팅 연결
- 리포트 내 "전문가 컨설팅 받기" CTA 삽입
- 단계별 가치 제공으로 자연스러운 업셀 구조

### ~~보안~~ ✅ 완료
- ~~analytics_events SELECT 정책 강화~~ → service_role 전용
- ~~INSERT always true 정책 범위 축소~~ → anon 전용 + 검증 추가 (email 형식, event_name 길이)
- ~~DB 함수 search_path 설정~~ → 4개 함수 모두 적용

## 📝 텍스트 수정 이력

- About 페이지 "비용이 드나요?" 답변: `현재 베타 기간 무료로 제공되고 있습니다.`
