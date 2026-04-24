# CRD — Naver Blog Integration

**Status**: 📌 기획 (Coming Soon 티저는 다음 스프린트, 정식 출시는 AutoBlog 1.0 안정화 후)
**Owner**: AutoBlog
**Updated**: 2026-04-24

---

## 1. Why

한국 시장 콘텐츠 유통의 절반은 여전히 네이버 블로그·카페·VIEW 탭. AutoBlog가 자체 호스팅 블로그 허브(`/sites/{slug}`)만 다루면 한국 SMB의 "이거 네이버에도 올릴 수 있어요?" 질문에 답할 수 없음. 네이버 연동은 **AutoBlog의 한국 시장 결정타** 기능.

## 2. 제약 조건 (반드시 사전 인지)

- 네이버 블로그 **공식 글쓰기 API는 2017년 종료** — 자동 발행은 비공식/불안정.
- SmartEditor ONE은 자체 HTML 포맷 사용 — 일반 HTML 붙여넣기 시 스타일 깨짐, 이미지 분리 업로드 필요.
- 네이버 검색 노출은 **C-Rank + DIA 알고리즘** — 첫 100자 키워드, 본문 길이 1500자+, 이미지 3장+, 체류시간이 핵심 신호.
- IndexNow는 네이버 미지원. 대신 **Naver Search Advisor** 수동 등록 + sitemap 제출만 가능.

## 3. 범위 (1+2+3 패키지 확정)

### Pillar 1 — SmartEditor ONE 호환 복사
- AutoBlog로 생성된 글을 **네이버 에디터에 그대로 Ctrl+V** 가능한 형식으로 변환.
- 변환 규칙:
  - `<h2>`, `<h3>` → 네이버 스타일 인라인 (`font-size`, `font-weight`, `margin`).
  - `<p>` → `<p class="se-text-paragraph">` 유사 마크업 + 줄간격 1.6.
  - `<ul>`, `<ol>` → 네이버 리스트 마크업 (• 기호 + 들여쓰기).
  - `<img>` → **base64 인라인은 금지** (에디터가 거부). 대신 우리 Storage URL 그대로 + alt 보존.
  - `<a>` → `target="_blank" rel="nofollow"` (네이버 외부 링크 권장).
- "**네이버용 복사**" 버튼 → 클립보드에 가공된 HTML 복사 + 토스트 ("에디터에 붙여넣으세요").
- 부가: 본문 끝에 자동 해시태그 30개 (글 키워드 + AI 추출), 발행 가이드 1줄 ("이미지는 자동으로 업로드돼요").

### Pillar 2 — 네이버 SEO 가이드 (점수 + 체크리스트)
글 상세 패널에 **"네이버 적합도"** 토글 추가:
- 첫 100자 키워드 포함 여부
- 본문 길이 (1500자+ 권장, 800자 미만 경고)
- 이미지 개수 (3장+ 권장)
- H2/H3 사용 여부
- 외부 링크 ≤ 3개
- 해시태그 추출 결과 미리보기
점수 0-100, 70점 미만 시 자동 개선 제안 ("키워드 'X'를 첫 단락에 넣으세요").

### Pillar 3 — 발행 후 트래킹 보조
- "네이버에 발행했어요" 체크 → site_posts에 `naver_published_at`, `naver_url` 저장.
- 주 1회 cron이 `naver_url`을 fetch해 **존재 여부 + 본문 일치도** 확인 (스팸 차단/삭제 감지).
- Naver Search Advisor 등록 가이드 (외부 링크 + 단계별 스크린샷).

## 4. 단계별 출시

### Stage 0 — Coming Soon 티저 (이번 ~ 다음 스프린트)
- 대시보드 사이드바에 **"Naver"** 탭 신규 추가 (자물쇠 아이콘 + "Soon" 배지).
- 클릭 시 `/dashboard/naver` 랜딩:
  - Hero: "AutoBlog 글을 네이버 블로그에도 한 번에"
  - 3 Pillar 카드 (복사 / SEO / 트래킹)
  - **"관심있어요" 버튼** → `naver_interest` 테이블에 user_id + email 저장
  - 카운터: "이미 N명이 기다리고 있어요" (실시간)
