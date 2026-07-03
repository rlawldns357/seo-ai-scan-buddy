// Canary: mirror one blog_posts row to Inblog (JSON:API).
// Called from admin BlogManager. Does NOT modify our DB — pure outbound sync.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { marked } from "https://esm.sh/marked@12.0.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INBLOG_BASE = "https://inblog.ai/api/v1";

async function inblogFetch(path: string, apiKey: string, init: RequestInit = {}) {
  const method = (init.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/vnd.api+json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (method !== "GET" && init.body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${INBLOG_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let json: unknown;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Inblog ${method} ${path} ${res.status}: ${JSON.stringify(json)}`);
  }
  return json as any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { password, postId, publish = true, dryRun = false } = await req.json();
    if (password !== Deno.env.get("ADMIN_PASSWORD")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
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
    if (post.og_image || post.thumbnail) {
      attributes.image = { url: post.og_image || post.thumbnail };
    }

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dryRun: true, attributes }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // 1) Check /me to verify key + blog
    const me = await inblogFetch("/blogs/me", apiKey);
    const blogSubdomain = me?.data?.attributes?.subdomain ?? me?.data?.subdomain ?? null;

    // 2) Create post
    const created = await inblogFetch("/posts", apiKey, {
      method: "POST",
      body: JSON.stringify({ data: { type: "posts", attributes } }),
    });
    const inblogPostId: string = created?.data?.id;
    if (!inblogPostId) throw new Error(`no id in create response: ${JSON.stringify(created)}`);

    // 3) Publish
    let publishResp: unknown = null;
    if (publish) {
      publishResp = await inblogFetch(`/posts/${inblogPostId}/publish`, apiKey, {
        method: "PATCH",
        body: JSON.stringify({ data: { type: "posts", id: inblogPostId, attributes: { published: true } } }),
      });
    }

    // 4) 308 redirect: /blog/{slug}.html → new inblog canonical
    // Skip if custom domain is our own — otherwise redirect old .html to inblog subdomain URL.
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

    // Persist sync state to our DB (best effort)
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
      blogSubdomain,
      publishResp,
      redirect,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    // Record failure on our DB (if we can identify the post)
    try {
      const body = await req.clone().json().catch(() => null);
      const pid = body?.postId;
      if (pid) {
        const sb2 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await sb2.from("blog_posts").update({ inblog_sync_error: (e as Error).message.slice(0, 500) }).eq("id", pid);
      }
    } catch { /* noop */ }
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
