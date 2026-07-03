# 인블로그 미러 500 원인 확정 계획 (여전히 plan mode, 코드 수정 없음)

## 지금까지 확정된 사실
- ✅ `INBLOG_API_KEY` 유효 (blog_id=12516, subdomain=searchtune, scopes에 posts:write 포함)
- ✅ 엔드포인트 `https://inblog.ai/api/v1` 정확
- ✅ 인블로그 서버에는 이미 SearchTune 글들이 존재 (예: post id 218497)
- ❌ 그럼에도 `publish-to-inblog` edge function은 100% HTTP 500 반환
- ❌ blog_posts 테이블 이관 성공 0건 / 에러 기록 0건 (DB write 전 단계에서 크래시)

## 남은 원인 후보 3개
1. **Slug 중복 충돌** — 인블로그에 이미 동일 slug 존재 → POST 시 409/422
2. **JSON:API payload 스펙 불일치** — 필수 필드 누락 또는 타입 오류
3. **함수 내부 크래시** — Markdown→HTML 변환 등에서 예외

## 다음 검증 스텝 (전부 조회/curl만, 코드 수정 없음)

### Step 1. 실제 요청 payload 확인
`supabase/functions/publish-to-inblog/index.ts`를 다시 읽고, 실제로 인블로그로 보내는 POST body 형태를 그대로 추출한다.

### Step 2. 대표 blog_post 1건으로 실제 POST 재현
- `blog_posts` 테이블에서 아직 미이관 글 1건을 선택 (slug + title + content_md)
- 함수와 동일한 payload 구조를 curl로 재현:
  ```
  curl -X POST https://inblog.ai/api/v1/posts \
    -H "Authorization: Bearer $INBLOG_API_KEY" \
    -H "Content-Type: application/vnd.api+json" \
    -d '{"data":{"type":"posts","attributes":{...}}}'
  ```
- 응답의 HTTP 코드 + body 전문을 확인 → 진짜 인블로그 에러 메시지를 확보

### Step 3. Slug 중복 여부 교차 검증
- 인블로그 `/api/v1/posts?filter[slug]=<대상slug>` 또는 리스트에서 해당 slug 존재 여부 확인
- 이미 존재하면 원인 = slug 충돌 확정

### Step 4. Edge function 로그 재확인
- `publish-to-inblog` 로그에서 500 직전의 스택 트레이스/에러 라인 추출
- Step 2/3 결과와 대조

## 산출물
- 인블로그 API가 반환한 **실제 에러 메시지 원문**
- 500의 근본 원인 (스펙 불일치 vs slug 충돌 vs 내부 크래시 중 하나로 확정)
- 다음 빌드 모드로 넘어갈 때 정확히 무엇을 고쳐야 하는지 (payload 필드 X 추가, slug suffix 로직, upsert 전환 등)

이 계획대로 진행할까요? 승인해 주시면 Step 1~4를 이어서 조회만으로 수행합니다.
