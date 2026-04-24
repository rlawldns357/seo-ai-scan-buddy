import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { toast } from "@/hooks/use-toast";

interface OpenCheckoutOptions {
  /** Human-readable price ID created via create_product/create_price (e.g. `autoblog_lite_monthly`). */
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  /** Will be available on webhook payloads to link the purchase to a user. */
  customData?: Record<string, string>;
  successUrl?: string;
}

/** React hook wrapping Paddle.Checkout.open() with sensible defaults. */
export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (opts: OpenCheckoutOptions) => {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(opts.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: opts.quantity ?? 1 }],
        customer: opts.customerEmail ? { email: opts.customerEmail } : undefined,
        customData: opts.customData,
        settings: {
          displayMode: "overlay",
          successUrl:
            opts.successUrl || `${window.location.origin}/dashboard?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (err) {
      toast({
        title: "결제창을 열지 못했어요",
        description: err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
