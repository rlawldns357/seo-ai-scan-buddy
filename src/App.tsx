import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

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
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.tsx"));
const SeoMonitor = lazy(() => import("./pages/admin/SeoMonitor.tsx"));
const IndexingQueue = lazy(() => import("./pages/admin/IndexingQueue.tsx"));
const AiGrowthLoop = lazy(() => import("./pages/admin/AiGrowthLoop.tsx"));
const OpsReadonly = lazy(() => import("./pages/admin/OpsReadonly.tsx"));
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

            {/* ───── 관리자 ───────────────────────────────────────────── */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/insights" element={<Admin />} />
            <Route path="/admin/blog" element={<Admin />} />
            <Route element={<AdminLayout />}>
              <Route path="/admin/seo-monitor" element={<SeoMonitor />} />
              <Route path="/admin/indexing-queue" element={<IndexingQueue />} />
              <Route path="/admin/ai-growth-loop" element={<AiGrowthLoop />} />
              <Route path="/admin/credits" element={<Credits />} />
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
