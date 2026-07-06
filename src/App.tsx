import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

/**
 * 구블로그(Lovable 호스팅)의 /blog/* 트래픽을 인블로그(searchtuneos.com/blog)로 전량 이관.
 * - /blog                            → https://searchtuneos.com/blog
 * - /blog/{slug}                     → https://searchtuneos.com/blog/{slug}
 * - /blog/{slug}.html                → https://searchtuneos.com/blog/{slug}     (.html 제거)
 * - /blog/{slug}/index.html          → https://searchtuneos.com/blog/{slug}
 * 구블로그 UI는 /blog9 비밀 경로에서만 접근 가능 (noindex).
 */
function RedirectToInblog() {
  const location = useLocation();
  useEffect(() => {
    let path = location.pathname;
    // strip /index.html tail
    path = path.replace(/\/index\.html$/i, "");
    // strip trailing .html
    path = path.replace(/\.html$/i, "");
    // strip trailing slash (but keep root /blog)
    if (path.length > "/blog".length) path = path.replace(/\/+$/, "");
    const target = `https://searchtuneos.com${path}${location.search}${location.hash}`;
    window.location.replace(target);
  }, [location.pathname, location.search, location.hash]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      searchtuneos.com/blog 로 이동 중…
    </div>
  );
}

import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ScrollToTop from "@/components/ScrollToTop";
import GAListener from "@/components/GAListener";
import Index from "./pages/Index.tsx";

const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const VipTest = lazy(() => import("./pages/VipTest.tsx"));
const DesignTest = lazy(() => import("./pages/DesignTest.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const NaverStore = lazy(() => import("./pages/NaverStore.tsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.tsx"));
const Insights = lazy(() => import("./pages/admin/Insights.tsx"));
const BlogManager = lazy(() => import("./pages/admin/BlogManager.tsx"));
const SeoMonitor = lazy(() => import("./pages/admin/SeoMonitor.tsx"));
const IndexingQueue = lazy(() => import("./pages/admin/IndexingQueue.tsx"));
const AiGrowthLoop = lazy(() => import("./pages/admin/AiGrowthLoop.tsx"));
const Credits = lazy(() => import("./pages/admin/Credits.tsx"));
const OpsReadonly = lazy(() => import("./pages/admin/OpsReadonly.tsx"));
const SeoOps = lazy(() => import("./pages/admin/SeoOps.tsx"));
const QaStatus = lazy(() => import("./pages/admin/QaStatus.tsx"));
const Threads = lazy(() => import("./pages/admin/Threads.tsx"));
const Content = lazy(() => import("./pages/admin/Content.tsx"));

const Blog = lazy(() => import("./pages/Blog.tsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));


const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <GAListener />
        <Suspense fallback={null}>
          <Routes>
            {/* ───── 공개 라우트 (Public) ─────────────────────────────── */}
            {/* /         → 진단 소개 + 무료 사이트 진단 (공개 메인, 고정) */}
            <Route path="/" element={<Index />} />
            {/* /naver-store → 전용 랜딩 (자체 SEO 메타 + h1, 자동 분기 폼은 메인으로 redirect) */}
            <Route path="/naver-store" element={<NaverStore />} />
            {/* 기타 공개 페이지 */}
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug.html" element={<BlogPost />} />
            <Route path="/blog/:slug/index.html" element={<BlogPost />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/design-test" element={<DesignTest />} />
            <Route path="/vip-test" element={<VipTest />} />

            {/* ───── 관리자 (모두 AdminLayout 사이드바 아래에서 통일) ───── */}
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/insights" replace />} />
              <Route path="/admin/insights" element={<Insights />} />
              <Route path="/admin/blog" element={<BlogManager />} />
              <Route path="/admin/content" element={<Content />} />
              <Route path="/admin/seo" element={<SeoMonitor />} />
              <Route path="/admin/credits" element={<Credits />} />
              <Route path="/admin/system" element={<QaStatus />} />

              {/* 레거시 경로 흡수 — 새 6탭으로 redirect */}
              <Route path="/admin/seo-monitor" element={<Navigate to="/admin/seo" replace />} />
              <Route path="/admin/seo-ops" element={<Navigate to="/admin/seo" replace />} />
              <Route path="/admin/indexing-queue" element={<Navigate to="/admin/seo" replace />} />
              <Route path="/admin/ai-growth-loop" element={<Navigate to="/admin/seo" replace />} />
              <Route path="/admin/qa-status" element={<Navigate to="/admin/system" replace />} />
              <Route path="/admin/threads" element={<Navigate to="/admin/content" replace />} />

              {/* 레거시 직접 접근용 (Content 탭의 '구 Threads 페이지 열기' 링크) */}
              <Route path="/admin/threads-legacy" element={<Threads />} />
              <Route path="/admin/seo-ops-legacy" element={<SeoOps />} />
              <Route path="/admin/indexing-queue-legacy" element={<IndexingQueue />} />
              <Route path="/admin/ai-growth-loop-legacy" element={<AiGrowthLoop />} />
            </Route>
            {/* 읽기 전용 자동 점검(Hermes 등) — 토큰 기반, 관리자 비번 무관 */}
            <Route path="/admin/ops-readonly" element={<OpsReadonly />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
