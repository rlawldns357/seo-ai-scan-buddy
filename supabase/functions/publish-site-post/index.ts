import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Monthly publish caps per tier (BM v7) */
const TIER_MONTHLY_LIMIT: Record<string, number> = {
  free: 5,
  beta: 60,
  lite: 10,
  pro: 60,
  studio: 200,
  admin: 9999,
};

type Candidate = {
  id: string;
  title: string;
  slug: string;
  keywords: string[];
};

type ProductCandidate = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  keywords: string[];
  price: string | null;
  image_url: string | null;
};

type ProductMatch = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  price: string | null;
  image_url: string | null;
  matched_keywords: string[];
  score: number;
};

/**
 * 글 본문/제목/키워드를 보고 사이트 제품 카탈로그에서 가장 관련성 높은 제품
 * 최대 3개를 골라 반환. 키워드 겹침 가중치 + 본문 등장 횟수.
 */
function matchProducts(
  content: string,
  postKeywords: string[],
  postTitle: string,
  products: ProductCandidate[],
): ProductMatch[] {
  if (!products.length) return [];
  const haystack = (postTitle + "\n" + content).toLowerCase();
  const postKwSet = new Set(postKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean));

  const scored: ProductMatch[] = products.map((p) => {
    const matched = new Set<string>();
    let score = 0;
    for (const rawKw of p.keywords || []) {
      const kw = rawKw.trim().toLowerCase();
      if (!kw) continue;
      if (postKwSet.has(kw)) {
        matched.add(rawKw);
        score += 5; // 글의 핵심 키워드와 정확히 겹침 = 강한 신호
      }
      // 본문 등장 횟수 (최대 3회까지 가산)
      const occ = haystack.split(kw).length - 1;
      if (occ > 0) {
        matched.add(rawKw);
        score += Math.min(occ, 3) * 2;
      }
    }
    return {
      id: p.id,
      title: p.title,
      url: p.url,
      description: p.description,
      price: p.price,
      image_url: p.image_url,
      matched_keywords: Array.from(matched),
      score,
    };
  });

  const ranked = scored.filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  // 매칭 0개일 때도 최신 제품 1개는 노출 (모든 글 끝 CTA 보장)
  if (ranked.length === 0 && products.length > 0) {
    const fallback = products[0];
    ranked.push({
      id: fallback.id,
      title: fallback.title,
      url: fallback.url,
      description: fallback.description,
      price: fallback.price,
      image_url: fallback.image_url,
      matched_keywords: [],
      score: 0,
    });
  }
  return ranked;
}

/**
 * 같은 사이트 내 다른 발행글에서 키워드 매칭으로 internal link 후보를 찾고,
 * 본문(마크다운)에 자연스럽게 [텍스트](URL) 형태로 2~3개 자동 삽입.
 * - 한 글당 최대 3개
 * - 같은 키워드는 한 번만 링크 (첫 등장만)
 * - 이미 링크([..](..))로 감싸진 텍스트는 건드리지 않음
 * - FAQ 섹션 안에는 삽입하지 않음 (질문/답변 가독성 보호)
 */
