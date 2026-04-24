import { getPaddleEnvironment } from "@/lib/paddle";

/**
 * Subtle banner shown only in the test (sandbox) environment so internal
 * users immediately know real payments are not being processed.
 * Renders nothing in production — safe to mount globally.
 */
export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;
  return (
    <div className="w-full bg-amber-100 border-b border-amber-300 px-4 py-1.5 text-center text-[11px] font-medium text-amber-900">
      🧪 미리보기 결제는 테스트 모드입니다. 실제 카드는 청구되지 않아요.
    </div>
  );
}
