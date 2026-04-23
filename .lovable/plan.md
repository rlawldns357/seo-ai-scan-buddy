

# 대시보드를 라이브 데모처럼 "원페이지 스크롤" 구조로 재편

지금 대시보드의 카드/타이포/사이드바 디자인 자산은 그대로 유지하고, **정보 흐름만** 데모처럼 한 페이지에서 위→아래로 자연스럽게 스크롤되며 읽히는 구조로 바꿉니다. 사이드바 메뉴 클릭 = 같은 페이지 내 해당 섹션으로 스무스 스크롤.

## 핵심 변화

**Before**: 사이드바 클릭 → 라우트 이동 → 새 페이지 로드 → 컨텍스트 단절 (현재 6~7개 분리 페이지)
**After**: `/dashboard`가 하나의 긴 페이지. 섹션 6개가 위→아래 흐름으로 배치. 사이드바는 앵커 내비.

## 페이지 구조 (`/dashboard` 단일 페이지, 위→아래)

```text
[#overview]    오늘의 운영 현황 (KPI 4카드 + "다음 할 일" 카드)
       ↓
[#scores]      평균 SEO/AEO/GEO 게이지 + 약점 축 강조
       ↓
[#recommendations]  추천 액션 카드 (현재 Recommendations 페이지 내용)
       ↓
[#content]     새 글 작성 패널 (현재 Content 페이지)
       ↓
[#queue]       발행 큐 (현재 AutoPublish 큐 부분)
       ↓
[#posts]       발행된 글 목록 (현재 Posts 페이지)
       ↓
[#reports]     점수 추이 차트 (현재 Reports)
```

각 섹션은 `id="…"` + `scroll-mt-20`(상단 헤더 오프셋) 적용, 섹션 사이 `<Separator />` + 섹션 헤더는 데모의 PageHero 톤.

## 디자인 자산은 그대로 유지

- 현재 대시보드 카드 스타일(`rounded-2xl border-border/50 shadow-card`), 타이포, 사이드바 룩앤필 — **변경 없음**
- 데모에서 가져오는 건 **레이아웃 흐름과 섹션 헤더 패턴**뿐 (게이지 컴포넌트는 옵션)

## 사이드바 동작 변경

- 메뉴 항목 클릭 시 `react-router` 라우팅 대신 `/dashboard#section-id`로 이동 + 스무스 스크롤
- 현재 화면에 보이는 섹션을 `IntersectionObserver`로 감지해 사이드바 active 표시 자동 갱신
- 기존 `ScrollToTop`은 hash 처리 로직이 이미 있어 그대로 호환

## 라우트 정책

- `/dashboard` = 새로운 원페이지 (모든 섹션 포함)
- `/dashboard/posts`, `/recommendations`, `/auto-publish`, `/reports`, `/content` = **유지하되 리디렉트**: 각 라우트는 `/dashboard#섹션id`로 자동 이동 (북마크/외부 링크 호환)
- `/dashboard/demo` = 그대로 유지 (내부 시연용)

## 성능/로드

- 전체 페이지가 한 번에 로드되면 무거우므로 각 섹션을 **`React.lazy` + `Suspense`**로 감싸고, 화면에 가까워지면 마운트 (IntersectionObserver 기반 lazy mount)
- 초기 보이는 `#overview`, `#scores`만 즉시 렌더, 나머지는 스크롤 시 마운트
- 데이터 페칭(예: 발행글 목록, 차트)은 섹션이 마운트될 때만 시작 → 초기 부하 최소화

## 모바일

- 동일한 원페이지, 사이드바는 기존 모바일 패턴(Sheet) 유지
- 모바일에서는 우하단에 작은 "위로" 버튼 추가 (섹션 점프용 미니 메뉴 옵션)

## 구현 작업

**신규 파일** (3):
- `src/pages/dashboard/OnePage.tsx` — 모든 섹션을 묶는 컨테이너 (섹션별 lazy mount)
- `src/features/publish/ui/SectionHeader.tsx` — 섹션마다 쓸 통일 헤더 (`chip`, `title`, `subtitle`)
- `src/features/publish/useScrollSpy.ts` — IntersectionObserver 훅, 활성 섹션 ID 반환

**수정 파일** (4):
- `src/App.tsx` — `/dashboard` → `OnePage` 매핑, 기존 서브 라우트는 hash 리디렉트로 변경
- `src/features/publish/AppSidebar.tsx` — 메뉴 항목을 `Link to="/dashboard#xxx"` + scrollSpy active 상태 연동, 이모지 제거
- `src/pages/dashboard/Layout.tsx` — outlet 그대로, 단 hash 변화 시 스크롤 보정
- `src/components/ScrollToTop.tsx` — 이미 hash 지원하므로 검증만

**기존 페이지 컴포넌트** (Index/Posts/Recommendations/AutoPublish/Reports/Content): **삭제하지 않고 섹션 컴포넌트로 재사용**. `OnePage.tsx`에서 import해 각 `<section>` 안에 배치. 내용/스타일 변경 최소화.

## 범위 외 (이번 작업에서 제외)

- 데모의 ScoreGauge/AxisBadge 추출 — 이전 라운드 제안. 이번엔 **레이아웃 통합만** 집중
- 기존 카드/버튼 디자인 토큰 변경 — 사용자 의견대로 "지금이 더 간지난다" → 그대로 유지
- 리프레시/스크롤 위치 복원 같은 고급 UX는 v2

## 진행 가능한 옵션

승인 시 default mode로 전환해 신규 3 + 수정 4 파일을 한 번에 구현합니다. 구현 후 `/dashboard`에 접속하면 사이드바 클릭 = 같은 페이지 내 스크롤로 동작합니다.

