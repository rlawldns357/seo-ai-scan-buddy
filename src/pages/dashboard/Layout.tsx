import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/features/publish/AppSidebar";
import Navbar from "@/components/Navbar";
import RequireAuth from "@/features/auth/RequireAuth";
import { useAuth } from "@/features/auth/useAuth";
import { useUserSite } from "@/features/publish/useUserSite";
import { LogOut } from "lucide-react";

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const { site } = useUserSite();
  const location = useLocation();
  const isRoot = location.pathname === "/dashboard" || location.pathname === "/dashboard/";

  if (isRoot && !user && !loading) {
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
                  <span className="ml-3 text-sm font-medium text-muted-foreground">AutoBlog</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">PRO</span>
                </div>
                {user && (
                  <div className="hidden md:flex items-center gap-2 min-w-0 rounded-full border border-border/50 bg-card px-3 py-1.5 text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <span className="text-foreground font-medium truncate max-w-[180px]">{user.email}</span>
                    {site && <span className="text-muted-foreground truncate max-w-[140px]">· {site.title}</span>}
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
