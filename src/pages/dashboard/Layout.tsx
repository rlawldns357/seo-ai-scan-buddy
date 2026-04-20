import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/features/publish/AppSidebar";
import Navbar from "@/components/Navbar";
import RequireAuth from "@/features/auth/RequireAuth";

export default function DashboardLayout() {
  return (
    <RequireAuth>
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <Navbar />
        <div className="flex flex-1 w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-12 flex items-center border-b px-2 sticky top-16 bg-background/95 backdrop-blur z-40">
              <SidebarTrigger />
              <span className="ml-3 text-sm font-medium text-muted-foreground">Auto Publish</span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">PRO</span>
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
