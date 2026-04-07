import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TREND_SEARCH_QUERIES = [
  "SEO algorithm update 2026",
  "Google search ranking changes 2026",
  "AI search engine optimization trends",
  "AEO answer engine optimization latest",
  "GEO generative engine optimization updates",
  "Google SGE AI overview changes",
  "Naver search algorithm update",
  "structured data SEO best practices 2026",
  "Core Web Vitals updates 2026",
  "AI crawler robots.txt changes",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
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

    // 2. Search for latest trends using Firecrawl search
    let trendResults: string[] = [];

    if (FIRECRAWL_API_KEY) {
      // Pick 3 random queries to avoid rate limits
      const selectedQueries = TREND_SEARCH_QUERIES
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      for (const query of selectedQueries) {
        try {
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
              tbs: "qdr:m", // Last month
            }),
          });

          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const results = searchData.data || [];
            for (const r of results) {
              trendResults.push(`[${r.title}] ${r.description || ""}`);
            }
          }
        } catch (e) {
          console.warn(`Search failed for "${query}":`, e);
        }
      }
    }

    console.log(`Found ${trendResults.length} trend results`);

    // 3. Ask AI to analyze trends and suggest prompt updates
    const analysisPrompt = `You are an SEO/AEO/GEO analysis engine updater. Your job is to review the latest industry trends and determine if the scoring criteria need updating.

Current analysis engine prompt (version ${currentVersion}):
---
${currentPrompt}
---

Latest industry trends found:
---
${trendResults.length > 0 ? trendResults.join("\n\n") : "No trend data available. Use your knowledge of the latest SEO/AEO/GEO developments as of ${new Date().toISOString().slice(0, 10)}."}
---

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
- Any new sub-signals must have appropriate weights that sum to 100 within each axis`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
        trends_found: args.trends_found,
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
        trends_found: args.trends_found || [],
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