function injectInternalLinks(
  content: string,
  candidates: Candidate[],
  siteSlug: string,
): { newContent: string; injected: { title: string; slug: string; anchor: string }[] } {
  if (!candidates.length) return { newContent: content, injected: [] };

  // FAQ 섹션 분리
  const faqMatch = content.match(/^##\s*FAQ\b/im);
  const bodyEnd = faqMatch ? content.indexOf(faqMatch[0]) : content.length;
  let body = content.slice(0, bodyEnd);
  const tail = content.slice(bodyEnd);

  const injected: { title: string; slug: string; anchor: string }[] = [];
  const usedAnchors = new Set<string>();

  // 점수: 키워드가 길수록 우선 (구체성)
  const ranked = candidates
    .flatMap((c) =>
      c.keywords.map((kw) => ({ kw: kw.trim(), c }))
    )
    .filter((x) => x.kw.length >= 2 && x.kw.length <= 30)
    .sort((a, b) => b.kw.length - a.kw.length);

  // 한국어 조사 허용 (kw 뒤에 은/는/이/가/을/를/의/에/로/와/과 같은 조사가 와도 매칭)
  const KOREAN_PARTICLES = "(?:은|는|이|가|을|를|의|에|에서|로|으로|와|과|도|만|까지|부터|보다|처럼|이나|나|이라|라|이라는|라는)?";

  for (const { kw, c } of ranked) {
    if (injected.length >= 3) break;
    if (usedAnchors.has(kw)) continue;

    // 정규식 안전 이스케이프
    const safe = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const re = new RegExp(safe + KOREAN_PARTICLES, "g");
    let m: RegExpExecArray | null = null;
    let chosenIdx = -1;
    while ((m = re.exec(body)) !== null) {
      const idx = m.index;
      // 이미 링크 안인지
      const before = body.slice(Math.max(0, idx - 80), idx);
      const after = body.slice(idx + kw.length, idx + kw.length + 30);
      if (/\[[^\]]*$/.test(before) && /^[^\]]*\]\(/.test(after)) continue;
      // 코드블록 안인지
      const opens = (body.slice(0, idx).match(/```/g) || []).length;
      if (opens % 2 === 1) continue;
      // H2 줄에는 링크 넣지 않음 (가독성)
      const lineStart = body.lastIndexOf("\n", idx) + 1;
      const lineEnd = body.indexOf("\n", idx);
      const line = body.slice(lineStart, lineEnd === -1 ? body.length : lineEnd);
      if (/^#{1,3}\s/.test(line)) continue;
      chosenIdx = idx;
      break;
    }
    if (chosenIdx === -1) continue;

    const url = `/sites/${siteSlug}/${c.slug}`;
    const link = `[${kw}](${url})`;
    body = body.slice(0, chosenIdx) + link + body.slice(chosenIdx + kw.length);
    usedAnchors.add(kw);
    injected.push({ title: c.title, slug: c.slug, anchor: kw });
  }

  return { newContent: body + tail, injected };
}

/** 신호 기반 자동 채점 (Brief/본문/FAQ만으로 측정 가능한 발행 직전 신호) */
function scoreContent(p: {
  title: string;
  excerpt: string | null;
  content: string;
  keywords: string[];
  faq: { q: string; a: string }[];
  internalLinkCount: number;
}): { seo: number; aeo: number; geo: number } {
  const titleLen = p.title.length;
  const excerptLen = (p.excerpt || "").length;
  const charCount = p.content.replace(/\s/g, "").length;
  const h2Count = (p.content.match(/^##\s/gm) || []).length;
  const tableCount = (p.content.match(/^\|.+\|$/gm) || []).length;
  const externalLinks = (p.content.match(/\]\(https?:\/\//g) || []).length;
  const primaryKw = (p.keywords[0] || "").trim();
  const titleHasKw = primaryKw && p.title.includes(primaryKw);
  const introFirstPara = p.content.split(/\n\n/).find((s) => s.trim() && !s.startsWith("#")) || "";
  const intro = introFirstPara.replace(/[#*`>]/g, "").trim();
  const introLen = intro.length;

  // ── SEO (구조·메타·길이·키워드 적합도) ──
  let seo = 50;
  if (titleLen >= 25 && titleLen <= 60) seo += 8;
  if (excerptLen >= 80 && excerptLen <= 160) seo += 8;
  if (titleHasKw) seo += 8;
  if (h2Count >= 3 && h2Count <= 6) seo += 8;
  if (tableCount >= 3) seo += 6; // 표 1개 = 보통 헤더+구분+데이터행 3줄
  if (charCount >= 1500 && charCount <= 3500) seo += 6;
  if (externalLinks >= 1) seo += 3;
  if (p.internalLinkCount >= 2) seo += 3;
  seo = Math.min(98, seo);

  // ── AEO (직접 답변·FAQ·역피라미드) ──
  let aeo = 45;
  if (introLen >= 40 && introLen <= 200) aeo += 12; // 도입부 직접 답변형
  if (p.faq.length >= 3) aeo += 12;
  if (p.faq.length >= 5) aeo += 6;
  // FAQ 답변 평균 길이 적정성
  const avgAnsLen =
    p.faq.length > 0
      ? p.faq.reduce((a, f) => a + (f.a || "").length, 0) / p.faq.length
      : 0;
  if (avgAnsLen >= 60 && avgAnsLen <= 250) aeo += 8;
  if (h2Count >= 3) aeo += 6;
  if (titleHasKw) aeo += 4;
  aeo = Math.min(96, aeo);

  // ── GEO (엔티티·구체성·인용 친화) ──
  let geo = 40;
  // 숫자/연도 등장 빈도 (구체적 수치 지표)
  const numMatches = (p.content.match(/\d{2,4}(년|월|%|개|편|회|만원|원|배|위|위권)/g) || []).length;
  if (numMatches >= 5) geo += 10;
  if (numMatches >= 10) geo += 6;
  if (p.content.includes("2026")) geo += 4;
  if (tableCount >= 3) geo += 8; // 비교표는 GEO 인용 친화
  if (externalLinks >= 1) geo += 6;
  if (p.faq.length >= 3) geo += 8;
  if (p.keywords.length >= 5) geo += 6;
  if (charCount >= 2000) geo += 4;
  // 보수적 캡 (사용자 인지·전환 유도)
  geo = Math.min(92, geo);

  return {
    seo: Math.max(0, Math.round(seo)),
    aeo: Math.max(0, Math.round(aeo)),
    geo: Math.max(0, Math.round(geo)),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { postId } = await req.json();
    if (!postId) {
      return new Response(JSON.stringify({ error: "postId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Admin client — bypasses RLS for the actual mutation.
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorization gate: either the request is signed by the service role
    // (scheduler) or the caller must own the post via RLS.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const isServiceCall = bearer.length > 0 && bearer === SERVICE_KEY;

    if (!isServiceCall) {
      // Validate ownership through user-context RLS. If the user is not the
      // owner of the parent site, this select returns no row.
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData } = await userClient.auth.getUser();
      if (!authData?.user) {
        return new Response(JSON.stringify({ error: "로그인이 필요해요. 다시 로그인 후 시도해주세요." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: ownedPost, error: ownedErr } = await userClient
        .from("site_posts")
        .select("id")
        .eq("id", postId)
        .maybeSingle();
      if (ownedErr || !ownedPost) {
        return new Response(JSON.stringify({ error: "이 글에 대한 권한이 없습니다." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: post, error: postErr } = await supabase
      .from("site_posts")
      .select("id, site_id, status, title, content, slug, keywords, faq, excerpt")
      .eq("id", postId)
      .maybeSingle();

    if (postErr || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (post.status === "published") {
      return new Response(JSON.stringify({ ok: true, alreadyPublished: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 사이트 슬러그 + 소유자 user_id 가져오기 (티어 결정용)
    const { data: site } = await supabase
      .from("user_sites")
      .select("site_slug, user_id")
      .eq("id", post.site_id)
      .maybeSingle();

    const siteSlug = site?.site_slug || "";

    // 소유자 티어 조회 → 월 발행 한도 결정
    let tier = "free";
    if (site?.user_id) {
      const { data: tierRow } = await supabase.rpc("get_user_tier", { _user_id: site.user_id });
      if (typeof tierRow === "string") tier = tierRow;
    }
    const monthlyLimit = TIER_MONTHLY_LIMIT[tier] ?? TIER_MONTHLY_LIMIT.free;

    // 월 발행 한도 체크
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { count } = await supabase
      .from("site_posts")
      .select("id", { count: "exact", head: true })
      .eq("site_id", post.site_id)
      .eq("status", "published")
      .gte("published_at", since.toISOString());

    if ((count ?? 0) >= monthlyLimit) {
      return new Response(JSON.stringify({ error: `월 발행 한도(${monthlyLimit}건) 초과 — 현재 플랜: ${tier.toUpperCase()}` }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: others } = await supabase
      .from("site_posts")
      .select("id, title, slug, keywords")
      .eq("site_id", post.site_id)
      .eq("status", "published")
      .neq("id", postId)
      .order("published_at", { ascending: false })
      .limit(20);

    const candidates: Candidate[] = (others || []).map((o: any) => ({
      id: o.id,
      title: o.title,
      slug: o.slug,
      keywords: Array.isArray(o.keywords) ? o.keywords : [],
    }));

    // ── 자동 백링크 삽입 ──
    const { newContent, injected } = siteSlug
      ? injectInternalLinks(post.content, candidates, siteSlug)
      : { newContent: post.content, injected: [] };

    // ── 제품 카탈로그 매칭 (사이트 단위 등록 → AI 키워드 매칭) ──
    const { data: productRows } = await supabase
      .from("site_products")
      .select("id, title, url, description, keywords, price, image_url")
      .eq("site_id", post.site_id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50);

    const productCandidates: ProductCandidate[] = (productRows || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      url: p.url,
      description: p.description,
      keywords: Array.isArray(p.keywords) ? p.keywords : [],
      price: p.price,
      image_url: p.image_url,
    }));

    const matchedProducts = matchProducts(
      newContent,
      Array.isArray(post.keywords) ? post.keywords : [],
      post.title,
      productCandidates,
    );

    // ── 발행 후 3축 자동 채점 ──
    const faqArr = Array.isArray(post.faq) ? post.faq : [];
    const kwArr = Array.isArray(post.keywords) ? post.keywords : [];
    const scores = scoreContent({
      title: post.title,
      excerpt: (post as any).excerpt ?? null,
      content: newContent,
      keywords: kwArr,
      faq: faqArr as { q: string; a: string }[],
      internalLinkCount: injected.length,
    });

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("site_posts")
      .update({
        status: "published",
        published_at: nowIso,
        content: newContent,
        internal_links: injected,
        product_links: matchedProducts,
        seo_score: scores.seo,
        aeo_score: scores.aeo,
        geo_score: scores.geo,
        scored_at: nowIso,
      })
      .eq("id", postId);

    if (updErr) throw updErr;

    return new Response(
      JSON.stringify({
        ok: true,
        injectedLinks: injected.length,
        productLinks: matchedProducts.length,
        scores,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("publish-site-post error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
