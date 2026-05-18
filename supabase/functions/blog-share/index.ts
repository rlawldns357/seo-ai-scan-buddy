import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const SITE = "https://searchtuneos.com";
const FALLBACK_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/B7SxINlqaSVnKLn4M12dsOhA5aj1/social-images/social-1774498509469-배너_자연스럽게_(1).webp";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildHtmlHeaders() {
  const h = new Headers(headers);
  h.set("Content-Type", "text/html; charset=utf-8");
  h.set("Cache-Control", "public, max-age=300, s-maxage=300");
  return h;
}

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveSlug(req: Request) {
  const url = new URL(req.url);
  const querySlug = url.searchParams.get("slug");
  if (querySlug) return querySlug.replace(/\.html$/i, "");

  const parts = url.pathname.split("/").filter(Boolean);
  const functionIndex = parts.findIndex((part) => part === "blog-share");
  const slug = functionIndex >= 0 ? parts.slice(functionIndex + 1).join("/") : parts.at(-1);
  return decodeURIComponent(slug || "").replace(/\.html$/i, "");
}

function buildHtml(post: Record<string, any>, req: Request) {
  const articleUrl = `${SITE}/blog/${encodeURIComponent(post.slug)}.html`;
  const shareUrl = req.url;
  const title = `${post.title} – 서치튠OS 블로그`;
  const description = post.excerpt || "SEO·AEO·GEO 실전 가이드";
  const image = post.og_image || post.thumbnail || FALLBACK_IMAGE;
  const date = post.date || post.created_at || new Date().toISOString();
  const category = post.category || "가이드";
  const author = post.author || "SearchTune OS";

  const articleJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description,
    author: { "@type": "Person", name: author },
    publisher: { "@type": "Organization", name: "SearchTune OS", url: SITE },
    datePublished: date,
    dateModified: post.updated_at || date,
    mainEntityOfPage: { "@type": "WebPage", "@id": shareUrl },
    image,
    articleSection: category,
    inLanguage: "ko",
  });

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${articleUrl}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="${esc(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="서치튠OS" />
  <meta property="og:locale" content="ko_KR" />
  <meta property="article:published_time" content="${esc(date)}" />
  <meta property="article:modified_time" content="${esc(post.updated_at || date)}" />
  <meta property="article:author" content="${esc(author)}" />
  <meta property="article:section" content="${esc(category)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(image)}" />
  <script type="application/ld+json">${articleJsonLd}</script>
  <script>
    (function(){
      var ua = navigator.userAgent || "";
      var isCrawler = /kakao|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|bot|crawler|spider/i.test(ua);
      if (!isCrawler) setTimeout(function(){ location.replace(${JSON.stringify(articleUrl)}); }, 900);
    })();
  </script>
</head>
<body style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#111;display:grid;place-items:center;min-height:100vh;padding:24px">
  <main style="max-width:640px;text-align:center">
    <img src="${esc(image)}" alt="" width="600" height="315" style="width:100%;height:auto;border-radius:16px;margin-bottom:24px" />
    <p style="font-size:14px;color:#666;margin:0 0 8px">서치튠OS 블로그로 이동 중</p>
    <h1 style="font-size:24px;line-height:1.35;margin:0 0 18px">${esc(post.title)}</h1>
    <a href="${articleUrl}" style="color:#2563eb;font-weight:700">글 바로 보기</a>
  </main>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });

  try {
    const slug = resolveSlug(req);
    if (!slug) {
      return new Response("Missing slug", { status: 400, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug,title,excerpt,category,author,date,thumbnail,og_image,created_at,updated_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response("Blog post not found", { status: 404, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
    }

    return new Response(new TextEncoder().encode(buildHtml(data, req)), {
      status: 200,
      headers: buildHtmlHeaders(),
    });
  } catch (error) {
    console.error("[blog-share] error", error);
    return new Response("Internal error", { status: 500, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
  }
});
