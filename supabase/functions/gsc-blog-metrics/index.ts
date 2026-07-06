// Pulls Google Search Console searchAnalytics data via the Lovable connector gateway.
// Returns per-page metrics for /blog/* and top queries for the last N days.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://searchtuneos.com/";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function fmt(d: Date) { return d.toISOString().slice(0, 10); }

async function gscPost(path: string, body: unknown) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const connKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!apiKey || !connKey) throw new Error("missing_gsc_credentials");
  const res = await fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`gsc_${res.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") || "28", 10)));
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const siteEnc = encodeURIComponent(SITE);

    const [pages, queries, totals] = await Promise.all([
      gscPost(`/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
        startDate: fmt(start), endDate: fmt(end),
        dimensions: ["page"],
        dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }] }],
        rowLimit: 200,
      }),
      gscPost(`/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
        startDate: fmt(start), endDate: fmt(end),
        dimensions: ["query"],
        dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: "/blog/" }] }],
        rowLimit: 50,
      }),
      gscPost(`/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
        startDate: fmt(start), endDate: fmt(end),
        dimensions: [],
        rowLimit: 1,
      }),
    ]);

    type Row = { url: string; clicks: number; impressions: number; ctr: number; position: number; isHtml: boolean; slug: string };
    const pageRows: Row[] = (pages.rows || []).map((r: any) => {
      const u = decodeURIComponent(r.keys?.[0] || "");
      const isHtml = /\.html(\?|#|$)/i.test(u);
      const m = u.match(/\/blog\/([^/?#]+)/);
      const slug = m ? m[1].replace(/\.html$/i, "") : "";
      return {
        url: u, slug, isHtml,
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      };
    });

    // Group by slug to detect canonical mismatch (legacy .html has more impressions than clean URL)
    const bySlug: Record<string, { clean?: Row; legacy?: Row; total: { clicks: number; impressions: number } }> = {};
    for (const r of pageRows) {
      if (!r.slug) continue;
      bySlug[r.slug] = bySlug[r.slug] || { total: { clicks: 0, impressions: 0 } };
      if (r.isHtml) bySlug[r.slug].legacy = r;
      else bySlug[r.slug].clean = r;
      bySlug[r.slug].total.clicks += r.clicks;
      bySlug[r.slug].total.impressions += r.impressions;
    }

    const slugRows = Object.entries(bySlug).map(([slug, v]) => ({
      slug,
      cleanClicks: v.clean?.clicks || 0,
      cleanImpressions: v.clean?.impressions || 0,
      cleanPosition: v.clean?.position || 0,
      legacyClicks: v.legacy?.clicks || 0,
      legacyImpressions: v.legacy?.impressions || 0,
      legacyPosition: v.legacy?.position || 0,
      totalClicks: v.total.clicks,
      totalImpressions: v.total.impressions,
      mismatch: !!v.legacy && v.legacy.impressions > 0 && (!v.clean || v.clean.impressions < v.legacy.impressions),
    })).sort((a, b) => b.totalImpressions - a.totalImpressions);

    const queryRows = (queries.rows || []).map((r: any) => ({
      query: r.keys?.[0] || "",
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    const totalsRow = totals.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

    return new Response(JSON.stringify({
      success: true,
      range: { start: fmt(start), end: fmt(end), days },
      totals: {
        clicks: totalsRow.clicks || 0,
        impressions: totalsRow.impressions || 0,
        ctr: totalsRow.ctr || 0,
        position: totalsRow.position || 0,
      },
      blogPages: slugRows,
      topQueries: queryRows,
      rawPageCount: pageRows.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
