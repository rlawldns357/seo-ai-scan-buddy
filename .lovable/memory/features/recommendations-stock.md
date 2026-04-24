---
name: Recommendations Idea Stock
description: /dashboard/recommendations은 site_posts(status='idea')를 재고처럼 쌓아두는 화면. '아이디어 N개 더 받기'로 수동 보충, autopublish_settings 기반 자동 보충(min_queue/auto_topup), '발행 대기로' 클릭 시 generate-content-draft로 본문 생성 후 status='scheduled' 승격
type: feature
---

## 구조
- 저장소: `site_posts` 테이블, `status='idea'` (별도 테이블 안 만듦)
- idea 행은 본문이 placeholder 한 줄 (`# 제목\n\n(자동 보충 — ...)`)
- 본문 RLS는 1자 이상이면 통과하도록 마이그레이션됨 (idea의 짧은 placeholder 허용)
- 칸반(KanbanBoard)은 `.neq("status","idea")`로 idea 제외 — idea는 추천 페이지 전용

## 보충 경로
1. 수동: `regenerate-idea` mode='topup' (사용자 인증 → 본인 사이트 검증 → topup-idea-queue 호출)
2. 자동: `process-scheduled-posts` cron → autopublish_settings.auto_topup=true && depth<min_queue 일 때 topup-idea-queue 호출
3. topup-idea-queue는 `demo-stream-content` recommend 모드 호출, seed 옵션 지원, 한 번에 최대 5개 insert

## 클라이언트 동작 (Recommendations.tsx)
- `loadIdeas`: site_posts where status='idea' 최신 50개
- `topup(target)`: 현재 큐 + 5 목표로 보충
- `promoteIdea`: generate-content-draft 호출 → 같은 row UPDATE로 status='scheduled' + 본문/제목 채움 → 추천 화면에서 사라지고 칸반 발행대기 칸에 등장
- `deleteIdea`: site_posts DELETE (owner RLS)
- `filterSeed`: 클라이언트 필터링만 (서버 호출 안 함). topup 시에만 seed로 전달돼 보충 키워드 힌트로 사용

## 안 하는 것
- 시드 입력 시 즉시 AI 호출 (구버전 ideas3 모드는 코드엔 남아있지만 UI에선 사용 안 함)
- 별도 site_post_ideas 테이블
