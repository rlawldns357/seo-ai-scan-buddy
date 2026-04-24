import { useEffect } from "react";
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

  useEffect(() => {
    if (location.pathname !== "/dashboard" || !location.hash) return;

    const hashRouteMap: Record<string, string> = {
      "#recommendations": "/dashboard/recommendations",
      "#workflow": "/dashboard/workflow",
      "#archive": "/dashboard/archive",
      "#reports": "/dashboard/reports",
    };

    const next = hashRouteMap[location.hash];
    if (next) navigate(next, { replace: true });
  }, [location.hash, location.pathname, navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background overflow-x-hidden">
        <Navbar />
        <div className="flex flex-1 w-full min-w-0">
          <AppSidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <header className="h-[var(--dash-subheader-h,3.75rem)] flex items-center justify-between border-b px-2 sticky top-16 bg-background/95 backdrop-blur z-40 gap-3">
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

