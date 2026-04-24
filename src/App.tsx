import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
const DashboardLayout = lazy(() => import("./pages/dashboard/Layout.tsx"));
const DashboardOnePage = lazy(() => import("./pages/dashboard/OnePage.tsx"));
const DashboardDemo = lazy(() => import("./pages/dashboard/Demo.tsx"));
const SiteHub = lazy(() => import("./pages/sites/SiteHub.tsx"));
const SitePost = lazy(() => import("./pages/sites/SitePost.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Autoblog = lazy(() => import("./pages/Autoblog.tsx"));

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
            {/* /autoblog → AutoBlog 제품 소개 (공개 마케팅 랜딩) */}
            <Route path="/autoblog" element={<Autoblog />} />
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
              <Route index element={<DashboardOnePage />} />
              <Route path="recommendations" element={<Navigate to="/dashboard#recommendations" replace />} />
              <Route path="content" element={<Navigate to="/dashboard#workflow" replace />} />
              <Route path="auto-publish" element={<Navigate to="/dashboard#workflow" replace />} />
              <Route path="posts" element={<Navigate to="/dashboard#workflow" replace />} />
              <Route path="reports" element={<Navigate to="/dashboard#reports" replace />} />
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
