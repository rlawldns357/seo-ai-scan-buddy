// Read-only Ops summary for automated reports (Hermes etc.)
// - Auth: x-ops-token header OR ?token= query param OR { token } body
// - Strictly READ ONLY. No INSERT/UPDATE/DELETE. No writes to seo_actions,
//   indexing_queue, serp_keywords, or any other table.
// - Returns compact summaries only. No emails, no payment data, no secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ops-token",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Hash the IP so we can detect repeat callers without storing raw IPs
async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf)).slice(0, 8)
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Audit-log helper — fire-and-forget; never block the response
  const ipRaw =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const userAgent = (req.headers.get("user-agent") || "").slice(0, 200);
  const ipHash = await hashIp(ipRaw).catch(() => "err");

  const audit = (status: number, reason: string) => {
    const success = status >= 200 && status < 300;
    supabase.from("analytics_events").insert({
      event_name: "ops_readonly_access",
      event_data: {
        success, status, reason,
        ip_hash: ipHash,
        user_agent: userAgent,
        duration_ms: Date.now() - startedAt,
      },
    }).then(({ error }) => {
      if (error) console.warn("ops-readonly audit insert failed:", error.message);
    });
  };

  // ---- Token validation ----------------------------------------------------
  const expected = Deno.env.get("OPS_READONLY_TOKEN");
  if (!expected) {
    audit(503, "token_not_configured");
    return json(503, { error: "OPS_READONLY_TOKEN not configured on server" });
  }

  let provided =
    req.headers.get("x-ops-token") ||
    new URL(req.url).searchParams.get("token") ||
    "";
  if (!provided && (req.method === "POST" || req.method === "PUT")) {
    try {
      const body = await req.clone().json();
      provided = body?.token || "";
    } catch { /* ignore */ }
  }
  if (!provided) {
    audit(401, "missing_token");
    return json(401, { error: "Unauthorized" });
  }
  if (provided !== expected) {
    audit(401, "invalid_token");
    return json(401, { error: "Unauthorized" });
  }

  try {
    // ── SEO Monitor summary ────────────────────────────────────────────────
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const [{ data: keywords }, { data: serpResults }] = await Promise.all([
      supabase
        .from("serp_keywords")
        .select("id, keyword, category, target_url, priority, status, last_action_at"),
      supabase
        .from("serp_tracking_results")
        .select("keyword, engine, our_exposed, our_rank, checked_at, error")
        .gte("checked_at", cutoff.toISOString())
        .order("checked_at", { ascending: false })
        .limit(3000),
    ]);

    // Latest 2 snapshots per (keyword, engine)
    const byKey = new Map<string, any[]>();
    for (const r of serpResults || []) {
      const k = `${r.keyword}::${r.engine}`;
      const arr = byKey.get(k) || [];
      if (arr.length < 2) arr.push(r);
      byKey.set(k, arr);
    }

    const SITE_ORIGIN = (Deno.env.get("OPS_SITE_ORIGIN") || "https://searchtuneos.com").replace(/\/+$/, "");
    const toCanonical = (u?: string | null): string | null => {
      if (!u) return null;
      const s = String(u).trim();
      if (!s) return null;
      if (/^https?:\/\//i.test(s)) return s;
      if (s.startsWith("//")) return `https:${s}`;
      return `${SITE_ORIGIN}${s.startsWith("/") ? "" : "/"}${s}`;
    };

    // Per-keyword (unique) and per-engine (row) counters
    let exposed = 0, missing = 0, rising = 0, falling = 0;             // engine-row level
    let needsFix = 0, indexingPending = 0;                              // keyword level
    let kwExposed = 0, kwMissing = 0, kwPartial = 0, kwUntracked = 0;   // keyword level
    let engineRows = 0;

    for (const kw of keywords || []) {
      if (kw.status === "needs_fix") needsFix++;
      if (kw.status === "indexing_pending") indexingPending++;

      let kwExposedAny = false, kwMissingAny = false, kwTrackedAny = false;
      for (const eng of ["google", "naver"]) {
        const arr = byKey.get(`${kw.keyword}::${eng}`) || [];
        const cur = arr[0], prev = arr[1];
        if (!cur) continue;
        engineRows++;
        kwTrackedAny = true;
        if (cur.our_exposed) {
          kwExposedAny = true;
          const delta = cur.our_rank != null && prev?.our_rank != null
            ? prev.our_rank - cur.our_rank : null;
          if (delta != null && delta > 0) rising++;
          else if (delta != null && delta < 0) falling++;
          else exposed++;
        } else {
          kwMissingAny = true;
          missing++;
        }
      }
      if (!kwTrackedAny) kwUntracked++;
      else if (kwExposedAny && kwMissingAny) kwPartial++;
      else if (kwExposedAny) kwExposed++;
      else kwMissing++;
    }

    const lastSerp = (serpResults || [])[0];
    const lastSerpRun = lastSerp
      ? { checked_at: lastSerp.checked_at, ok: !lastSerp.error }
      : null;

    const seoMonitor = {
      // keyword-level (unique)
      total_keywords: (keywords || []).length,
      exposed_keywords: kwExposed,
      missing_keywords: kwMissing,
      partial_keywords: kwPartial,
      untracked_keywords: kwUntracked,
      needs_fix: needsFix,
      indexing_pending: indexingPending,
      // engine-row level (one per keyword × engine)
      total_engine_results: engineRows,
      exposed_results: exposed,
      missing_results: missing,
      rising_results: rising,
      falling_results: falling,
      last_serp_run: lastSerpRun,
    };

    // ── Indexing Queue summary ─────────────────────────────────────────────
    const { data: queue } = await supabase
      .from("indexing_queue")
      .select("id, url, status, engine, priority, target_keyword, created_at, updated_at, requested_at, verified_at")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    const items = queue || [];
    const counts: Record<string, number> = {
      pending: 0, requested: 0, verified: 0, re_request: 0, hold: 0, failed: 0,
    };
    for (const it of items) {
      counts[it.status] = (counts[it.status] ?? 0) + 1;
    }

    // Stale detection (used for both summary + scoring)
    const now = Date.now();
    const STALE_PENDING_HOURS = 48;
    const STALE_REQUESTED_HOURS = 168; // 7d without verification
    const ageHours = (s?: string | null) =>
      s ? (now - new Date(s).getTime()) / 3.6e6 : Infinity;

    let stalePending = 0, staleRequested = 0;
    for (const it of items) {
      if ((it.status === "pending" || it.status === "re_request") &&
          ageHours(it.created_at) > STALE_PENDING_HOURS) stalePending++;
      if (it.status === "requested" &&
          ageHours(it.requested_at || it.updated_at) > STALE_REQUESTED_HOURS) staleRequested++;
    }

    const indexingQueue = {
      total: items.length,
      counts,
      stale_pending: stalePending,
      stale_requested: staleRequested,
      recent: items.slice(0, 10).map((i) => ({
        url_path: i.url,
        canonical_url: toCanonical(i.url),
        status: i.status,
        engine: i.engine,
        priority: i.priority,
        target_keyword: i.target_keyword,
        created_at: i.created_at,
        updated_at: i.updated_at,
        requested_at: i.requested_at,
      })),
    };

    // ── AI Growth Loop summary ─────────────────────────────────────────────
    const { data: actions } = await supabase
      .from("seo_actions")
      .select("id, page_url, target_keyword, action_type, result, ai_judgement, next_action, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const aitems = actions || [];
    const aiGrowthLoop = {
      total: aitems.length,
      counts: {
        improved: aitems.filter(a => a.result === "improved").length,
        waiting: aitems.filter(a => a.result === "waiting").length,
        unclear: aitems.filter(a => a.result === "unclear").length,
        no_change: aitems.filter(a => a.result === "no_change").length,
        worse: aitems.filter(a => a.result === "worse").length,
      },
      recent: aitems.slice(0, 10).map(a => ({
        page_url: a.page_url,
        target_keyword: a.target_keyword,
        action_type: a.action_type,
        result: a.result,
        ai_judgement: a.ai_judgement,
        next_action: a.next_action,
        created_at: a.created_at,
        updated_at: a.updated_at,
      })),
    };

    // ── Today's Tasks (max 5, prioritized) ────────────────────────────────
    type Task = {
      type: "naver_submit" | "google_check" | "content_fix" | "monitor" | "deploy_issue";
      priority: "high" | "medium" | "low";
      title: string;
      url?: string;
      reason: string;
      recommended_action: string;
    };
    const tasks: Task[] = [];

    // 1) deploy_issue — recent SERP run errored or no run in >24h
    const lastRunAt = lastSerp?.checked_at ? new Date(lastSerp.checked_at).getTime() : 0;
    const hoursSinceSerp = lastRunAt ? (Date.now() - lastRunAt) / 3.6e6 : Infinity;
    if (!lastSerp) {
      tasks.push({
        type: "deploy_issue", priority: "high",
        title: "SERP 추적 기록 없음",
        reason: "최근 7일 내 SERP 추적 결과가 없습니다.",
        recommended_action: "track-serp Edge Function이 정상 동작하는지 점검하고 수동 트리거하세요.",
      });
    } else if (lastSerp.error || hoursSinceSerp > 36) {
      tasks.push({
        type: "deploy_issue", priority: "high",
        title: lastSerp.error ? "최근 SERP 추적 실패" : "SERP 추적 지연",
        reason: lastSerp.error
          ? `마지막 추적 오류: ${String(lastSerp.error).slice(0, 120)}`
          : `마지막 추적이 ${Math.round(hoursSinceSerp)}시간 전입니다.`,
        recommended_action: "track-serp 로그를 확인하고 재실행하세요.",
      });
    }

    // 2) naver_submit / google_check — pending/re_request items in indexing queue
    const pendingForSubmit = items
      .filter(i => i.status === "pending" || i.status === "re_request")
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    for (const it of pendingForSubmit.slice(0, 2)) {
      const isNaver = it.engine === "naver" || it.engine === "both";
      tasks.push({
        type: isNaver ? "naver_submit" : "google_check",
        priority: (it.priority ?? 5) >= 7 ? "high" : "medium",
        title: isNaver ? "네이버 색인 요청 필요" : "구글 색인 확인 필요",
        url: it.url,
        reason: `상태: ${it.status}${it.target_keyword ? ` · 키워드: ${it.target_keyword}` : ""}`,
        recommended_action: isNaver
          ? "네이버 서치어드바이저에서 URL을 제출하세요."
          : "Google Search Console에서 URL 검사 → 색인 요청을 실행하세요.",
      });
    }

    // 3) content_fix — keywords flagged as needs_fix
    const fixKeywords = (keywords || []).filter(k => k.status === "needs_fix").slice(0, 2);
    for (const kw of fixKeywords) {
      tasks.push({
        type: "content_fix", priority: "high",
        title: `콘텐츠 수정: "${kw.keyword}"`,
        url: kw.target_url || undefined,
        reason: "키워드 상태가 needs_fix로 표시되어 있습니다.",
        recommended_action: "타깃 페이지의 H1/메타/본문 키워드 매칭을 보강하세요.",
      });
    }

    // 4) monitor — falling rank or many missing
    if (falling > 0 && tasks.length < 5) {
      tasks.push({
        type: "monitor", priority: "medium",
        title: `순위 하락 키워드 ${falling}개`,
        reason: "최근 SERP 스냅샷에서 순위가 하락한 키워드가 감지되었습니다.",
        recommended_action: "/admin/seo-monitor에서 하락 키워드를 점검하세요.",
      });
    }
    if (missing >= 3 && tasks.length < 5) {
      tasks.push({
        type: "monitor", priority: "medium",
        title: `미노출 키워드 ${missing}개`,
        reason: "다수의 키워드가 SERP에 노출되지 않고 있습니다.",
        recommended_action: "노출 누락 키워드의 콘텐츠/색인 상태를 확인하세요.",
      });
    }

    const todayTasks = tasks.slice(0, 5);

    // ── Ops Score ─────────────────────────────────────────────────────────
    const risks: string[] = [];

    // seoMonitor score: penalize missing/needs_fix/falling vs total checks
    const totalChecks = exposed + missing + rising + falling;
    let seoMonitorScore = 100;
    if (totalChecks > 0) {
      const missRatio = missing / totalChecks;
      const fallRatio = falling / totalChecks;
      seoMonitorScore -= Math.round(missRatio * 50 + fallRatio * 25);
    }
    seoMonitorScore -= Math.min(20, needsFix * 5);
    seoMonitorScore = Math.max(0, Math.min(100, seoMonitorScore));
    if (missing >= 3) risks.push(`미노출 키워드 ${missing}개`);
    if (needsFix > 0) risks.push(`수정 필요 키워드 ${needsFix}개`);
    if (falling > 0) risks.push(`순위 하락 ${falling}개`);

    // indexingQueue score: penalize pending + re_request load
    const pendingTotal = (counts.pending ?? 0) + (counts.re_request ?? 0);
    let indexingQueueScore = 100 - Math.min(60, pendingTotal * 6) - Math.min(20, (counts.failed ?? 0) * 10);
    indexingQueueScore = Math.max(0, Math.min(100, indexingQueueScore));
    if (pendingTotal >= 5) risks.push(`색인 대기/재요청 ${pendingTotal}건`);
    if ((counts.failed ?? 0) > 0) risks.push(`색인 실패 ${counts.failed}건`);

    // aiGrowthLoop score: penalize stale activity
    const lastActionAt = aitems[0]?.updated_at || aitems[0]?.created_at;
    const hoursSinceAction = lastActionAt ? (Date.now() - new Date(lastActionAt).getTime()) / 3.6e6 : Infinity;
    let aiGrowthLoopScore = 100;
    if (!lastActionAt) { aiGrowthLoopScore = 30; risks.push("최근 AI 액션 기록 없음"); }
    else if (hoursSinceAction > 72) { aiGrowthLoopScore = 50; risks.push(`마지막 액션 ${Math.round(hoursSinceAction)}시간 전`); }
    else if (hoursSinceAction > 36) { aiGrowthLoopScore = 75; }
    aiGrowthLoopScore -= Math.min(20, (aiGrowthLoop.counts.worse ?? 0) * 5);
    aiGrowthLoopScore = Math.max(0, Math.min(100, aiGrowthLoopScore));

    // overall: weighted avg, additionally penalize stale SERP
    let overall = Math.round(seoMonitorScore * 0.4 + indexingQueueScore * 0.3 + aiGrowthLoopScore * 0.3);
    if (hoursSinceSerp > 24) {
      overall -= Math.min(20, Math.floor((hoursSinceSerp - 24) / 12) * 5);
      if (hoursSinceSerp > 36) risks.push(`SERP 추적 지연 (${Math.round(hoursSinceSerp)}h)`);
    }
    overall = Math.max(0, Math.min(100, overall));

    const opsScore = {
      overall,
      seoMonitor: seoMonitorScore,
      indexingQueue: indexingQueueScore,
      aiGrowthLoop: aiGrowthLoopScore,
      risks,
    };

    audit(200, "ok");
    return json(200, {
      generated_at: new Date().toISOString(),
      mode: "read-only",
      opsScore,
      todayTasks,
      seoMonitor,
      indexingQueue,
      aiGrowthLoop,
    });
  } catch (e) {
    audit(500, "server_error");
    return json(500, { error: (e as Error)?.message || "server error" });
  }
});

