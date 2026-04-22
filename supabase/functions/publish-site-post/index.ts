import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTHLY_LIMIT = 5;

type SitePostRow = {
  id: string;
  site_id: string;
  status: string;
  title: string;
  content: string;
  slug: string;
  keywords: string[] | null;
  faq: { q: string; a: string }[] | null;
};

type Candidate = {
  id: string;
  title: string;
  slug: string;
  keywords: string[];
};

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

  for (const { kw, c } of ranked) {
    if (injected.length >= 3) break;
    if (usedAnchors.has(kw)) continue;

    // 이미 링크된 텍스트는 회피: [..](..) 매칭 영역 제외
    // 가장 단순한 방식 — 첫 등장 위치 찾고, 주변에 ]( 가 없는지 확인
    const idx = body.indexOf(kw);
    if (idx === -1) continue;

    // 이미 링크 안인지 검사
    const before = body.slice(Math.max(0, idx - 80), idx);
    const after = body.slice(idx + kw.length, idx + kw.length + 30);
    if (/\[[^\]]*$/.test(before) && /^[^\]]*\]\(/.test(after)) continue;

    // 코드블록(```...```) 안인지
    const opens = (body.slice(0, idx).match(/```/g) || []).length;
    if (opens % 2 === 1) continue;

    const url = `/sites/${siteSlug}/${c.slug}`;
    const link = `[${kw}](${url})`;
    body = body.slice(0, idx) + link + body.slice(idx + kw.length);
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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

    // 월 5건 한도
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { count } = await supabase
      .from("site_posts")
      .select("id", { count: "exact", head: true })
      .eq("site_id", post.site_id)
      .eq("status", "published")
      .gte("published_at", since.toISOString());

    if ((count ?? 0) >= MONTHLY_LIMIT) {
      return new Response(JSON.stringify({ error: `월 발행 한도(${MONTHLY_LIMIT}건) 초과` }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 사이트 슬러그 + 후보 글 가져오기
    const { data: site } = await supabase
      .from("user_sites")
      .select("site_slug")
      .eq("id", post.site_id)
      .maybeSingle();

    const siteSlug = site?.site_slug || "";

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
