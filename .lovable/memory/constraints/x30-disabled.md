---
name: x30 AI 인지 일시 OFF
description: ×30 AI 응답 점유율(probe-ai-perception/measure-answer-share)은 토큰 과소진으로 OFF. ENABLE_X30 플래그로 복귀
type: constraint
---
**상태:** OFF (v0.12.0-beta).
**스위치:** `src/lib/featureFlags.ts` → `ENABLE_X30`.
**가드 지점:** Index.tsx "AI에게 직접 물어보기" 버튼·AskAITeaser·AIPerceptionCard 2곳. /design-test만 잔류 (내부 검수용).
**Why:** 사용자 1명당 5엔진 × 5콜 = 25콜, ×30 모달 누르면 +120콜. Perplexity 401 + Lovable AI 429 동반.
**다시 켤 때:**
1) ENABLE_X30=true
2) PERPLEXITY_API_KEY 재발급
3) probe-ai-perception: Promise.all → allSettled
4) 엔진별 콜 수 축소 (awareness 1 + 추천 1)
5) askAIEnabled default는 false 유지

상세: `.lovable/blueprint/x30-ai-perception.md`
