import type { DemoResult } from "@/data/demoResults";

export interface AnalyzeError {
  message: string;
}

export async function analyzeSite(url: string): Promise<{ data?: DemoResult; error?: AnalyzeError }> {
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-site`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ url }),
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

    return { data: json.data as DemoResult };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { error: { message: "분석 시간이 초과되었어요. 다시 시도해 주세요." } };
    }
    return { error: { message: "네트워크 오류가 발생했어요. 인터넷 연결을 확인해 주세요." } };
  }
}
