---
name: Autopublish Control
description: 사이트별 자동 발행 컨트롤. autopublish_settings 테이블 + AutopublishControl 팝오버(워크플로우 헤더). 매분 process-scheduled-posts cron이 KST 요일/시간 매칭 시 1편씩 발행, 큐 부족 시 topup-idea-queue로 자동 보충
type: feature
---

## 핵심 구성
- **테이블 `autopublish_settings`** (site_id 1행, RLS=owner): enabled, weekdays(0~6), hours_kst(0~23), daily_limit(1~10), auto_topup, min_queue. validate trigger로 범위 체크.
- **UI**: `src/features/publish/AutopublishControl.tsx` — 워크플로우 툴바의 ⚡ 버튼 → Popover. 요일/시간/일일 캡/자동 보충/최소 큐 즉시 저장(useAutopublishSettings 훅).
- **cron `process-scheduled-posts`** (매분): (1) 수동 scheduled+published_at<=now 발행, (2) enabled 사이트마다 KST weekday/hour 매칭 시 가장 오래된 scheduled→없으면 draft 1편 발행, (3) last_run_at으로 같은 시각 중복 트리거 방지, (4) 일일 발행 캡 체크, (5) auto_topup이면 큐<min_queue일 때 topup-idea-queue 비동기 호출.
- **함수 `topup-idea-queue`** (service-role only): demo-stream-content recommend 모드로 추천 받아 중복 제목 제외, 최대 5편/회 idea로 INSERT(is_auto_generated=true).

## 운영
- 기본값: 월~금 09:00 KST, 하루 1편, 큐 최소 5편 자동 보충.
- 수동 예약(KanbanBoard handleSave의 published_at)도 동일 cron에서 처리됨 — 두 경로가 한 함수에 있음.
- 발행 자체는 publish-site-post가 수행 (백링크/스코어링).
