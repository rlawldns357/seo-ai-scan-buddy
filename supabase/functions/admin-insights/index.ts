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
    const { password, days = 30 } = await req.json();
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
      ?.filter((e: any) => e.event_name === "analysis_start" && e.url && !isInternalUrl(e.url))
      .forEach((e: any) => {
        if (!seenUrls.has(e.url)) {
          seenUrls.add(e.url);
          recentUrls.push({ url: e.url, created_at: e.created_at });
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
