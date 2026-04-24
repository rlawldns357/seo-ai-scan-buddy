/**
 * Paddle.js client utility — single source of truth for environment + checkout init.
 * The client token is shipped via Vite env (`.env.development` / `.env.production`).
 * Test/live is derived from the token prefix.
 */
import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

export type PaddleEnv = "sandbox" | "live";

export function getPaddleEnvironment(): PaddleEnv {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;
let initializing: Promise<void> | null = null;

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (initializing) return initializing;
  if (!clientToken) {
    throw new Error("결제 모듈이 아직 초기화되지 않았어요. 잠시 후 다시 시도해 주세요.");
  }

  initializing = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-paddle-js]');
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      script.dataset.paddleJs = "true";
      script.async = true;
      document.head.appendChild(script);
    }
    const onReady = () => {
      try {
        const env = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
        window.Paddle.Environment.set(env);
        window.Paddle.Initialize({ token: clientToken });
        paddleInitialized = true;
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    if (window.Paddle) {
      onReady();
    } else {
      script.addEventListener("load", onReady, { once: true });
      script.addEventListener("error", () => reject(new Error("Paddle.js 로드에 실패했어요.")), {
        once: true,
      });
    }
  });

  return initializing;
}

/** Resolve a human-readable price ID (e.g. `autoblog_lite_monthly`) to a Paddle internal ID. */
export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment },
  });
  if (error || !data?.paddleId) {
    throw new Error(`가격 정보를 불러오지 못했어요: ${priceId}`);
  }
  return data.paddleId as string;
}
