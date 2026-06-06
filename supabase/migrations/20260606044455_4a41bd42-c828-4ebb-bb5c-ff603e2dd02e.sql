-- threads_engine_config 캐릭터·API 지식 컬럼 추가
ALTER TABLE public.threads_engine_config
  ADD COLUMN IF NOT EXISTS character_name TEXT NOT NULL DEFAULT '쓰레디',
  ADD COLUMN IF NOT EXISTS character_tagline TEXT NOT NULL DEFAULT 'Threads 발행 전문가',
  ADD COLUMN IF NOT EXISTS character_voice TEXT NOT NULL DEFAULT '친근하고 빠른 마케터 톤. 반말, 결론 먼저, 이모지 절제(최대 1개), 한 줄로 끝내는 걸 선호.',
  ADD COLUMN IF NOT EXISTS api_knowledge TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS api_knowledge_updated_at TIMESTAMP WITH TIME ZONE;

-- 기존 한 줄짜리 룰이 있다면 캐릭터 시그니처는 덮어쓰지 않음 (DEFAULT만 적용됨)
-- 시드: api_knowledge 비어있으면 알려진 기본 스펙 주입
UPDATE public.threads_engine_config
SET api_knowledge = $$# Meta Threads Graph API 핵심 스펙 (최초 시드 · 자동 갱신 대상)

## 게시물 제약
- 텍스트 최대 500자
- 이미지: JPEG/PNG, 최대 8MB, 권장 1080x1080
- 비디오: MP4/MOV, 최대 1GB / 5분
- 캐러셀: 2~20개 미디어
- 링크: 본문에 그대로 포함 (자동 카드 미리보기)

## 발행 흐름
1. POST /me/threads (media_type=TEXT|IMAGE|VIDEO|CAROUSEL) → creation_id
2. POST /me/threads_publish?creation_id={id} → post_id
3. 미디어는 업로드 후 5분 내 publish 필요

## 답글/리포스트
- in_reply_to / quote_post_id 지원
- reply_control: everyone | accounts_you_follow | mentioned_only

## 인사이트
- views, likes, replies, reposts, quotes, shares (게시 후 24h 이후 안정화)

## 레이트 리밋
- 사용자당 24h 250 게시물
- 답글 포함 시 1000 호출

## 권장 사항
- 첫 줄(훅) 80자 이내가 피드에서 잘림 없음
- 해시태그는 1개만 트래킹됨 (#만 효과)
- 외부 링크보다 자체 이미지/캐러셀 노출이 우대됨
$$
WHERE config_key = 'threads_engine' AND (api_knowledge IS NULL OR length(api_knowledge) < 50);