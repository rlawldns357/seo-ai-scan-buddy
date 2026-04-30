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
const DesignTest = lazy(() => import("./pages/DesignTest.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const NaverStore = lazy(() => import("./pages/NaverStore.tsx"));

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
            {/* /naver-store → 네이버 스토어 발자 타겟 전용 진단 랜딩 (분리 BM) */}
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

            {/* ───── 관리자 ───────────────────────────────────────────── */}
            <Route path="/admin" element={<Admin />} />

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
