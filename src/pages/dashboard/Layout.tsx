import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/features/publish/AppSidebar";
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // No automatic redirect on page access. Guests can browse /dashboard/* in
  // read-only mode; auth is enforced ONLY at the action layer via
  // `useRequireAuthAction` (form submit, publish, queue, archive, edit, save).
  // Sub-pages render LockedFeature placeholders when no site is linked.

  return (
    <SidebarProvider className="h-[calc(100svh-var(--payment-test-banner-height,0px))] min-h-0 overflow-hidden">
      <div className="flex h-full w-full min-w-0 bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <header className="h-[var(--dash-subheader-h,3.5rem)] shrink-0 flex items-center justify-between border-b px-2 bg-background/95 backdrop-blur z-40 gap-3">
            <div className="flex items-center min-w-0">
              <SidebarTrigger />
              <span className="ml-3 text-sm font-semibold tracking-tight">Auto Blog</span>
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
          <main className="flex-1 min-h-0 w-full min-w-0 overflow-y-auto container max-w-5xl py-6 px-3 md:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
