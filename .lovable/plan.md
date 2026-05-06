# AutoBlog v2 — 신규 프로젝트 구축 플랜

> **중요**: 이 플랜은 SearchTune OS(현재 프로젝트)에는 코드를 추가하지 않습니다. 별도 신규 Lovable 프로젝트를 만든 뒤 거기에서 진행합니다. 본 프로젝트의 검증된 자산만 cross_project로 가져갑니다.

---

## 1. 프로젝트 포지셔닝

- **이름(가칭)**: AutoBlog v2 (별도 도메인 권장: `autoblog.searchtuneos.com` 또는 신규)
- **한 줄**: "내 사이트 SEO/AEO/GEO 엔진 룰을 직접 튜닝하면서, 매일 자동으로 블로그가 쌓이는 SaaS"
- **차별점**: 단순 AI 생성기가 아니라 **유저가 엔진 자체를 진화시키는 도구** (룰북·프롬프트·키워드 직접 편집)
- **BM**: 메모리의 5-tier 그대로 (Free / Beta / Lite ₩4,900 / Pro ₩49,000 / Studio ₩199,000)

---

## 2. 핵심 기능 (풀 패키지)

| 영역 | 기능 |
|---|---|
| 사이트 관리 | 1유저 N사이트, 사이트별 도메인/카테고리/톤앤매너 |
| 엔진 편집 | 사이트별 SEO/AEO/GEO 프롬프트, 키워드 풀, FAQ 스타일, 금지어, 카테고리 룰 직접 수정 |
| 콘텐츠 큐 | Kanban 4칸 (idea / draft / scheduled / published) + 추천 재고 |
| 자동 발행 | 사이트별 ON/OFF + 요일·시간(KST) + 일일 캡 + 큐 자동 보충 |
| 채점 | 발행 전후 SEO/AEO/GEO 자동 채점, 약점 축 자동 보강 글 생성 |
| 자가 진화 | pg_cron 월 2회: Perplexity 트렌드 → 엔진 룰 자동 업데이트 (보존 가드) |
| 발행 채널 | (a) 호스팅 `/sites/{slug}/blog/{post}` (b) Webhook → 유저 CMS push |
| OG/썸네일 | 룰북 SVG → PNG 래스터, 한글/serif 안전 (이미 검증됨) |
| 분석 | 사이트별 view/click, 인덱싱 상태, 점수 변화 추이 |

---

## 3. 가져올 자산 (cross_project copy)

본 프로젝트(SearchTune OS)에서 그대로 검증된 것들:

```text
supabase/functions/
  _shared/
    og-design-rulebook.ts        OG 디자인 룰북
    og-png-renderer.ts           SVG→PNG (Pretendard+Lora)
    brand-matching.ts            브랜드 자동 감지
    naver-rulebook.ts            네이버 6대 룰북
  generate-og-image/             OG 생성 엔드포인트
  og-svg/                        영구 폴백
  rss/, sitemap/                 배포 인프라
```

코드 패턴(참고만, 멀티사이트로 재작성):
- `generate-blog-post`, `generate-content-draft` (생성 파이프라인)
- `topup-idea-queue` (큐 자동 보충)
- `update-analysis-engine` (자가 진화 cron)
- Kanban UI (`/dashboard#workflow`, dnd-kit)
- Autopublish 팝오버

---

## 4. 데이터 모델 (신규 프로젝트 DB)

```text
profiles                 user_id, email, display_name
user_roles               user_id, role(free/lite/pro/studio/admin)
subscriptions            Paddle 연동
sites                    user_id, slug, domain, title, lang, category, brand_voice
site_engine_config       site_id, key, value(JSONB) — 룰북·프롬프트·키워드 (버전 관리)
site_engine_log          site_id, version, changes_summary
posts                    site_id, slug, title, content, status, axis_target, scores
post_views               post_id, session_id, referrer
autopublish_settings     site_id, enabled, weekdays, hours_kst, daily_limit, min_queue
webhooks                 site_id, target_url, secret, events
webhook_deliveries       webhook_id, post_id, status, attempts
keyword_pool             site_id, keyword, weight, used_count
```

RLS: 메모리의 패턴대로 — 사용자는 본인 sites/posts만, 발행된 posts는 public read.

---

## 5. 단계별 로드맵 (마일스톤)

```text
M1  프로젝트 생성 + 인증(이메일+Google) + sites CRUD
M2  엔진 에디터 UI (프롬프트/키워드/룰북 편집 + 버전 히스토리)
M3  콘텐츠 생성 파이프라인 (idea → draft → scheduled)
M4  Kanban + Autopublish + 큐 자동 보충
M5  발행 호스팅(/sites/{slug}/blog/{post}) + OG/썸네일
M6  채점 시스템 + 약점 보강 자동 글
M7  Webhook 발행 채널 + 재시도/서명
M8  자가 진화 cron + admin 패널
M9  Paddle 결제(5-tier) + 사용량 미터링
```

---

## 6. 본 프로젝트(SearchTune OS) 영향

- **변경 없음**. 이 채팅에서 생성/수정 안 합니다.
- 메모리에 "AutoBlog v2 별도 프로젝트로 분리됨" 한 줄만 추후 업데이트.

---

## 7. 다음 액션 (승인 시)

1. 새 Lovable 프로젝트 만들기 (사용자가 워크스페이스에서 "+ New Project" 클릭, 이름 예: `autoblog-v2`)
2. 새 프로젝트 채팅에서 "이 플랜 그대로 M1부터 시작해줘" + 본 프로젝트(`searchtune-os` 또는 현재 ID) 멘션
3. M1 구현(인증 + sites CRUD)부터 순차 진행

---

## 기술 노트

- Lovable Cloud (Supabase) + Cloudflare 동일 스택
- 멀티사이트 라우팅: `/sites/:slug/*` (Subdomain 라우팅은 Custom Domain 추가 후 Phase 2)
- 엔진 설정 JSONB는 버전 컬럼 + log 테이블로 롤백 가능
- Webhook: HMAC-SHA256 서명, 지수 백오프 재시도(최대 5회)
- AI: Lovable AI Gateway (Gemini 2.5 Flash 기본, Pro tier는 Pro 모델), Perplexity sonar-pro 월 2회