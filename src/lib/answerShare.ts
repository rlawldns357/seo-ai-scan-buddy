import { supabase } from "@/integrations/supabase/client";

export interface AnswerShareEngineSummary {
  mentioned: number;
  total: number;
  share: number;
}

export interface AnswerShareByQuery {
  query: string;
  anyMentioned: boolean;
  engines: Array<{
    engine: "perplexity" | "chatgpt" | "gemini" | "claude";
    mentioned: boolean;
    position: number | null;
    citation: boolean;
    competitors: string[];
    error?: string;
  }>;
}

export interface AnswerShareData {
  url: string;
  brand: string;
  domain: string;
  category: string;
  aliases: string[];
  competitors: string[];
  queries: string[];
  responseShare: number;
  citationShare: number;
  firstMentionShare: number;
  avgBrandPosition: number | null;
  competitorShare: Record<string, number>;
  missedQueries: string[];
  byEngine: Record<string, AnswerShareEngineSummary>;
  byQuery: AnswerShareByQuery[];
  totalResponses: number;
  generatedAt: string;
}

export async function measureAnswerShare(input: {
  url: string;
  brand?: string;
  category?: string;
}): Promise<{ data?: AnswerShareData; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("measure-answer-share", {
      body: input,
    });
    if (error) return { error: error.message ?? String(error) };
    if (!data?.success) return { error: data?.error ?? "측정에 실패했어요." };
    return { data: data.data as AnswerShareData };
  } catch (e) {
    return { error: String(e) };
  }
}
