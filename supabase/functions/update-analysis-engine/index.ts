import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { logApiCost, extractUsage } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Perplexity 단일 호출로 최신 트렌드 + 인용 URL 묶음 추출
const TREND_RESEARCH_PROMPT = `You are a senior SEO/AEO/GEO industry analyst. Research the LATEST (last 30 days) developments across:
- Google search algorithm updates, Core Web Vitals, AI Overview / SGE behavior
- AEO (Answer Engine Optimization): how ChatGPT, Perplexity, Claude, Gemini cite sources
- GEO (Generative Engine Optimization): structured data, llms.txt, AI crawler access
- Naver / Korean search ecosystem changes
- New schema.org types and structured data best practices

For each meaningful trend, give:
1. A concise description (1-2 sentences)
2. Why it affects scoring criteria
3. The source URL

Be skeptical: only include trends with credible sources. Skip rumors and undated claims.
Today is ${new Date().toISOString().slice(0, 10)}.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get current engine config
    const { data: currentConfig } = await supabase
      .from("engine_config")
      .select("*")
      .eq("config_key", "analysis_prompt")
      .single();

    if (!currentConfig) {
      throw new Error("No engine config found");
    }

    const currentVersion = currentConfig.version;
    const currentPrompt = currentConfig.config_value;

    console.log(`Current engine version: v${currentVersion}`);

    // 2. Research latest trends — prefer Perplexity sonar-pro (real-time + citations),
    //    fall back to Firecrawl search if unavailable.
    let trendResults: string[] = [];
    let trendCitations: string[] = [];

    if (PERPLEXITY_API_KEY) {
      try {
        const pplxRes = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              { role: "system", content: TREND_RESEARCH_PROMPT },
              { role: "user", content: "List the most important SEO/AEO/GEO trends from the last 30 days that should affect a scoring engine." },
            ],
            search_recency_filter: "month",
            temperature: 0.2,
          }),
        });

        if (pplxRes.ok) {
          const pplxData = await pplxRes.json();
          const content = pplxData.choices?.[0]?.message?.content;
          const u = extractUsage(pplxData);
          logApiCost({ function_name: "update-analysis-engine", model: "sonar-pro", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { stage: "trend-research" } });
          if (content) trendResults.push(`[Perplexity Research]\n${content}`);
          if (Array.isArray(pplxData.citations)) {
            trendCitations = pplxData.citations.slice(0, 15);
          }
          console.log(`Perplexity returned ${trendCitations.length} citations`);
        } else {
          console.warn("Perplexity failed:", pplxRes.status, await pplxRes.text());
        }
      } catch (e) {
        console.warn("Perplexity research error:", e);
      }
    }

    // Fallback to Firecrawl if Perplexity yielded nothing
    if (trendResults.length === 0 && FIRECRAWL_API_KEY) {
      const fallbackQueries = [
        "SEO algorithm update 2026",
        "AI search engine optimization trends",
        "structured data SEO best practices 2026",
      ];
      for (const query of fallbackQueries) {
        try {
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, limit: 5, tbs: "qdr:m" }),
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            logApiCost({ function_name: "update-analysis-engine", model: "firecrawl/search", requests: 1, metadata: { query } });
            for (const r of searchData.data || []) {
              trendResults.push(`[${r.title}] ${r.description || ""}`);
              if (r.url) trendCitations.push(r.url);
            }
          }
        } catch (e) {
          console.warn(`Firecrawl fallback failed for "${query}":`, e);
        }
      }
    }

    console.log(`Found ${trendResults.length} trend blocks, ${trendCitations.length} citations`);

    // 3. Ask AI to analyze trends and suggest prompt updates
    const analysisPrompt = `You are an SEO/AEO/GEO analysis engine updater. Your job is to review the latest industry trends and determine if the scoring criteria need updating.

Current analysis engine prompt (version ${currentVersion}):
---
${currentPrompt}
---

