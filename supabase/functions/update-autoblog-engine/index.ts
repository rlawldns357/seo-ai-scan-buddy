import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 자동 글쓰기 엔진 트렌드 검색 쿼리 (분석 엔진과는 다른 콘텐츠 작성 관점)
const TREND_QUERIES = [
  "Google AI Overview content guidelines 2026",
  "ChatGPT Perplexity citation criteria for blog posts",
  "FAQ schema best practices 2026",
  "AEO answer engine content writing tips",
  "GEO generative engine content optimization",
  "Naver SEO blog ranking factors 2026",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Load current prompt
    const { data: cfg } = await supabase
      .from("autoblog_engine_config")
      .select("*")
      .eq("config_key", "content_system_prompt")
      .single();
    if (!cfg) throw new Error("autoblog content_system_prompt not seeded");

    const currentVersion: number = cfg.version;
    const currentPrompt: string = cfg.config_value;

    // 2. Fetch trends (best-effort, optional)
    const trends: string[] = [];
    if (FIRECRAWL_API_KEY) {
      const picks = TREND_QUERIES.sort(() => Math.random() - 0.5).slice(0, 3);
      for (const q of picks) {
        try {
          const r = await fetch("https://api.firecrawl.dev/v2/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: q, limit: 4, tbs: "qdr:m" }),
          });
          if (r.ok) {
            const j = await r.json();
            const items = j.data?.web || j.data || [];
            for (const it of items.slice(0, 4)) {
              trends.push(`[${it.title || "untitled"}] ${it.description || it.snippet || ""}`);
            }
          }
        } catch (e) {
          console.warn("firecrawl search fail", q, e);
        }
      }
    }

    // 3. Ask AI to revise the content writing prompt (NOT analysis prompt)
    const aiSystem = `You are an editor for an autoblog content-writing system prompt. Decide if the prompt needs to evolve based on the latest content/SEO/AEO/GEO industry trends. The prompt instructs an AI to WRITE Korean blog posts (not score sites). Preserve the structure: 3-axis rules (SEO/AEO/GEO), forbidden list, Korean tone. Only change if there is a meaningful new best practice. Keep the prompt in Korean.`;

    const userMsg = `[Current autoblog content_system_prompt v${currentVersion}]
${currentPrompt}

[Recent trends found]
${trends.length ? trends.join("\n") : "(no firecrawl results — rely on your built-in knowledge)"}

Decide whether to update.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: aiSystem },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "update_autoblog",
            parameters: {
              type: "object",
              properties: {
                needs_update: { type: "boolean" },
                changes_summary: { type: "string", description: "한국어 한 줄 요약" },
                trends_found: { type: "array", items: { type: "string" } },
                updated_prompt: { type: "string", description: "needs_update=true일 때 전체 새 프롬프트" },
              },
              required: ["needs_update", "changes_summary", "trends_found", "updated_prompt"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "update_autoblog" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI fail", aiRes.status, t);
      if (aiRes.status === 429) return json({ error: "rate limit" }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted" }, 402);
      throw new Error(`AI ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const args = JSON.parse(aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}");

    if (args.needs_update && args.updated_prompt && args.updated_prompt.length > 200) {
      const newVersion = currentVersion + 1;
      await supabase
        .from("autoblog_engine_config")
        .update({ config_value: args.updated_prompt, version: newVersion, updated_at: new Date().toISOString() })
        .eq("config_key", "content_system_prompt");

      await supabase.from("autoblog_engine_log").insert({
        version: newVersion,
        config_key: "content_system_prompt",
        changes_summary: args.changes_summary,
        trends_found: args.trends_found || [],
        previous_value: currentPrompt,
        new_value: args.updated_prompt,
        status: "success",
      });

      return json({ success: true, updated: true, version: newVersion, changes: args.changes_summary, trends: args.trends_found });
    }

    await supabase.from("autoblog_engine_log").insert({
      version: currentVersion,
      config_key: "content_system_prompt",
      changes_summary: args.changes_summary || "no meaningful change",
      trends_found: args.trends_found || [],
      status: "no_changes",
    });

    return json({ success: true, updated: false, version: currentVersion, reason: args.changes_summary, trends: args.trends_found });
  } catch (e) {
    console.error("update-autoblog-engine error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
