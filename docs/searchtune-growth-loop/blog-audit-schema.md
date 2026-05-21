# Blog Audit Schema

SearchTune OS 블로그 성장 루프의 입력 스키마다. 목적은 모든 글을 한 번에 고치는 것이 아니라, 모든 글을 같은 기준으로 점수화해서 수정 큐로 보내는 것이다.

## 1. Page identity

| field | type | note |
|---|---:|---|
| slug | text | canonical slug |
| canonical_url | text | 반드시 `https://searchtuneos.com/blog/{slug}.html` |
| clean_url | text | `/blog/{slug}` fallback/redirect 감시용 |
| source | enum | `static_repo`, `supabase_blog_posts`, `sitemap`, `manual` |
| title | text | 현재 title/H1 비교용 |
| category | enum | SEO/AEO/GEO/가이드/뉴스 |
| published_at | timestamptz | 발행일 |
| updated_at | timestamptz | 최근 수정일 |

## 2. Technical SEO checks

| field | pass condition |
|---|---|
| http_status | 200 |
| canonical_status | canonical_url과 실제 canonical 일치 |
| clean_url_policy | 301/308 to `.html` preferred, 아니면 known risk |
| sitemap_included | sitemap-posts.xml 포함 |
| robots_allowed | robots 차단 없음 |
| title_present | title 존재 |
| description_length | 70~160자 권장 |
| h1_present | H1 존재 |
| og_url_matches | og:url = canonical_url |
| og_image_present | public og image 있음 |

## 3. Content quality checks

| field | target |
|---|---|
| target_keyword | 1 primary keyword |
| search_intent | definition/comparison/how-to/checklist/platform/problem |
| h2_count | 3~6 |
| faq_count | 4~6 |
| has_tldr | true |
| has_table | comparison/how-to 글은 true 권장 |
| authority_links | 1~3 official/major sources |
| internal_links | 2~5 canonical `.html` links |
| first_answer_quality | 첫 문단에 50~90자 직접 답변 |
| freshness_signal | 연도/업데이트 기준 명시 |

## 4. Interaction/animation suitability

| field | type | rule |
|---|---:|---|
| interaction_type | enum | `none`, `checklist`, `comparison_toggle`, `flow_animation`, `mini_calculator`, `serp_timeline`, `canonical_demo` |
| interaction_reason | text | 검색 의도 이해에 도움이 되는 경우만 |
| no_js_fallback | boolean | JS 없이도 본문 핵심 텍스트가 읽혀야 함 |
| crawler_text_preserved | boolean | 핵심 문장은 HTML에 남아야 함 |
| mobile_safe | boolean | 모바일에서 가로 스크롤/깨짐 없음 |

## 5. Performance/SERP checks

| field | type |
|---|---:|
| google_index_state | `unknown`, `not_found`, `found`, `requested`, `verified` |
| naver_index_state | `unknown`, `not_found`, `found`, `requested`, `verified` |
| serp_visibility | `missing`, `partial`, `exposed` |
| rank_snapshot | jsonb |
| compared_at | timestamptz |
| clicks/impressions/ctr | numeric, optional GSC 연결 후 |

## 6. Issue scoring

- P0: URL/canonical/sitemap 깨짐, HTTP 오류, robots 차단
- P1: 색인 큐 대상인데 canonical/메타 약함
- P2: 미노출 키워드 대응 글인데 title/H1/첫문단/FAQ 부실
- P3: 내부링크/authority link/TL;DR/표 부족
- P4: 인터랙션 적용 후보

## 7. Batch guardrail

- 한 배치 최대 5~10개 글만 수정
- P0/P1은 즉시, P2/P3는 클러스터별로 처리
- 배치마다 build + prerender + sitemap verification 필수
- 수정 전후 diff와 audit score를 저장
- 성과 확인 전 같은 유형을 전체 글에 무차별 확산하지 않음