Latest industry trends found (with citations from Perplexity sonar-pro real-time research):
---
${trendResults.length > 0 ? trendResults.join("\n\n") : `No trend data available. Use your knowledge of the latest SEO/AEO/GEO developments as of ${new Date().toISOString().slice(0, 10)}.`}
---
${trendCitations.length > 0 ? `\nSource citations:\n${trendCitations.map((u, i) => `[${i + 1}] ${u}`).join("\n")}\n---\n` : ""}

Tasks:
1. Identify any significant changes in SEO/AEO/GEO best practices that should affect scoring criteria
2. Check if weights need adjustment based on current industry importance
3. Check if new sub-signals should be added or existing ones modified
4. Consider: Google algorithm updates, AI search changes (SGE/AI Overview), new structured data types, Naver/Korean search updates, new AI platforms

IMPORTANT RULES:
- Only suggest changes if there are meaningful updates. Don't change for the sake of changing.
- Preserve the overall JSON output format structure exactly
- Keep all Korean text labels consistent
- Maintain the GEO scoring conservative strategy (score lower to emphasize improvement needs)
- Any new sub-signals must have appropriate weights that sum to 100 within each axis
- **NAVER WEBMASTER RULEBOOK IS IMMUTABLE BASELINE**: A separate config key 'naver_webmaster_rulebook' contains official Naver guidelines (Yeti crawler, robots.txt, semantic HTML, JSON-LD, alt text, etc.). You MUST NOT propose any change that contradicts or weakens those rules. New trends are added as supplementary signals only — never replace the rulebook foundation.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: analysisPrompt },
          {
            role: "user",
            content: "Analyze the trends and respond with the updated prompt if changes are needed.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "update_engine",
              description: "Submit engine update decision",
              parameters: {
                type: "object",
                properties: {
                  needs_update: {
                    type: "boolean",
                    description: "Whether the engine needs updating",
                  },
                  changes_summary: {
                    type: "string",
                    description: "Korean summary of changes made or reason for no changes",
                  },
                  trends_found: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of key trends identified",
                  },
                  updated_prompt: {
                    type: "string",
                    description: "The full updated analysis prompt if needs_update is true, otherwise empty string",
                  },
                },
                required: ["needs_update", "changes_summary", "trends_found", "updated_prompt"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "update_engine" },
        },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);

      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway returned ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    {
      const u = extractUsage(aiData);
      logApiCost({ function_name: "update-analysis-engine", model: "google/gemini-3-flash-preview", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { stage: "engine-update" } });
    }
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const args = JSON.parse(toolCall.function.arguments);

    if (args.needs_update && args.updated_prompt) {
      // 4. Update the engine config
      const newVersion = currentVersion + 1;

      const { error: updateError } = await supabase
        .from("engine_config")
        .update({
          config_value: args.updated_prompt,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("config_key", "analysis_prompt");

      if (updateError) throw new Error(`Failed to update config: ${updateError.message}`);

      // 5. Log the update
      await supabase.from("engine_update_log").insert({
        version: newVersion,
        changes_summary: args.changes_summary,
        trends_found: { trends: args.trends_found, citations: trendCitations, source: trendCitations.length > 0 ? "perplexity" : "fallback" },
        previous_prompt: currentPrompt,
        new_prompt: args.updated_prompt,
        status: "success",
      });

      console.log(`Engine updated to v${newVersion}: ${args.changes_summary}`);

      return new Response(
        JSON.stringify({
          success: true,
          updated: true,
          version: newVersion,
          changes: args.changes_summary,
          trends: args.trends_found,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // No update needed
      await supabase.from("engine_update_log").insert({
        version: currentVersion,
        changes_summary: args.changes_summary,
        trends_found: { trends: args.trends_found || [], citations: trendCitations, source: trendCitations.length > 0 ? "perplexity" : "fallback" },
        status: "no_changes",
      });

      console.log(`No update needed: ${args.changes_summary}`);

      return new Response(
        JSON.stringify({
          success: true,
          updated: false,
          version: currentVersion,
          reason: args.changes_summary,
          trends: args.trends_found,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error updating engine:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
