

# 노션-스타일 칸반 워크플로우: 드래그로 발행하기

지금 대시보드는 위→아래 스크롤로 "추천 → 작성 → 큐 → 발행" 흐름이 분리돼 있어요. 이걸 **하나의 칸반 보드**로 합쳐서, 카드를 다음 칸으로 **드래그하면 상태가 바뀌는** 방식으로 재편합니다.

## 컨셉

```text
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 💡 아이디어  │ ✍️ 초안      │ ⏳ 발행 대기 │ ✅ 발행됨    │
│ idea        │ draft       │ scheduled   │ published   │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ [추천 키워드]│ [작성 중인]  │ [큐 카드 ⏰] │ [라이브 글] │
│ [추천 키워드]│ [작성 중인]  │ [큐 카드 ⏰] │ [라이브 글] │
│  + 새 아이디어│ + 빈 초안    │             │  🎲 재생성  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

- **드래그 = 상태 변경**: `idea→draft` (AI 초안 생성) / `draft→scheduled` (큐 진입) / `scheduled→published` (즉시 발행) / 역방향(unpublish)도 지원
- **카드 클릭 = 우측 패널** (Notion-style side drawer)에서 제목/본문/키워드 미리보기 + 편집
- **칸별 카운트 배지** 상단에 표시 (예: `초안 3 · 큐 5 · 발행 12`)

## 페이지 구조 변경

`/dashboard`의 `#content`, `#queue`, `#posts` 3개 섹션 → **1개의 `<KanbanBoard />` 섹션**으로 통합. `#overview`, `#scores`, `#recommendations`, `#reports`는 유지.

새 섹션 ID: `#workflow` (사이드바 메뉴도 "콘텐츠 작성/발행 큐/발행됨" 3개 → "워크플로우" 1개로 합침)

## 데이터 모델 (기존 활용)

`site_posts.status` 컬럼을 그대로 재사용. 칸 ↔ 상태 매핑:

| 칸 | status 값 | 비고 |
|---|---|---|
| 아이디어 | `idea` (신규) | Recommendations에서 "큐에 담기" 누른 키워드 |
| 초안 | `draft` (기존) | 본문 있음, 미발행 |
| 발행 대기 | `scheduled` (신규) | `published_at`이 미래 시각 |
| 발행됨 | `published` (기존) | |

→ **마이그레이션 필요**: `status` CHECK 제약을 `idea/draft/scheduled/published`로 확장 (현재는 텍스트라 제약만 추가)

## 드래그 동작 명세

| From → To | 동작 |
|---|---|
| idea → draft | `generate-content-draft` 호출, AI가 본문 생성 후 `status='draft'` |
| draft → scheduled | 모달로 발행 시각 선택 → `status='scheduled'`, `published_at` 세팅 |
| scheduled → published | 즉시 발행 (`publish-site-post` 호출), `published_at=now()` |
| published → draft | 발행 취소 (기존 unpublish 로직) |
| 모든 칸 → 🗑️ | 카드를 하단 휴지통 영역에 드롭 시 삭제 확인 |
| **🎲 published 카드** | 카드 우상단 주사위 버튼 (현재 그대로 유지) |

낙관적 업데이트 + 실패 시 롤백 + toast 알림.

## UI/디자인

- **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`) 사용 — React 18 호환, 가볍고 접근성 좋음
- 기존 Card 디자인 자산 그대로 (rounded-2xl, shadow-card). 카드 폭만 살짝 줄여서 4칸 그리드에 맞춤
- 데스크톱: 4칸 가로 그리드 (`grid-cols-4`, 각 칸은 `min-h-[400px]`, 내부 스크롤)
- 모바일 (≤768px): 칸반 대신 **탭 전환** (`Tabs` 컴포넌트로 칸 4개를 탭으로) — 모바일에서 가로 드래그는 UX가 나빠서. 카드 우측에 "다음 단계로 ▶" 버튼 제공
- 우측 디테일 패널: 기존 `Sheet` 컴포넌트 재사용 (오른쪽에서 슬라이드)

## 구현 작업

**신규 파일** (5):
- `src/features/publish/kanban/KanbanBoard.tsx` — 보드 컨테이너, dnd-kit DndContext
- `src/features/publish/kanban/KanbanColumn.tsx` — 칸 1개 (droppable)
- `src/features/publish/kanban/KanbanCard.tsx` — 카드 1개 (draggable, 상태별 액션)
- `src/features/publish/kanban/PostDetailPanel.tsx` — 우측 Sheet (편집/미리보기)
- `src/features/publish/kanban/MobileKanbanTabs.tsx` — 모바일 탭 폴백

**수정 파일** (3):
- `src/pages/dashboard/OnePage.tsx` — `#content`/`#queue`/`#posts` 3섹션을 `#workflow` 1섹션으로 교체
- `src/features/publish/AppSidebar.tsx` — 메뉴 통합
- `src/App.tsx` — 기존 라우트 리디렉트는 `#workflow`로

**삭제 (또는 deprecate)**: `src/pages/dashboard/Content.tsx`, `AutoPublish.tsx`, `Posts.tsx` — 로직은 KanbanCard/KanbanColumn 내부로 흡수

**DB 마이그레이션** (1):
- `site_posts.status` 허용값에 `idea`, `scheduled` 추가 (CHECK 제약 또는 enum)

**패키지 설치**: `@dnd-kit/core`, `@dnd-kit/sortable`

## 트레이드오프

- **장점**: 한눈에 워크플로 파악, 드래그 = 직관적 발행, 추천→발행 한 화면 완결
- **위험**: 글이 많아지면 칸이 길어짐 → 칸별 페이지네이션(20개 표시 + "더 보기")으로 해결
- **모바일 UX**: 드래그 대신 탭+버튼 폴백 필수 (이미 계획에 포함)

## 범위 외 (이번 작업 제외)

- 다중 선택 후 일괄 드래그 (v2)
- 칸 사이 자동 정렬/규칙 (v2)
- `Recommendations` 카드를 `idea` 칸으로 직접 드래그 (이번엔 "큐에 담기" 버튼 클릭으로 idea 생성 — 칸 이동만 드래그)

승인하시면 default mode로 전환해 마이그레이션 → 패키지 설치 → 신규 5 파일 구현 → 기존 3 페이지 흡수 순으로 진행합니다.

