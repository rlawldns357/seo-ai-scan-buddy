import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/features/publish/AppSidebar";
import Navbar from "@/components/Navbar";
import RequireAuth from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/useAuth";
import { useUserSite } from "@/features/publish/useUserSite";
import { LogOut } from "lucide-react";

export default function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const { site } = useUserSite();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };
  const location = useLocation();
  const isRoot = location.pathname === "/dashboard" || location.pathname === "/dashboard/";

  // Public access for the AutoBlog landing at /dashboard root.
  // Render WITHOUT RequireAuth regardless of loading state so visitors
  // never get bounced to /auth while the session is being checked.
  // Logged-in vs logged-out content is handled inside DashboardIndex.
  if (isRoot && !user) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-background">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <RequireAuth>
      <SidebarProvider>
        <div className="min-h-screen flex flex-col w-full bg-background">
          <Navbar />
          <div className="flex flex-1 w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <header className="h-12 flex items-center justify-between border-b px-2 sticky top-16 bg-background/95 backdrop-blur z-40 gap-3">
                <div className="flex items-center min-w-0">
                  <SidebarTrigger />
                  <span className="ml-3 text-sm font-semibold tracking-tight">AutoBlog</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">PRO</span>
                </div>
                {user && (
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
                )}
              </header>
              <main className="flex-1 container max-w-5xl py-6 px-3 md:px-6">
                <Outlet />
              </main>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </RequireAuth>
  );
}
