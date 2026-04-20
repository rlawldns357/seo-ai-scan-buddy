import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ScrollToTop from "@/components/ScrollToTop";
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
const DashboardIndex = lazy(() => import("./pages/dashboard/Index.tsx"));
const DashboardRecommendations = lazy(() => import("./pages/dashboard/Recommendations.tsx"));
const DashboardContent = lazy(() => import("./pages/dashboard/Content.tsx"));
const DashboardAutoPublish = lazy(() => import("./pages/dashboard/AutoPublish.tsx"));
const DashboardReports = lazy(() => import("./pages/dashboard/Reports.tsx"));
const SiteHub = lazy(() => import("./pages/sites/SiteHub.tsx"));
const SitePost = lazy(() => import("./pages/sites/SitePost.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/design-test" element={<DesignTest />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardIndex />} />
              <Route path="recommendations" element={<DashboardRecommendations />} />
              <Route path="content" element={<DashboardContent />} />
              <Route path="auto-publish" element={<DashboardAutoPublish />} />
              <Route path="reports" element={<DashboardReports />} />
            </Route>
            <Route path="/sites/:siteSlug" element={<SiteHub />} />
            <Route path="/sites/:siteSlug/:postSlug" element={<SitePost />} />
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
