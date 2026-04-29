import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
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
const Auth = lazy(() => import("./pages/Auth.tsx"));
const NaverStore = lazy(() => import("./pages/NaverStore.tsx"));

// AutoBlog routes moved to standalone product: https://auto-blog-hive.lovable.app
// Source code kept under src/pages/dashboard, src/pages/sites, src/pages/Autoblog.tsx
// for easy restoration if needed.

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
        <PaymentTestModeBanner />
        <Suspense fallback={null}>
          <Routes>
            {/* ───── 공개 라우트 (Public) ─────────────────────────────── */}
            {/* /         → 진단 소개 + 무료 사이트 진단 (공개 메인, 고정) */}
            <Route path="/" element={<Index />} />
            {/* /autoblog → AutoBlog 제품 소개 (공개 마케팅 랜딩) */}
            <Route path="/autoblog" element={<Autoblog />} />
            {/* /naver-store → 네이버 스토어 발자 타겟 전용 진단 랜딩 (분리 BM) */}
            <Route path="/naver-store" element={<NaverStore />} />
            {/* 기타 공개 페이지 */}
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/sites/:siteSlug" element={<SiteHub />} />
            <Route path="/sites/:siteSlug/:postSlug" element={<SitePost />} />
            <Route path="/design-test" element={<DesignTest />} />

            {/* ───── 인증 ─────────────────────────────────────────────── */}
            <Route path="/auth" element={<Auth />} />

            {/* ───── 내부 작업 공간 (읽기 전용 접근 허용, 액션만 가드) ── */}
            {/* /dashboard/* → 로그인 사용자의 AutoBlog 운영 콘솔.        */}
            {/* 게스트 접근 시 /auth로 자동 이동하지 않음.               */}
            {/* 인증은 useRequireAuthAction을 통한 액션 클릭 시점에만.   */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="recommendations" element={<DashboardRecommendationsPage />} />
              <Route path="workflow" element={<DashboardWorkflow />} />
              <Route path="archive" element={<DashboardArchivePage />} />
              <Route path="reports" element={<DashboardReportsPage />} />
              <Route path="products" element={<DashboardProducts />} />
              {/* legacy redirects */}
              <Route path="content" element={<Navigate to="/dashboard/workflow" replace />} />
              <Route path="auto-publish" element={<Navigate to="/dashboard/workflow" replace />} />
              <Route path="posts" element={<Navigate to="/dashboard/workflow" replace />} />
              <Route path="demo" element={<DashboardDemo />} />
            </Route>

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
