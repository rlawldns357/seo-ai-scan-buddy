# FAQ 주입 실측 결과 (post_id 217848)

## 방식1: content_html 말미에 FAQ HTML + JSON-LD `<script>` 추가

- PATCH `/posts/217848` → **200 OK**
- 재조회 결과:
  - `<h2>자주 묻는 질문 (FAQ TEST)</h2>` ✅ 그대로 저장
  - `<div><h3>Q</h3><p>A</p></div>` ✅ 그대로 저장
  - `<script type="application/ld+json">…FAQPage…</script>` ✅ **sanitize 되지 않고 원문 그대로 저장됨**
- 결론: content_html의 script 태그는 **살아남음**. 화면 표시 + 구조화데이터 둘 다 이 방식만으로 가능.

## 방식2: `custom_scripts` 필드

- 이 필드는 **문자열이 아니라 구조화된 오브젝트**임. 실측한 스키마:
  ```json
  {
    "head_start_script": null,
    "head_end_script": null,
    "body_start_script": null,
    "body_end_script": null,
    "json_ld_script": null
  }
  ```
- 문자열을 그대로 PATCH하면 **조용히 무시됨** (모든 슬롯 null 유지).
- 오브젝트 `{"json_ld_script": "<원문 JSON>"}` 로 PATCH → **200 OK, 저장 확인됨**.
- 원문 JSON도, `<script>`로 감싼 문자열도 모두 저장되지만, 원문 JSON만 넣는 게 관례상 안전 (Inblog가 스크립트 태그를 자체 렌더).

## 추천: 하이브리드

- **`custom_scripts.json_ld_script`** ← FAQPage JSON-LD (원문 JSON 문자열, `<script>` 래핑 없이)
  - 이유: 전용 슬롯이라 head/적절 위치에 안전하게 렌더될 가능성 높음, 중복 삽입 위험 없음.
- **`content_html` 말미에 사용자용 FAQ 섹션** (`<h2>자주 묻는 질문</h2>` + Q/A 리스트)
  - 이유: 사람이 읽을 FAQ 블록 필요. script만 넣으면 화면에는 안 보임.
- JSON-LD를 content_html에도 넣으면 **구조화데이터 중복** → 검색엔진 경고 가능. content_html에는 시각적 FAQ만, JSON-LD는 `custom_scripts`에만 넣는 것이 클린.

## 대안 (백업 플랜)

- Inblog가 `json_ld_script` 슬롯을 실제로 head에 렌더하는지 프론트에서 view-source로 확인이 필요할 수 있음. 렌더 안 되는 것으로 판명되면 → 방식1(콘텐츠 말미 script 삽입)로 폴백. script 태그가 sanitize되지 않는 게 이미 실증됨.

## 다음 단계 (승인 시)

1. `publish-to-inblog/index.ts` PATCH attributes에 아래 추가:
   - `custom_scripts: { json_ld_script: JSON.stringify(faqPageLd) }` (FAQ 있을 때만)
   - `content_html` 뒤에 시각용 FAQ 섹션 append
2. 소스는 `blog_posts.faq` (JSONB, `[{q,a}]` 형태) — 컬럼/구조 최종 확인 필요.
3. 카나리 1건 검증 → 141건 백필.

이미지·태그 처리 계획과 함께 묶어 다음 턴에서 통합 구현 계획 낼지, FAQ만 먼저 갈지 알려주세요.
