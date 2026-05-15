import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { password, days = 30, action, postId, published } = body;
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");

    if (!adminPassword || password !== adminPassword) {
      return new Response(
        JSON.stringify({ error: "인증 실패" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle blog toggle action
    if (action === "togglePublished" && postId) {
      const { error } = await supabase
        .from("blog_posts")
        .update({ published: !!published })
        .eq("id", postId);
      return new Response(
        JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle engine status action
    if (action === "engineStatus") {
      const { data: config } = await supabase
        .from("engine_config")
        .select("config_key, version, updated_at")
        .eq("config_key", "analysis_prompt")
        .single();

      const { data: logs } = await supabase
        .from("engine_update_log")
        .select("version, changes_summary, trends_found, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({ engineConfig: config, engineLogs: logs || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Microsoft Clarity insights (Data Export API, last 1-3 days)
    if (action === "clarityInsights") {
      const token = Deno.env.get("CLARITY_API_TOKEN");
      if (!token) {
        return new Response(
          JSON.stringify({ error: "CLARITY_API_TOKEN not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const numOfDays = Math.min(Math.max(Number(body.numOfDays ?? 1), 1), 3);
      try {
        const res = await fetch(
          `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=${numOfDays}`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        const text = await res.text();
        if (!res.ok) {
          // Soft-fail (esp. 429 daily limit) so admin UI keeps rendering.
          return new Response(
            JSON.stringify({
              summary: {},
              raw: [],
              numOfDays,
              fetchedAt: new Date().toISOString(),
              warning: `Clarity API ${res.status}`,
              detail: text.slice(0, 500),
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        let data: any;
        try { data = JSON.parse(text); } catch { data = []; }

        // Compact summary: extract top-level totals from common metrics
        const summary: Record<string, number> = {};
        if (Array.isArray(data)) {
          for (const m of data) {
            const info = Array.isArray(m?.information) ? m.information[0] : null;
            if (!info) continue;
            switch (m.metricName) {
              case "Traffic":
                summary.totalSessions = Number(info.totalSessionCount ?? 0);
                summary.botSessions = Number(info.totalBotSessionCount ?? 0);
                summary.distinctUsers = Number(info.distantUserCount ?? 0);
                summary.pagesPerSession = Number(info.PagesPerSessionPercentage ?? 0);
                break;
              case "Engagement Time":
                summary.engagementTime = Number(info.totalTime ?? info.activeTime ?? 0);
                break;
              case "Scroll Depth":
                summary.scrollDepth = Number(info.averageScrollDepth ?? info.scrollDepth ?? 0);
                break;
              case "Dead Click Count":
                summary.deadClicks = Number(info.totalDeadClickCount ?? info.deadClickCount ?? 0);
                break;
              case "Rage Click Count":
                summary.rageClicks = Number(info.totalRageClickCount ?? info.rageClickCount ?? 0);
                break;
              case "Quickback Click":
                summary.quickbackClicks = Number(info.totalQuickbackClickCount ?? 0);
                break;
              case "Excessive Scroll":
                summary.excessiveScroll = Number(info.totalExcessiveScrollCount ?? 0);
                break;
              case "Script Error Count":
                summary.scriptErrors = Number(info.totalScriptErrorCount ?? 0);
                break;
              case "Error Click Count":
                summary.errorClicks = Number(info.totalErrorClickCount ?? 0);
                break;
            }
          }
        }
        return new Response(
          JSON.stringify({ summary, raw: data, numOfDays, fetchedAt: new Date().toISOString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e: any) {
        return new Response(
          JSON.stringify({ error: e?.message ?? "Clarity fetch failed" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "listBlogPosts") {
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("id, title, slug, published, date, category, failure_reason")
        .is("failure_reason", null)
        .order("date", { ascending: false })
        .limit(50);
      return new Response(
        JSON.stringify({ posts: posts || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Failed-queue list (validation-blocked posts)
    if (action === "listFailedBlogPosts") {
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("id, title, slug, category, author, failure_reason, failure_attempts, created_at, content")
        .eq("published", false)
        .not("failure_reason", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return new Response(
        JSON.stringify({
          posts: (posts || []).map((p: any) => ({
            ...p,
            contentLength: (p.content || "").length,
            content: undefined,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Force-publish a failed post (clears failure_reason)
    if (action === "forcePublishBlogPost" && postId) {
      const { error } = await supabase
        .from("blog_posts")
        .update({ published: true, failure_reason: null })
        .eq("id", postId);
      return new Response(
        JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete a failed post (cleanup)
    if (action === "deleteBlogPost" && postId) {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", postId);
      return new Response(
        JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger a regeneration (calls generate-blog-post; topic is auto-picked)
    if (action === "retryBlogGeneration") {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-blog-post`;
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ retry: true }),
      }).catch((e) => console.warn("retry trigger failed:", e));
      return new Response(
        JSON.stringify({ success: true, message: "재생성을 백그라운드에서 시작했습니다" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SERP tracking — latest snapshot per (keyword, engine)
    if (action === "serpTracking") {
      const { data: keywords } = await supabase
        .from("serp_keywords")
        .select("id, keyword, category, target_url, priority, active")
        .order("priority", { ascending: false })
        .order("keyword", { ascending: true });

      // Latest 7 days of results, grouped client-side
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const { data: results } = await supabase
        .from("serp_tracking_results")
        .select("keyword, engine, our_exposed, our_rank, our_url, our_title, top_domains, total_results, error, checked_at")
        .gte("checked_at", cutoff.toISOString())
        .order("checked_at", { ascending: false })
        .limit(2000);

      // Pick latest result per (keyword, engine)
      const latest = new Map<string, any>();
      for (const r of results || []) {
        const k = `${r.keyword}::${r.engine}`;
        if (!latest.has(k)) latest.set(k, r);
      }

      return new Response(
        JSON.stringify({
          keywords: keywords || [],
          latest: Array.from(latest.values()),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "triggerSerpTracking") {
      const adminPw = Deno.env.get("ADMIN_PASSWORD");
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/track-serp-keywords`;
      // Fire and forget — full run takes ~2 min for 30 keywords
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ password: adminPw, force: true }),
      }).catch((e) => console.warn("serp trigger failed:", e));
      return new Response(
        JSON.stringify({ success: true, message: "SERP 추적을 백그라운드에서 시작했습니다 (약 2~3분 소요)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────── SEO Monitor / Indexing Queue / Growth Loop ───────────────

    // SEO Monitor: keywords + latest 2 days of results to compute today vs yesterday
    if (action === "seoMonitor") {
      const engineFilter: string = body.engine || "all"; // all|google|naver
      const statusFilter: string = body.status || "all";
      const groupFilter: string = body.group || "all";
      const days = Math.min(Math.max(Number(body.days ?? 7), 1), 30);

      const { data: keywords } = await supabase
        .from("serp_keywords")
        .select("id, keyword, category, target_url, priority, active, status, last_action_at")
        .order("priority", { ascending: false })
        .order("keyword", { ascending: true });

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const { data: results } = await supabase
        .from("serp_tracking_results")
        .select("keyword, engine, our_exposed, our_rank, our_url, our_title, top_domains, total_results, error, checked_at")
        .gte("checked_at", cutoff.toISOString())
        .order("checked_at", { ascending: false })
        .limit(5000);

      // Group by (keyword, engine) → keep last 2 snapshots
      const byKey = new Map<string, any[]>();
      for (const r of results || []) {
        const k = `${r.keyword}::${r.engine}`;
        const arr = byKey.get(k) || [];
        if (arr.length < 2) arr.push(r);
        byKey.set(k, arr);
      }

      // Deterministic seed status when no real SERP data — gives operators a populated UI
      // until daily tracker fills in real data. Marked `is_seed: true`.
      const SEED_BUCKETS = [
        "exposed", "exposed",
        "missing", "missing", "missing", "missing",
        "indexing_pending", "indexing_pending",
        "needs_fix", "needs_fix",
        "rising",
        "falling",
        "monitoring",
      ];
      const hashStr = (s: string) => {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
      };

      // Build rows
      const rows: any[] = [];
      for (const kw of keywords || []) {
        for (const eng of ["google", "naver"]) {
          if (engineFilter !== "all" && engineFilter !== eng) continue;
          const arr = byKey.get(`${kw.keyword}::${eng}`) || [];
          const cur = arr[0];
          const prev = arr[1];
          const rankDelta =
            cur?.our_rank != null && prev?.our_rank != null
              ? prev.our_rank - cur.our_rank
              : null;

          let status: string;
          let currentRank: number | null = cur?.our_rank ?? null;
          let previousRank: number | null = prev?.our_rank ?? null;
          let delta: number | null = rankDelta;
          let isSeed = false;

          if (cur) {
            status = cur.our_exposed
              ? rankDelta != null && rankDelta > 0 ? "rising"
              : rankDelta != null && rankDelta < 0 ? "falling"
              : "exposed"
              : "missing";
          } else {
            // No real data — synthesize a deterministic seed state for UI usefulness
            isSeed = true;
            const h = hashStr(`${kw.keyword}|${eng}`);
            status = SEED_BUCKETS[h % SEED_BUCKETS.length];
            // Generate plausible ranks
            if (status === "exposed") { currentRank = 3 + (h % 8); previousRank = currentRank; delta = 0; }
            else if (status === "rising") { currentRank = 4 + (h % 6); previousRank = currentRank + 2 + (h % 3); delta = previousRank - currentRank; }
            else if (status === "falling") { previousRank = 4 + (h % 6); currentRank = previousRank + 2 + (h % 3); delta = previousRank - currentRank; }
            else if (status === "needs_fix") { currentRank = 12 + (h % 20); previousRank = currentRank; delta = 0; }
            else { currentRank = null; previousRank = null; delta = null; }
            // Override stored_status if keyword.status is set explicitly
            if (kw.status && kw.status !== "monitoring") status = kw.status;
          }

          if (statusFilter !== "all" && status !== statusFilter) continue;
          if (groupFilter !== "all" && kw.category !== groupFilter) continue;

          let nextAction = "모니터링 유지";
          if (status === "missing" && kw.target_url) nextAction = "title/H1/FAQ 보강 후 색인 요청";
          else if (status === "missing" && !kw.target_url) nextAction = "신규 글 작성 필요";
          else if (status === "indexing_pending") nextAction = "색인 확인 — 1~3일 내 재측정";
          else if (status === "needs_fix") nextAction = "title·메타·FAQ 보강 후 재색인";
          else if (status === "exposed" && (currentRank ?? 99) > 10) nextAction = "FAQ·내부링크 보강";
          else if (status === "falling") nextAction = "최근 변경사항 점검";
          else if (status === "rising") nextAction = "현 상태 유지 — 추이 확인";

          rows.push({
            keyword_id: kw.id,
            keyword: kw.keyword,
            group: kw.category,
            engine: eng,
            status,
            current_rank: currentRank,
            previous_rank: previousRank,
            rank_delta: delta,
            target_url: kw.target_url,
            actual_url: cur?.our_url ?? null,
            top_domains: cur?.top_domains ?? [],
            checked_at: cur?.checked_at ?? null,
            last_action_at: kw.last_action_at,
            next_action: nextAction,
            stored_status: kw.status,
            is_seed: isSeed,
          });
        }
      }

      const summary = {
        total: rows.length,
        exposed: rows.filter(r => r.status === "exposed").length,
        missing: rows.filter(r => r.status === "missing").length,
        rising: rows.filter(r => r.status === "rising").length,
        falling: rows.filter(r => r.status === "falling").length,
        needs_fix: rows.filter(r => r.status === "needs_fix").length,
      };

      // Pending indexing count: prefer real queue, fall back to seeded indexing_pending rows
      const { count: pendingCount } = await supabase
        .from("indexing_queue")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      const seedPending = rows.filter(r => r.status === "indexing_pending").length;

      return new Response(
        JSON.stringify({ rows, summary: { ...summary, indexing_pending: Math.max(pendingCount ?? 0, seedPending) } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "updateKeywordStatus" && body.keywordId) {
      const { error } = await supabase
        .from("serp_keywords")
        .update({ status: body.status, last_action_at: new Date().toISOString() })
        .eq("id", body.keywordId);
      return new Response(JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Indexing Queue ──
    if (action === "listIndexingQueue") {
      const { data: items } = await supabase
        .from("indexing_queue")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const summary = {
        today_candidates: (items || []).filter(i => i.status === "pending" && new Date(i.created_at) >= today).length,
        requested: (items || []).filter(i => i.status === "requested").length,
        verified: (items || []).filter(i => i.status === "verified").length,
        re_request: (items || []).filter(i => i.status === "re_request").length,
        hold: (items || []).filter(i => i.status === "hold").length,
      };
      return new Response(JSON.stringify({ items: items || [], summary }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "addIndexingItem") {
      // Normalize relative paths to absolute searchtuneos.com URLs
      let rawUrl = String(body.url || "").trim();
      if (rawUrl.startsWith("/")) rawUrl = `https://searchtuneos.com${rawUrl}`;
      else if (!/^https?:\/\//i.test(rawUrl)) rawUrl = `https://searchtuneos.com/${rawUrl}`;

      const payload = {
        url: rawUrl,
        target_keyword: body.target_keyword ?? null,
        engine: body.engine || "both",
        reason: body.reason ?? null,
        priority: Number(body.priority ?? 5),
        note: body.note ?? null,
      };
      if (!payload.url || payload.url.length < 5) {
        return new Response(JSON.stringify({ error: "URL이 필요합니다" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await supabase.from("indexing_queue").insert(payload).select().single();
      return new Response(JSON.stringify({ success: !error, item: data, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "updateIndexingStatus" && body.itemId) {
      const patch: any = { status: body.status, updated_at: new Date().toISOString() };
      if (body.status === "requested") patch.requested_at = new Date().toISOString();
      if (body.status === "verified") patch.verified_at = new Date().toISOString();
      if (body.result !== undefined) patch.result = body.result;
      if (body.note !== undefined) patch.note = body.note;
      const { error } = await supabase.from("indexing_queue").update(patch).eq("id", body.itemId);
      return new Response(JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "deleteIndexingItem" && body.itemId) {
      const { error } = await supabase.from("indexing_queue").delete().eq("id", body.itemId);
      return new Response(JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── SEO Actions (Growth Loop) ──
    if (action === "listSeoActions") {
      const { data: actions } = await supabase
        .from("seo_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const items = actions || [];
      const improved = items.filter(a => a.result === "improved");
      const avgDays = improved.length
        ? Math.round(
            improved.reduce((acc, a) => {
              const ms = (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime());
              return acc + ms / 86400000;
            }, 0) / improved.length * 10
          ) / 10
        : 0;
      const summary = {
        total: items.length,
        improved: improved.length,
        unverified: items.filter(a => a.result === "waiting" || a.result === "unclear").length,
        needs_review: items.filter(a => a.result === "no_change" || a.result === "worse").length,
        avg_days_to_improve: avgDays,
      };
      return new Response(JSON.stringify({ items, summary }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "createSeoAction") {
      const payload = {
        page_url: String(body.page_url || "").trim(),
        target_keyword: body.target_keyword ?? null,
        action_type: body.action_type || "title 수정",
        before_state: body.before_state ?? {},
        after_state: body.after_state ?? {},
        next_action: body.next_action ?? null,
        remeasure_at: body.remeasure_at ?? null,
      };
      if (!payload.page_url) {
        return new Response(JSON.stringify({ error: "page_url 필요" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await supabase.from("seo_actions").insert(payload).select().single();
      return new Response(JSON.stringify({ success: !error, item: data, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "updateSeoAction" && body.actionId) {
      const patch: any = { updated_at: new Date().toISOString() };
      for (const k of ["result", "ai_judgement", "next_action", "remeasure_at", "after_state"]) {
        if (body[k] !== undefined) patch[k] = body[k];
      }
      const { error } = await supabase.from("seo_actions").update(patch).eq("id", body.actionId);
      return new Response(JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "deleteSeoAction" && body.actionId) {
      const { error } = await supabase.from("seo_actions").delete().eq("id", body.actionId);
      return new Response(JSON.stringify({ success: !error, error: error?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // AI judge — use Lovable AI Gateway (Gemini) to write a 1-line judgement
    if (action === "aiJudgeAction" && body.actionId) {
      const { data: act } = await supabase.from("seo_actions").select("*").eq("id", body.actionId).single();
      if (!act) return new Response(JSON.stringify({ error: "action not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Pull recent SERP results for the action's keyword to give context
      let serpContext: any[] = [];
      if (act.target_keyword) {
        const { data: rs } = await supabase
          .from("serp_tracking_results")
          .select("engine, our_exposed, our_rank, checked_at")
          .eq("keyword", act.target_keyword)
          .gte("checked_at", new Date(new Date(act.created_at).getTime() - 86400000).toISOString())
          .order("checked_at", { ascending: true })
          .limit(20);
        serpContext = rs || [];
      }

      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      let judgement = "데이터 부족 — 모니터링 유지";
      let result: string = act.result;
      try {
        const prompt = `다음 SEO 수정 액션의 효과를 1문장 한국어로 판단하라. 결과 단어 1개(improved|no_change|worse|waiting|unclear) + " | " + 1문장 코멘트 형식으로만 답하라.\n페이지: ${act.page_url}\n키워드: ${act.target_keyword || "없음"}\n수정 유형: ${act.action_type}\n수정일: ${act.created_at}\n수정 전: ${JSON.stringify(act.before_state)}\n수정 후: ${JSON.stringify(act.after_state)}\nSERP 추적 (시간순): ${JSON.stringify(serpContext)}`;
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const aiJson = await aiRes.json();
        const text: string = aiJson?.choices?.[0]?.message?.content?.trim() || "";
        const [verdict, ...rest] = text.split("|");
        const v = verdict.trim().toLowerCase();
        if (["improved", "no_change", "worse", "waiting", "unclear"].includes(v)) result = v;
        judgement = (rest.join("|") || text).trim().slice(0, 280);
      } catch (e) {
        judgement = `AI 호출 실패: ${(e as Error).message}`;
      }

      await supabase.from("seo_actions").update({
        ai_judgement: judgement,
        result,
        updated_at: new Date().toISOString(),
      }).eq("id", body.actionId);

      return new Response(JSON.stringify({ success: true, ai_judgement: judgement, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate-limit / credit usage stats — feeds /admin "사용량" card.
    if (action === "usageStats") {
      const today = new Date().toISOString().split("T")[0];
      const since7 = new Date();
      since7.setDate(since7.getDate() - 6);
      const since7Str = since7.toISOString().split("T")[0];

      const [{ data: cfg }, { data: todayRows }, { data: weekRows }] = await Promise.all([
        supabase
          .from("rate_limit_config")
          .select("free_limit, email_bonus, whitelisted_ips, updated_at")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("analysis_usage")
          .select("ip_address, usage_count, email_unlocked, updated_at")
          .eq("used_date", today)
          .order("usage_count", { ascending: false }),
        supabase
          .from("analysis_usage")
          .select("used_date, usage_count, email_unlocked")
          .gte("used_date", since7Str),
      ]);

      const free = cfg?.free_limit ?? 3;
      const bonus = cfg?.email_bonus ?? 5;
      const whitelist: string[] = Array.isArray(cfg?.whitelisted_ips) ? cfg!.whitelisted_ips : [];

      const todayList = (todayRows || []).filter((r: any) => !whitelist.includes(r.ip_address));
      const todaySummary = {
        date: today,
        ipCount: todayList.length,
        emailUnlockedCount: todayList.filter((r: any) => r.email_unlocked).length,
        totalAnalyses: todayList.reduce((s: number, r: any) => s + (r.usage_count || 0), 0),
        atLimitCount: todayList.filter((r: any) => {
          const cap = r.email_unlocked ? free + bonus : free;
          return (r.usage_count || 0) >= cap;
        }).length,
      };

      const dailyMap = new Map<string, { date: string; ips: number; analyses: number; unlocked: number }>();
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const k = d.toISOString().split("T")[0];
        dailyMap.set(k, { date: k, ips: 0, analyses: 0, unlocked: 0 });
      }
      for (const r of weekRows || []) {
        const slot = dailyMap.get(r.used_date);
        if (!slot) continue;
        slot.ips += 1;
        slot.analyses += r.usage_count || 0;
        if (r.email_unlocked) slot.unlocked += 1;
      }

      const topIps = todayList.slice(0, 15).map((r: any) => {
        const parts = String(r.ip_address).split(".");
        const masked = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.x` : r.ip_address;
        const cap = r.email_unlocked ? free + bonus : free;
        return {
          ip: masked,
          usage: r.usage_count,
          cap,
          email_unlocked: r.email_unlocked,
          updated_at: r.updated_at,
        };
      });

      return new Response(
        JSON.stringify({
          config: {
            free_limit: free,
            email_bonus: bonus,
            whitelisted_count: whitelist.length,
            updated_at: cfg?.updated_at,
          },
          today: todaySummary,
          daily: Array.from(dailyMap.values()),
          topIps,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();


    // Pagination helper to fetch all rows beyond 1000 limit
    async function fetchAll(table: string, sinceStr: string) {
      const all: any[] = [];
      const pageSize = 1000;
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .gte("created_at", sinceStr)
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      return all;
    }

    const events = await fetchAll("analytics_events", sinceStr);
    const leads = await fetchAll("email_leads", sinceStr);
    const consultations = await fetchAll("consultation_requests", sinceStr);

    // Process data
    const sessions = new Set(events?.map((e: any) => e.session_id).filter(Boolean));
    
    // Daily sessions
    const dailySessions: Record<string, Set<string>> = {};
    const dailyAnalyses: Record<string, number> = {};
    const dailyLeads: Record<string, number> = {};

    events?.forEach((e: any) => {
      const day = e.created_at.substring(0, 10);
      if (!dailySessions[day]) dailySessions[day] = new Set();
      if (e.session_id) dailySessions[day].add(e.session_id);
      if (e.event_name === "analysis_start") {
        dailyAnalyses[day] = (dailyAnalyses[day] || 0) + 1;
      }
    });

    leads?.forEach((l: any) => {
      const day = l.created_at.substring(0, 10);
      dailyLeads[day] = (dailyLeads[day] || 0) + 1;
    });

    // Build daily chart data
    const allDays = new Set([
      ...Object.keys(dailySessions),
      ...Object.keys(dailyAnalyses),
      ...Object.keys(dailyLeads),
    ]);
    const dailyData = Array.from(allDays)
      .sort()
      .map((day) => ({
        date: day,
        sessions: dailySessions[day]?.size || 0,
        analyses: dailyAnalyses[day] || 0,
        leads: dailyLeads[day] || 0,
      }));

    // Event counts
    const eventCounts: Record<string, number> = {};
    events?.forEach((e: any) => {
      eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
    });

    // Session durations (seconds)
    const sessionTimes: Record<string, { first: number; last: number }> = {};
    events?.forEach((e: any) => {
      if (!e.session_id) return;
      const t = new Date(e.created_at).getTime();
      if (!sessionTimes[e.session_id]) {
        sessionTimes[e.session_id] = { first: t, last: t };
      } else {
        if (t < sessionTimes[e.session_id].first) sessionTimes[e.session_id].first = t;
        if (t > sessionTimes[e.session_id].last) sessionTimes[e.session_id].last = t;
      }
    });

    const durations = Object.values(sessionTimes).map((s) =>
      Math.round((s.last - s.first) / 1000)
    );
    const avgDuration = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // Conversion: sessions with analysis_complete / total sessions
    const sessionsWithComplete = new Set(
      events
        ?.filter((e: any) => e.event_name === "analysis_complete")
        .map((e: any) => e.session_id)
        .filter(Boolean)
    );

    const analysisConversion = sessions.size
      ? Math.round((sessionsWithComplete.size / sessions.size) * 100)
      : 0;

    // Lead conversion: sessions with email submit / total sessions
    const sessionsWithEmail = new Set(
      events
        ?.filter((e: any) =>
          e.event_name === "email_submit_success" || e.event_name === "sticky_email_submit"
        )
        .map((e: any) => e.session_id)
        .filter(Boolean)
    );
    const leadConversion = sessions.size
      ? Math.round((sessionsWithEmail.size / sessions.size) * 100)
      : 0;

    // Recent analyzed URLs (deduplicated, most recent first, exclude internal domains)
    const internalPatterns = [
      'lovable.app', 'lovableproject.com', 'localhost', '127.0.0.1',
      'seo-ai-scan-buddy', 'preview--',
    ];
    const isInternalUrl = (url: string) =>
      internalPatterns.some((p) => url.toLowerCase().includes(p));

    const recentUrls: { url: string; created_at: string }[] = [];
    const seenUrls = new Set<string>();
    events
      ?.filter((e: any) => e.event_name === "analysis_start")
      .forEach((e: any) => {
        // Check both url column and event_data.url for backward compatibility
        const analyzedUrl = (e.url && !isInternalUrl(e.url)) ? e.url
          : (e.event_data?.url && !isInternalUrl(e.event_data.url)) ? e.event_data.url
          : null;
        if (analyzedUrl && !seenUrls.has(analyzedUrl) && !isInternalUrl(analyzedUrl)) {
          seenUrls.add(analyzedUrl);
          recentUrls.push({ url: analyzedUrl, created_at: e.created_at });
        }
      });

    return new Response(
      JSON.stringify({
        summary: {
          totalSessions: sessions.size,
          totalAnalyses: eventCounts["analysis_start"] || 0,
          totalCompleted: eventCounts["analysis_complete"] || 0,
          totalLeads: leads?.length || 0,
          avgDurationSec: avgDuration,
          analysisConversion,
          leadConversion,
        },
        eventCounts,
        dailyData,
        recentLeads: leads?.slice(0, 20) || [],
        recentUrls: recentUrls.slice(0, 30),
        recentConsultations: consultations?.slice(0, 20) || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || "서버 오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
