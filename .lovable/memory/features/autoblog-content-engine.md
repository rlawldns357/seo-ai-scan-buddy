---
name: AutoBlog Content Engine
description: site_posts 생성/발행 엔진. DB 시스템 프롬프트(autoblog_engine_config), 시기성 규칙, Firecrawl 사이트 스크랩 기반 추천, 외부 권위 출처 화이트리스트, 한국어 조사 허용 백링크, FAQ JSON-LD
type: feature
---

## 핵심 구성
- **autoblog_engine_config / autoblog_engine_log** 테이블: `content_system_prompt`(SEO/AEO/GEO 3축 + 시기성 규칙 v2+), `authority_domains`(권위 도메인 CSV) 저장. 버전 + 변경 이력.
- **demo-stream-content `recommend` 모드**: URL 입력 → **Firecrawl로 사이트 첫 페이지 스크랩**(markdown+summary, 8s 타임아웃) → 그 컨텍스트 위에서 AI가 SEO/AEO/GEO 토픽 3개 + reason(사이트 단어 1개+ 포함) 추천. 일반론 금지.
- **regenerate-idea (주사위)**: 동일한 Firecrawl 스크랩 컨텍스트를 재사용 → 거절된 주제·기존 추천을 회피하며 단일 토픽 재생성. 1 크레딧/회.
- **generate-content-draft**: DB 프롬프트/권위목록 로드 → AI에게 권위 외부링크 1개+ FAQ 5개 + 키워드 5~8개 tool call 강제.
- **publish-site-post**: 한국어 조사 허용 정규식으로 같은 사이트 키워드 매칭 백링크 최대 3개. H2/링크 안/코드블록 회피. 발행 시 SEO/AEO/GEO 자동 채점.
- **시기성 규칙(v2+)**: "2026년 기준" 명시, 2024~2026 자료만 인용, "최근/올해" 같은 모호 표현 금지, FAQ 1개는 시점 변화 질문, 단종 모델 단정 금지.
- **/admin**: 분석 엔진 카드 아래 "Autoblog 콘텐츠 엔진" 카드. 수동 업데이트 + 변경 이력. cron 보류.
- **SitePost**: BlogPosting JSON-LD에 author/dateModified/image/wordCount/inLanguage. FAQPage JSON-LD 그대로.

## 운영
- 엔진 업데이트는 관리자 수동만.
- 권위 도메인 변경 시 `autoblog_engine_config.authority_domains` 직접 update.
- Firecrawl 스크랩 실패 시 URL만으로 fallback (데모 끊김 방지).
