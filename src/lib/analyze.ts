import type { DemoResult } from "@/data/demoResults";
import { isNaverStoreUrl } from "@/lib/naverStore";

export interface AnalyzeError {
  message: string;
}

/**
 * 네이버 스토어 분석 결과는 일반 결과 위에 storeContext 메타가 추가됨.
 * UI에서 권위 누수 도넛/외부 점유율 바 등 스토어 전용 섹션 렌더링에 사용.
 */
export interface NaverStoreContext {
  type: "brand" | "smartstore";
  slug: string;
  storeUrl: string;
  authorityLeakageRatio: number; // 0~1
  ownContentRatio: number;       // 0~1
  ownDomain?: string | null;
  ownDomainSource?: "user" | "inferred" | "none";
  ownDomainDominant?: boolean;
  externalSurfaces: {
    shop: number;
    blog: number;
    cafe: number;
    kin: number;
    webkr: number;
  };
  sampleTitles: {
    shop: string[];
    blog: string[];
    webkr: string[];
  };
}

export type ExtendedDemoResult = DemoResult & {
  storeContext?: NaverStoreContext;
};

export async function analyzeSite(
  url: string,
  options?: { ownDomain?: string },
): Promise<{ data?: ExtendedDemoResult; error?: AnalyzeError }> {
  const isNaverStore = isNaverStoreUrl(url);
  const functionName = isNaverStore ? "analyze-naver-store" : "analyze-site";
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), isNaverStore ? 30000 : 120000);

    const body: Record<string, unknown> = { url };
    if (isNaverStore && options?.ownDomain) body.ownDomain = options.ownDomain;

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { error: { message: `분석 서버 오류 (${res.status}): ${errText}` } };
    }

    const json = await res.json();

    if (!json.success) {
      return { error: { message: json.error || "분석에 실패했어요." } };
    }

    return { data: json.data as ExtendedDemoResult };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { error: { message: "분석 시간이 초과되었어요. 다시 시도해 주세요." } };
    }
    return { error: { message: "네트워크 오류가 발생했어요. 인터넷 연결을 확인해 주세요." } };
  }
}
