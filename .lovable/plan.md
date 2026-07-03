## 목표
Cloudflare Worker 프록시가 붙었으니 `searchtuneos.com/blog` 트래픽은 이제 Inblog가 렌더링합니다. 이 상태에서:
1. **기존 발행된 글 전량**을 Inblog로 백필
2. **매일 돌아가는 자동 생성 파이프라인**의 최종 발행처를 Inblog로 스위치
3. 우리 DB(`blog_posts`)는 그대로 두어 자동화 로직·SERP 트래킹·GSC 감사가 계속 작동

## 무엇을 만들 것인가

### 1. DB: 이관 상태 컬럼 추가
`blog_posts`에 다음 세 컬럼 추가 (모두 nullable):
- `inblog_post_id text` — Inblog가 발급한 포스트 ID
- `inblog_synced_at timestamptz` — 마지막 동기화 시각
- `inblog_sync_error text` — 마지막 실패 사유(있으면)

### 2. Edge Function: 일괄 백필
`bulk-mirror-to-inblog` 신설. Admin 비밀번호로 호출, `published=true AND inblog_post_id IS NULL`인 글을 최신순으로 순회하며 `publish-to-inblog`와 동일한 로직 재사용. 실패한 건은 `inblog_sync_error`에 기록 후 계속. 청크(예: 5건)씩 처리하고 다음 커서 반환 → 어드민에서 진행률 표시.

### 3. `generate-blog-post` 훅 추가
자동 생성이 `published=true`로 인서트에 성공한 직후, 기존 OG·IndexNow 블록 옆에 **Inblog 미러 호출** 추가:
- 성공 시 `blog_posts.inblog_post_id` 업데이트
- 실패해도 non-blocking (기존 파이프라인 흐름 보호)
결과: 매일 크론이 우리 DB에 글을 만들면 → 즉시 Inblog에도 게시 → Worker가 `/blog/<slug>`에서 Inblog 페이지 서빙.

### 4. Admin BlogManager 확장
- 상단에 "Inblog 일괄 이관" 버튼 + 진행률(미이관/성공/실패 카운트)
- 각 포스트 행에 이관 상태 배지 (`✅ Inblog` / `⏳ 대기` / `❌ 실패 (사유)`)
- 개별 재시도 버튼

### 5. Worker 리다이렉트 정합성
`publish-to-inblog`가 이미 `/blog/{slug}.html → /{slug}` 308 리다이렉트를 Inblog 쪽에 등록합니다. 그대로 유지 → 카톡·구글 색인에 남아있는 `.html` URL도 자연스럽게 새 페이지로 흐릅니다.

## 무엇을 건드리지 않는가
- 크론 스케줄·토픽 풀·품질 채점 로직: 그대로
- SERP 키워드 동기화 함수: 그대로 (target_url `/blog/<slug>.html` 형식 유지 → Worker가 최종 라우팅)
- Lovable `/blog` React 페이지: 어드민 미리보기·수동 접근 용도로 남겨둠 (프로덕션 트래픽은 Worker가 가로챔)

## 실행 순서
1. 마이그레이션으로 컬럼 3개 추가
2. `bulk-mirror-to-inblog` 배포
3. 어드민 UI에서 백필 실행 (실패 건 재시도)
4. `generate-blog-post`에 Inblog 미러 훅 추가 → 배포
5. 다음날 크론 결과로 최종 검증 (`inblog_post_id` 채워지는지)

## 리스크 & 처리
- **Inblog 슬러그 충돌**: `publish-to-inblog`가 그대로 사용하므로 이미 존재하면 오류. → 응답에서 duplicate 감지 시 `PATCH /posts` 업데이트 경로로 자동 전환 (bulk 함수 안에서 처리).
- **레이트리밋**: Inblog API 실측 스로틀 미상. 청크 5건 + 500ms 딜레이로 안전 여유. 실패 시 다음 청크에서 재시도.
- **롤백**: `inblog_post_id`가 채워진 글도 우리 DB에 원본 콘텐츠는 그대로 남으므로, Worker Route만 해제하면 원상 복귀 가능.
