
## 결과 보고 (조회 완료)

### 1) 인블로그 포스트 `chatgpt-citation-structure-tables-lists-20260705` attributes

- **id**: `219460`
- **전체 attribute 키**: `canonical_url, content_html, content_type, cta_color, cta_link, cta_text, cta_text_color, custom_scripts, description, form_id, image, meta_description, meta_title, notion_url, published, published_at, slug, title`
- **URL 관련 필드 값**:
  - `canonical_url: null` ← **비어있음**
  - `slug: "chatgpt-citation-structure-tables-lists-20260705"`
  - `custom_url`, `original_url`, `external_url`, `path`, `permalink` → **필드 자체 존재하지 않음**

즉 이 포스트에는 canonical/URL 관련 오설정이 없습니다.

### 2) `publish-to-inblog` POST 페이로드 (정확한 인용, `supabase/functions/publish-to-inblog/index.ts`)

```ts
const attributes: Record<string, unknown> = {
  title: post.title,
  slug: post.slug,
  description: post.excerpt || undefined,
  content_html: contentHtml,
  meta_title: post.title,
  meta_description: post.excerpt || undefined,
};
if (imgUrl) attributes.image = { url: imgUrl };
if (customScripts) attributes.custom_scripts = customScripts;
// ... publish 시 PATCH:
// attributes: { published: true, published_at: publishedAt }
```

`canonical_url`, `custom_url` 등은 **한 번도 보낸 적 없음**. 원본 페이로드가 무죄임이 확인됨.

### 3) 진짜 원인은 블로그 레벨 라우팅 설정

이전 턴에서 확인한 `/blogs/me`:
```
"custom_subdirectory": "searchtuneos.com/blog"
"custom_domain_verified": true
```

포스트 attribute에는 `.html` 흔적이 없는데도 `searchtune.inblog.io/{slug}` 마저 `.com/blog/{slug}.html` 로 301된다는 것은, 인블로그가 **`custom_subdirectory` 설정이 있는 블로그의 모든 URL을 서브디렉토리 형식(+ `.html` 접미사)으로 강제 정규화**하고 있다는 뜻입니다. 이건 포스트 필드가 아니라 **블로그(id=12516, subdomain=searchtune) 설정 레벨**의 문제입니다.

### 다음 진단 액션 (build mode 승인 시 실행)

user 요청 3번 항목을 실행할 수는 있지만, `canonical_url`이 이미 `null`이라서 PATCH로 `null → null`을 넣어봐야 아무 변화가 없을 것으로 예상됩니다. 대신 다음 2개를 순차 실행하는 게 유효합니다.

**A. Blog(12516) 레벨 필드 조사 (조회, 무해)**
   - `GET /api/v1/blogs/me` 전체 attribute 다시 덤프(모든 키 나열) → `url_format`, `permalink_style`, `use_html_extension`, `custom_domain`, `redirect_to_custom_domain` 류 플래그 검색.

**B. `custom_subdirectory` 해제 실험 (되돌릴 수 있음)**
   - `PATCH /api/v1/blogs/searchtune` body `{ data: { type: "blogs", id: "searchtune", attributes: { custom_subdirectory: null } } }` 시도.
   - 실행 즉시 `curl -IL https://searchtune.inblog.io/chatgpt-citation-structure-tables-lists-20260705` 재확인 — 301 사슬이 사라지고 200이 뜨는지.
   - 결과에 따라 즉시 원상복구 or 유지.

**C. 만약 B가 문제 원인이 아니면**, 최소 재현 세트로 포스트 하나에 대해 `canonical_url` PATCH 실험 (`null → https://searchtune.inblog.io/{slug}`) 시도.

### 이번 턴에서 하지 않는 것
- 프로젝트 코드 수정 없음 (이 문제는 코드로 해결되지 않음).
- 대량 백필/삭제 없음.

**진행 방향 확인 필요**: A → B → C 순서로 실행할까요, 아니면 인블로그 대시보드에서 직접 `custom_subdirectory`를 확인/제거하시는 편이 낫나요? Build mode 진입 시 A는 무해하니 우선 실행하고 결과를 보고 B를 결정하는 흐름을 추천합니다.
