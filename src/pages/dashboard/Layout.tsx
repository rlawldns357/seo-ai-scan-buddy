import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/features/publish/AppSidebar";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";
import { useUserSite } from "@/features/publish/useUserSite";
import { LogOut } from "lucide-react";

/**
 * Dashboard layout — operations console for Autoblog.
 *
 * Read-only by default. Browsing /dashboard/* NEVER auto-redirects to /auth.
 * Guests see the shell with LockedFeature placeholders; auth is enforced
 * ONLY at the action layer (form submit, publish, queue, archive, edit, save)
 * via `useRequireAuthAction`. Public marketing lives at /autoblog.
 */
export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { site } = useUserSite();
  const navigate = useNavigate();
  const location = useLocation();

  // No automatic redirect on page access. Guests can browse /dashboard/* in
  // read-only mode; auth is enforced ONLY at the action layer via
  // `useRequireAuthAction` (form submit, publish, queue, archive, edit, save).
  // Sub-pages render LockedFeature placeholders when no site is linked.

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background overflow-x-hidden">
        <Navbar />
        <div className="flex flex-1 w-full min-w-0">
          <AppSidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <header className="h-[var(--dash-subheader-h,3.5rem)] flex items-center justify-between border-b px-2 sticky top-16 bg-background/95 backdrop-blur z-40 gap-3">
              <div className="flex items-center min-w-0">
                <SidebarTrigger />
                <span className="ml-3 text-sm font-semibold tracking-tight">AutoBlog</span>
                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">PRO</span>
              </div>
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-2 min-w-0 rounded-full border border-border/50 bg-card px-3 py-1.5 text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <span className="text-foreground font-medium truncate max-w-[180px]">{user.email}</span>
                    {site && <span className="text-muted-foreground truncate max-w-[140px]">· {site.title}</span>}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                    aria-label="로그아웃"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>로그아웃</span>
                  </button>
                </div>
              ) : (
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
