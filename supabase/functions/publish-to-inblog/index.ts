// Canary: mirror one blog_posts row to Inblog (JSON:API).
// Called from admin BlogManager. Does NOT modify our DB — pure outbound sync.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { marked } from "https://esm.sh/marked@12.0.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INBLOG_BASE = "https://inblog.ai/api/v1";

/** Low-level fetch that returns status + parsed body without throwing on non-2xx. */
async function inblogRaw(path: string, apiKey: string, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/vnd.api+json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (method !== "GET" && init.body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${INBLOG_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json, method, path };
}

/** Convenience: throws on non-2xx (kept for calls where we want fail-fast). */
async function inblogFetch(path: string, apiKey: string, init: RequestInit = {}) {
  const r = await inblogRaw(path, apiKey, init);
  if (!r.ok) {
    throw new Error(`Inblog ${r.method} ${r.path} ${r.status}: ${JSON.stringify(r.json)}`);
  }
  return r.json as any;
}

/** Look up an existing Inblog post id by slug (paginates until found). */
async function findInblogPostIdBySlug(slug: string, apiKey: string): Promise<string | null> {
  // Try filter first (harmless if unsupported — falls back to pagination).
  const filtered = await inblogRaw(`/posts?filter[slug]=${encodeURIComponent(slug)}&page[size]=100`, apiKey);
  if (filtered.ok && Array.isArray(filtered.json?.data)) {
    const hit = filtered.json.data.find((p: any) => p?.attributes?.slug === slug);
    if (hit?.id) return String(hit.id);
  }
  // Fallback: scan pages.
  const pageSize = 100;
  for (let page = 1; page <= 20; page++) {
    const r = await inblogRaw(`/posts?page[size]=${pageSize}&page[number]=${page}`, apiKey);
    if (!r.ok || !Array.isArray(r.json?.data)) break;
    const arr = r.json.data as any[];
    const hit = arr.find((p) => p?.attributes?.slug === slug);
    if (hit?.id) return String(hit.id);
    const total = r.json?.meta?.totalPages ?? r.json?.meta?.total_pages ?? 1;
    if (page >= total) break;
    if (arr.length < pageSize) break;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Parse body ONCE up top; keep postId available for the catch block.
  let body: any = null;
  let postId: string | null = null;
  try {
    body = await req.json();
    postId = body?.postId ?? null;
  } catch {
    return new Response(JSON.stringify({ error: "invalid json body" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const { password, publish = true, dryRun = false } = body ?? {};
    if (password !== Deno.env.get("ADMIN_PASSWORD")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("INBLOG_API_KEY");
    if (!apiKey) throw new Error("INBLOG_API_KEY not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: post, error } = await sb.from("blog_posts").select("*").eq("id", postId).maybeSingle();
    if (error || !post) throw new Error(`post not found: ${postId}`);

    // Markdown → HTML (Inblog expects content_html)
    const html = await marked.parse(post.content || "", { async: true });

    const attributes: Record<string, unknown> = {
      title: post.title,
      slug: post.slug,
      description: post.excerpt || undefined,
      content_html: html,
      meta_title: post.title,
      meta_description: post.excerpt || undefined,
    };
    // Skip image field — Inblog rejects arbitrary URL objects in some cases.
    // Re-enable only after confirming the exact upload/reference shape.

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dryRun: true, attributes }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 1) Verify key + blog
    const me = await inblogFetch("/blogs/me", apiKey);
    const blogSubdomain = me?.data?.attributes?.subdomain ?? me?.data?.subdomain ?? null;

    // 2) Create post — idempotent: if slug conflict (409/422), reuse existing id.
    let inblogPostId: string | null = null;
    let reusedExisting = false;
    const createResp = await inblogRaw("/posts", apiKey, {
      method: "POST",
      body: JSON.stringify({ data: { type: "posts", attributes } }),
    });

    if (createResp.ok) {
      inblogPostId = createResp.json?.data?.id ? String(createResp.json.data.id) : null;
      if (!inblogPostId) throw new Error(`no id in create response: ${JSON.stringify(createResp.json)}`);
    } else if (createResp.status === 409 || createResp.status === 422) {
      // Slug conflict → the post already exists on Inblog (likely orphaned draft).
      const errCode = createResp.json?.errors?.[0]?.code || "";
      const isSlugConflict =
        createResp.status === 409 ||
        errCode === "slug_conflict" ||
        JSON.stringify(createResp.json).toLowerCase().includes("slug");
      if (!isSlugConflict) {
        throw new Error(`Inblog POST /posts ${createResp.status}: ${JSON.stringify(createResp.json)}`);
      }
      const existingId = await findInblogPostIdBySlug(post.slug, apiKey);
      if (!existingId) {
        throw new Error(`slug conflict but existing post not found for slug=${post.slug}`);
      }
      inblogPostId = existingId;
      reusedExisting = true;
      // Update the existing post's content/meta to match current DB row.
      await inblogFetch(`/posts/${inblogPostId}`, apiKey, {
        method: "PATCH",
        body: JSON.stringify({ data: { type: "posts", id: inblogPostId, attributes } }),
      });
    } else {
      throw new Error(`Inblog POST /posts ${createResp.status}: ${JSON.stringify(createResp.json)}`);
    }

    // 3) Publish via PATCH /posts/{id} with attributes.published=true
    //    (The `/posts/{id}/publish` sub-path returns 400 — not a real endpoint.)
    let publishResp: unknown = null;
    if (publish) {
      publishResp = await inblogFetch(`/posts/${inblogPostId}`, apiKey, {
        method: "PATCH",
        body: JSON.stringify({
          data: { type: "posts", id: inblogPostId, attributes: { published: true } },
        }),
      });
    }

    // 4) 308 redirect: /blog/{slug}.html → new inblog canonical
    let redirect: unknown = null;
    try {
      redirect = await inblogFetch("/redirects", apiKey, {
        method: "POST",
        body: JSON.stringify({
          data: {
            type: "redirects",
            attributes: {
              from_path: `/blog/${post.slug}.html`,
              to_path: `/${post.slug}`,
              redirect_type: 308,
            },
          },
        }),
      });
    } catch (e) {
      redirect = { skipped: true, reason: (e as Error).message };
    }

    // Persist sync state (best effort).
    try {
      await sb.from("blog_posts").update({
        inblog_post_id: inblogPostId,
        inblog_synced_at: new Date().toISOString(),
        inblog_sync_error: null,
      }).eq("id", postId);
    } catch (e) {
      console.warn("blog_posts update failed:", (e as Error).message);
    }

    return new Response(JSON.stringify({
      ok: true,
      inblogPostId,
      reusedExisting,
      blogSubdomain,
      publishResp,
      redirect,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    const errMsg = (e as Error).message || String(e);
    // Record failure on our DB using the postId we captured up top.
    if (postId) {
      try {
        const sb2 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await sb2.from("blog_posts")
          .update({ inblog_sync_error: errMsg.slice(0, 500) })
          .eq("id", postId);
      } catch (dbErr) {
        console.warn("failed to persist inblog_sync_error:", (dbErr as Error).message);
      }
    }
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
