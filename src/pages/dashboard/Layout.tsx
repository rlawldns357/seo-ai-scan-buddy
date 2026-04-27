import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/features/publish/AppSidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";

/**
 * Dashboard layout — operations console for Autoblog.
 *
 * Read-only by default. Browsing /dashboard/* NEVER auto-redirects to /auth.
 * Guests see the shell with LockedFeature placeholders; auth is enforced
 * ONLY at the action layer (form submit, publish, queue, archive, edit, save)
 * via `useRequireAuthAction`. Public marketing lives at /autoblog.
 */
export default function DashboardLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // No automatic redirect on page access. Guests can browse /dashboard/* in
  // read-only mode; auth is enforced ONLY at the action layer via
  // `useRequireAuthAction` (form submit, publish, queue, archive, edit, save).
  // Sub-pages render LockedFeature placeholders when no site is linked.

  return (
    <SidebarProvider>
      <div className="min-h-[calc(100svh-var(--payment-test-banner-height,0px))] flex flex-col w-full bg-background overflow-x-hidden">
        <Navbar />
        <div className="flex flex-1 w-full min-w-0 pt-[var(--dash-subheader-h,3.75rem)]">
          <AppSidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <header className="fixed left-0 right-0 top-[calc(4rem+var(--payment-test-banner-height,0px))] h-[var(--dash-subheader-h,3.75rem)] flex items-center justify-between border-b bg-background/95 backdrop-blur z-40 gap-3 pl-2 pr-3 md:left-[var(--sidebar-width)] group-data-[state=collapsed]/sidebar-wrapper:md:left-[var(--sidebar-width-icon)] transition-[left] duration-200 ease-linear">
              <div className="flex items-center min-w-0">
                <SidebarTrigger />
                <span className="ml-3 text-sm font-semibold tracking-tight">AutoBlog</span>
              </div>
              {!user && (
                <button
                  onClick={() => navigate(`/auth?next=${encodeURIComponent(location.pathname + location.search)}`)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  로그인
                </button>
              )}
            </header>
            <main className="flex-1 w-full min-w-0 container max-w-5xl py-6 px-3 md:px-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
