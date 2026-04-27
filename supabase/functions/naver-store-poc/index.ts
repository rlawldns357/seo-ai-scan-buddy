/**
 * Naver Store PoC — measures EXTERNAL exposure of a Naver smartstore/brand
 * store using Naver's official Search APIs (free, legal, no scraping).
 *
 * This function exists to validate the hypothesis:
 *   "We can build a meaningful, differentiated 'Naver Store Diagnostic'
 *    using only Naver's public Search APIs — without Bright Data scraping."
 *
 * DELETE this function once the diagnostic feature ships.
 *
 * Input:  POST { url: "https://brand.naver.com/mujikorea" | "https://smartstore.naver.com/modern_m" }
 * Output: a diagnostic JSON the team can eyeball to decide if data is rich enough.
 */
import { corsHeaders } from "@supabase/supabase-js/cors";

const NAVER_CLIENT_ID = Deno.env.get("NAVER_CLIENT_ID");
const NAVER_CLIENT_SECRET = Deno.env.get("NAVER_CLIENT_SECRET");

type StoreInfo = {
  type: "brand" | "smartstore" | "unknown";
  slug: string;
  url: string;
};

function parseStoreUrl(raw: string): StoreInfo {
  try {
    const u = new URL(raw);
    if (u.hostname === "brand.naver.com") {
      const slug = u.pathname.split("/").filter(Boolean)[0] ?? "";
      return { type: "brand", slug, url: raw };
    }
    if (u.hostname === "smartstore.naver.com") {
      const slug = u.pathname.split("/").filter(Boolean)[0] ?? "";
      return { type: "smartstore", slug, url: raw };
    }
    return { type: "unknown", slug: "", url: raw };
  } catch {
    return { type: "unknown", slug: "", url: raw };
  }
}

async function naverSearch(
  type: "shop" | "blog" | "cafearticle" | "kin" | "webkr",
  query: string,
  display = 10,
) {
  const url = `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=${display}`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID!,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET!,
    },
  });
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return new Response(
      JSON.stringify({ error: "NAVER_CLIENT_ID/SECRET not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let input: { url?: string } = {};
  try {
    input = await req.json();
  } catch {
    /* empty body OK if query param used */
  }
  const targetUrl =
    input.url ??
    new URL(req.url).searchParams.get("url") ??
    "";

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "url required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const store = parseStoreUrl(targetUrl);
  if (store.type === "unknown" || !store.slug) {
    return new Response(
      JSON.stringify({ error: "Not a Naver store URL", parsed: store }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // The slug itself is usually the brand name. We probe across surfaces to see
  // how the brand is mentioned OUTSIDE the store page (where SEO/AEO/GEO
  // signals actually accrue).
  const query = store.slug;

  const [shop, blog, cafe, kin, webkr] = await Promise.all([
    naverSearch("shop", query, 10),
    naverSearch("blog", query, 10),
    naverSearch("cafearticle", query, 10),
    naverSearch("kin", query, 10),
    naverSearch("webkr", query, 10),
  ]);

  // Compact summary the team can read at a glance.
  const summary = {
    input: targetUrl,
    parsed: store,
    query_used: query,
    surfaces: {
      shop: {
        total: shop.body?.total ?? null,
        sample_titles: (shop.body?.items ?? [])
          .slice(0, 5)
          .map((i: any) => stripTags(i.title)),
        sample_links: (shop.body?.items ?? [])
          .slice(0, 5)
          .map((i: any) => i.link),
      },
      blog: {
        total: blog.body?.total ?? null,
        sample_titles: (blog.body?.items ?? [])
          .slice(0, 5)
          .map((i: any) => stripTags(i.title)),
      },
      cafe: {
        total: cafe.body?.total ?? null,
        sample_titles: (cafe.body?.items ?? [])
          .slice(0, 3)
          .map((i: any) => stripTags(i.title)),
      },
      kin: {
        total: kin.body?.total ?? null,
        sample_titles: (kin.body?.items ?? [])
          .slice(0, 3)
          .map((i: any) => stripTags(i.title)),
      },
      webkr: {
        total: webkr.body?.total ?? null,
        sample_titles: (webkr.body?.items ?? [])
          .slice(0, 3)
          .map((i: any) => stripTags(i.title)),
      },
    },
    raw_status: {
      shop: shop.status,
      blog: blog.status,
      cafe: cafe.status,
      kin: kin.status,
      webkr: webkr.status,
    },
  };

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function stripTags(s: string): string {
  return (s ?? "").replace(/<[^>]*>/g, "");
}
