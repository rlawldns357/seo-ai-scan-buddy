---
name: Naver Webmaster Rulebook
description: 네이버 웹마스터 공식 가이드를 SearchTune OS 분석/생성 엔진의 불변 베이스 규칙으로 적용. DB(engine_config.naver_webmaster_rulebook)+코드 상수(_shared/naver-rulebook.ts) 이중화, 트렌드 업데이트가 절대 덮어쓰지 못함
type: feature
---

## 적용 위치
- **DB 저장**: `engine_config.naver_webmaster_rulebook` (어드민에서 수정 가능, version 관리)
- **코드 fallback**: `supabase/functions/_shared/naver-rulebook.ts` 상수 (DB 실패 시 안전망)
- **3개 함수 주입**:
  - `analyze-site` → 한국 사이트 감지(.kr/한글 30%+) 시 SEO/AEO/GEO 채점 프롬프트에 룰북 강제 주입
  - `generate-blog-post` → 모든 자동 생성 글에 룰북 강제 주입 (단일 H1, alt 의무, 의미있는 앵커)
  - `update-analysis-engine` → 트렌드 업데이트 프롬프트에 "룰북 절대 보존" 가드 명시

## 핵심 룰 6대 카테고리
1. **검색 로봇 수집**: Yeti 허용, robots.txt, 메타태그 index, sitemap.xml 4요소
2. **콘텐츠 관리**: 고유 title/desc 50-160자, OG 4종, 본문 텍스트 비중 25%+
3. **사이트 구조**: frame 금지(SEO 캡 40), 시맨틱 HTML, 단일 H1
4. **사이트 활성화**: 의미있는 앵커(여기클릭 금지), img alt 의무, 외부 백링크 우대
5. **구조화 데이터**: schema.org JSON-LD, Organization+sameAs, FAQPage 5문항+, 0개 시 AEO 캡 50/GEO 캡 40
6. **사이트 품질 10대**: HTTPS 필수(HTTP는 SEO 캡 60), canonical, viewport, lastmod 신선도

## 중요 가드
- 트렌드 업데이트(update-analysis-engine)는 별도 config_key('analysis_prompt')만 갱신. 룰북은 손대지 않음.
- 한국 사이트 감지 로직: `.kr/.co.kr/naver/kakao` 도메인 OR 본문 한글 비중 30%+
- 룰북 위반(Yeti 차단/JSON-LD 0개/frame 사용 등) 발견 시 점수 캡 강제
