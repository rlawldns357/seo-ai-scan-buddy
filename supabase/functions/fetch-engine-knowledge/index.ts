// 매일 1회 등록된 레퍼런스 URL을 Firecrawl로 스크랩해 engine_knowledge_sources에 저장.
// 어드민에서 sourceId를 지정해 단건 강제 실행도 가능.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { logApiCost } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

async function scrapeOne(apiKey: string, url: string) {
  const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "summary"],
      onlyMainContent: true,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Firecrawl ${res.status}: ${data?.error || res.statusText}`);
  }
  const markdown: string =
    data?.markdown ?? data?.data?.markdown ?? "";
  const summary: string =
    data?.summary ?? data?.data?.summary ?? "";
  return { markdown: markdown.slice(0, 60000), summary: summary.slice(0, 4000) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const sourceId: string | undefined = body?.sourceId;

    let query = supabase
      .from("engine_knowledge_sources")
      .select("id, url, label")
      .eq("active", true);
    if (sourceId) query = query.eq("id", sourceId);

    const { data: sources, error } = await query;
    if (error) throw error;
    if (!sources?.length) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ id: string; status: "ok" | "error"; message?: string }> = [];

    for (const src of sources) {
      try {
        const { markdown, summary } = await scrapeOne(FIRECRAWL_API_KEY, src.url);
        logApiCost({
          function_name: "fetch-engine-knowledge",
          model: "firecrawl/scrape",
          requests: 1,
          metadata: { url: src.url, label: src.label },
        });
        await supabase
          .from("engine_knowledge_sources")
          .update({
            last_content: markdown,
            last_summary: summary,
            last_fetched_at: new Date().toISOString(),
            last_error: null,
            fetch_count: (await supabase
              .from("engine_knowledge_sources")
              .select("fetch_count")
              .eq("id", src.id)
              .single()).data?.fetch_count + 1 || 1,
          })
          .eq("id", src.id);
        results.push({ id: src.id, status: "ok" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase
          .from("engine_knowledge_sources")
          .update({ last_error: msg, last_fetched_at: new Date().toISOString() })
          .eq("id", src.id);
        results.push({ id: src.id, status: "error", message: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
