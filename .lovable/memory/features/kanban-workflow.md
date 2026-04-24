---
name: Kanban Workflow
description: `/dashboard#workflow`의 2칸 칸반 (scheduled/published). "AI로 새 글 추가" 클릭 시 generate-content-draft 호출 후 바로 scheduled로 INSERT. dnd-kit 드래그=상태변경, 모바일=Tabs(grid-cols-2). 레거시 idea/draft 상태는 UI에서 scheduled로 normalize
type: feature
---

## 단계
- **발행 대기 (scheduled)**: AI가 본문을 생성한 글들의 큐. 예약 시각 지정 시 cron이 자동 발행, 비우면 수동.
- **발행됨 (published)**: 라이브.

## 핵심
- "AI로 새 글 추가" → 제목 prompt → `generate-content-draft` → 결과로 site_posts INSERT (status=scheduled).
- 드래그 scheduled→published는 publish-site-post 호출. published→scheduled는 발행 취소(unpublish).
- 레거시 `idea`/`draft` row는 `normalizeStatus`로 scheduled 칼럼에 묶여 표시. 새로 생성되는 행은 항상 scheduled로 시작.
- PostDetailPanel의 "AI로 다시 생성" 버튼은 scheduled에서도 노출(재생성 가능).