- 이메일 수집 후 출시 시 일괄 알림 발송.

### Stage 1 — Pillar 1 MVP (정식 출시 1차)
- 글 상세 패널에 "**네이버용 복사**" 버튼.
- 변환은 **클라이언트 사이드** (DOMParser + 규칙 기반) — 서버 비용 0.
- 이미지 호스트: 우리 Storage. 네이버는 외부 이미지 hot-link 허용 (단 robots는 차단됨, 노출은 OK).

### Stage 2 — Pillar 2 (정식 출시 2차)
- "네이버 적합도" 점수 + 체크리스트 패널.
- 점수는 클라이언트 계산, 개선 제안은 Lovable AI (gemini-2.5-flash) 호출.

### Stage 3 — Pillar 3 (정식 출시 3차)
- DB: site_posts에 `naver_published_at TIMESTAMPTZ`, `naver_url TEXT` 추가.
- 주간 cron: `verify-naver-posts` edge function.
- Search Advisor 가이드 정적 페이지.

### Stage 4 (탐색적, 보장 X) — 자동 발행
- 네이버 ID/PW 위탁 + Playwright 헤드리스 → 너무 위험. **공식 안 풀리면 안 함.**
- 대안: 네이버 Modoo! API (운영 중인 비즈니스용) 연동 가능성 조사.

## 5. DB 스키마 (Stage 0)

```sql
CREATE TABLE public.naver_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'dashboard_naver_tab',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);

ALTER TABLE public.naver_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can register interest" ON public.naver_interest
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND email IS NOT NULL);

CREATE POLICY "Users can read own interest" ON public.naver_interest
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages naver_interest" ON public.naver_interest
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public count (for "N명 기다리는 중")
CREATE OR REPLACE FUNCTION public.count_naver_interest()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COUNT(*)::int FROM public.naver_interest $$;
```

## 6. 측정 지표

- **Stage 0**: `naver_interest` 등록 수, 사이드바 클릭률 (`naver_tab_clicked` 이벤트).
- **Stage 1+**: "네이버용 복사" 클릭 수, 복사 후 `naver_published_at` 체크 전환율.
- 목표 (Stage 0): 베타 유저 중 30% 이상이 "관심있어요" 등록 → 본 개발 착수 결정 트리거.

## 7. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| 네이버가 외부 이미지 차단 | Stage 1에서 이미 base64 fallback 옵션 추가 (10MB 미만 글 한정) |
| 본문 일치도 fetch 시 네이버 봇 차단 | User-Agent 회전, 1주일 1회 미만으로 제한 |
| C-Rank 페널티 (AI 문체 감지) | Pillar 2 점수에 "자연스러움" 항목 추가, Lovable AI로 한국어 톤 재작성 |
| 비공식 자동 발행 시도자 발생 | UI/문서에서 명시적으로 "수동 붙여넣기"임을 강조. ToS 준수 |

## 8. 타이밍

- **이번 스프린트 (선택)**: Stage 0 — 대시보드 Naver 탭 + 랜딩 + 관심 등록 (1-2일 작업)
- **다음 스프린트**: 평가 후 Pillar 1 MVP 또는 다른 우선순위로 전환
- **정식 출시**: AutoBlog 1.0 안정화 후 (베타 → Lite 전환률 안정화 시점)

## 9. Open Questions

- Pillar 1 변환 규칙은 SmartEditor ONE 정확한 마크업 리버스가 필요 → 출시 전 실제 에디터 DOM 분석 1일 필요.
- "관심있어요" 등록 시 추가 정보 수집할지 (운영 중인 네이버 블로그 URL? 월 발행 수?) — Stage 0에서 결정.
- 네이버 카페/VIEW도 같이 묶을지 vs 블로그만 — Stage 0 인터뷰로 결정.
