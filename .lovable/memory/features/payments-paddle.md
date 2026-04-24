---
name: Payments — Paddle (Lite only during beta)
description: Paddle 결제 활성화됨. Lite(autoblog_lite_monthly, ₩4,900/월)만 결제 가능. Pro/Studio는 '곧 출시' 배지 + BetaSignupModal로 대기리스트
type: feature
---
**활성화 상태**: Lovable Built-in Payments (Paddle) 켜짐. Test/Live 환경 자동 분기.

**상품 카탈로그** (sandbox에 생성, publish 시 live 자동 동기화):
- `autoblog_lite` / price `autoblog_lite_monthly` — ₩4,900/월

**Pro/Studio**: 카탈로그 미등록. Pricing 카드는 '곧 출시' 배지 + "출시 알림 + 50% 쿠폰" 버튼 → BetaSignupModal.

**핵심 코드**:
- `src/lib/paddle.ts` — getPaddleEnvironment / initializePaddle / getPaddlePriceId
- `src/hooks/usePaddleCheckout.ts` — overlay 체크아웃
- `src/components/PaymentTestModeBanner.tsx` — App 최상단 마운트 (sandbox에서만 노출)
- `supabase/functions/get-paddle-price` — external_id → Paddle 내부 ID 해석
- `supabase/functions/payments-webhook` — subscription.* 이벤트 → `subscriptions` 테이블 upsert
- `supabase/functions/_shared/paddle.ts` — 게이트웨이 fetch + verifyWebhook

**DB**: `public.subscriptions` (user_id, environment, product_id, price_id, status, paddle_subscription_id, current_period_end…) + `has_active_subscription(_user_id, _env)` 헬퍼. RLS: 본인/admin만 읽기, service_role만 쓰기. realtime 활성.

**왜 이렇게**: 베타 무료 정책과 충돌 최소화. Lite만 결제 뚫어 매출 시작 + Pro/Studio는 베타 신청자 풀 누적 → 출시 시 50% 쿠폰 발사대.

**금지**: Pro/Studio CTA를 '결제하기'로 되돌리지 말 것 (카탈로그 미등록 → 체크아웃 실패).
