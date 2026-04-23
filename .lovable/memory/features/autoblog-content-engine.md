---
name: AutoBlog Content Engine
description: site_posts 생성/발행 엔진. DB에서 시스템 프롬프트 로드(autoblog_engine_config), 외부 권위 출처 화이트리스트 강제, 한국어 조사 허용 백링크 매칭, FAQ JSON-LD, BlogPosting 보강, /admin 수동 엔진 업데이트
type: feature
---

## 핵심 구성
- **autoblog_engine_config / autoblog_engine_log** 테이블: `content_system_prompt`(SEO/AEO/GEO 3축 프롬프트), `authority_domains`(권위 도메인 CSV) 저장. 버전 + 변경 이력.
- **generate-content-draft**: DB에서 프롬프트/권위목록 로드 → AI에게 권위 외부링크 1개 이상 + FAQ 5개 + 키워드 5~8개를 tool call로 강제. 응답에 `externalCitation` 포함.
- **publish-site-post**: 한국어 조사(은/는/이/가/을/를/의/에/로/와/과 등) 허용 정규식으로 같은 사이트 키워드 매칭 백링크 최대 3개. H2/링크 안/코드블록 회피. 발행 시 SEO/AEO/GEO 자동 채점.
- **update-autoblog-engine** Edge Function: Firecrawl로 트렌드 검색 → AI가 프롬프트 개정 판단 → autoblog_engine_config 버전 업.
- **/admin**: 분석 엔진 카드 아래 "Autoblog 콘텐츠 엔진" 카드 추가. 수동 업데이트 버튼 + 변경 이력. cron 자동화는 추후.
- **SitePost**: BlogPosting JSON-LD에 author/dateModified/image/wordCount/inLanguage 추가. FAQPage JSON-LD 그대로.

## 운영
- 엔진 업데이트는 관리자 수동만 (cron 보류).
- 권위 도메인 변경 시 `autoblog_engine_config.authority_domains` 직접 update.
