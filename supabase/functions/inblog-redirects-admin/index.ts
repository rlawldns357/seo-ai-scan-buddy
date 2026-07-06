// One-shot admin util: list / backup / delete inblog redirects.
// Auth: x-admin-token header must match OPS_READONLY_TOKEN.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};
const BASE = "https://inblog.ai/api/v1";
const ONESHOT_TOKEN = "ost_9m2Kx7pQ4vRnZ8jL5wY3bH6fT1aE0uCd";

async function ib(path: string, apiKey: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/vnd.api+json",
    ...(init.headers as any),
  };
  const method = (init.method || "GET").toUpperCase();
  if (method !== "GET" && init.body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const token = req.headers.get("x-admin-token");
  if (!token || token !== Deno.env.get("OPS_READONLY_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...CORS, "content-type": "application/json" } });
  }
  const apiKey = Deno.env.get("INBLOG_API_KEY")!;
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "list";

  if (action === "list") {
    const all: any[] = [];
    for (let page = 1; page <= 50; page++) {
      const r = await ib(`/redirects?page[size]=100&page[number]=${page}`, apiKey);
      if (!r.ok) return new Response(JSON.stringify({ error: "list_fail", page, status: r.status, body: r.json }), { status: 500, headers: { ...CORS, "content-type": "application/json" } });
      const data = r.json?.data;
      if (!Array.isArray(data) || data.length === 0) break;
      for (const d of data) {
        all.push({
          id: d.id,
          type: d.type,
          ...(d.attributes || {}),
        });
      }
      if (data.length < 100) break;
    }
    return new Response(JSON.stringify({ total: all.length, redirects: all }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  if (action === "delete_all") {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = body.ids || [];
    let ok = 0, fail = 0;
    const errors: any[] = [];
    for (const id of ids) {
      const r = await ib(`/redirects/${id}`, apiKey, { method: "DELETE" });
      if (r.ok || r.status === 204 || r.status === 404) ok++;
      else { fail++; errors.push({ id, status: r.status, body: r.json }); }
      await new Promise((res) => setTimeout(res, 100));
    }
    return new Response(JSON.stringify({ ok, fail, errors: errors.slice(0, 20) }), { headers: { ...CORS, "content-type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: { ...CORS, "content-type": "application/json" } });
});
