import { useEffect, useRef } from "react";
import { getPaddleEnvironment } from "@/lib/paddle";

/**
 * Subtle banner shown only in the test (sandbox) environment so internal
 * users immediately know real payments are not being processed.
 * Renders nothing in production — safe to mount globally.
 */
export function PaymentTestModeBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const isSandbox = getPaddleEnvironment() === "sandbox";

  useEffect(() => {
    if (!isSandbox) {
      document.documentElement.style.removeProperty("--payment-test-banner-height");
      return;
    }

    const updateHeight = () => {
      const height = bannerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--payment-test-banner-height", `${height}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      document.documentElement.style.removeProperty("--payment-test-banner-height");
    };
  }, [isSandbox]);

  if (!isSandbox) return null;
  return (
    <div ref={bannerRef} className="sticky top-0 z-[60] w-full bg-warning/10 border-b border-warning/30 px-4 py-1.5 text-center text-[11px] font-medium text-warning-foreground">
      🧪 미리보기 결제는 테스트 모드입니다. 실제 카드는 청구되지 않아요.
    </div>
  );
}
