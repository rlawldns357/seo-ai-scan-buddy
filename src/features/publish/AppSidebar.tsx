import { LayoutDashboard, Lightbulb, FileText, Send, BarChart3, ExternalLink, LogOut, Home } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useUserSite } from "./useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import SiteSwitcher from "./SiteSwitcher";

type NavItem = { title: string; url: string; icon: typeof Home; end?: boolean };

const overviewItems: NavItem[] = [
  { title: "대시보드", url: "/dashboard", icon: LayoutDashboard, end: true },
];

const workflowItems: NavItem[] = [
  { title: "콘텐츠 추천", url: "/dashboard/recommendations", icon: Lightbulb },
  { title: "글 작성", url: "/dashboard/content", icon: FileText },
  { title: "자동 발행 큐", url: "/dashboard/auto-publish", icon: Send },
];

const analyticsItems: NavItem[] = [
  { title: "리포트", url: "/dashboard/reports", icon: BarChart3 },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { site } = useUserSite();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const renderItem = (item: NavItem) => {
    const active = item.end ? location.pathname === item.url : location.pathname.startsWith(item.url);
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={active}>
          <NavLink to={item.url} end={item.end}>
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-28">
        <SiteSwitcher />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{overviewItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>콘텐츠 운영</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{workflowItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>성과 분석</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{analyticsItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {site && !collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>라이브 보기</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to={`/sites/${site.site_slug}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                      <span className="truncate">{site.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {user && !collapsed && (
          <div className="px-2 pb-1 space-y-0.5">
            <div className="text-[11px] text-foreground truncate" title={user.email ?? ""}>{user.email}</div>
            {site && <div className="text-[10px] text-muted-foreground truncate">로그인됨 · {site.title}</div>}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/">
                <Home className="h-4 w-4" />
                {!collapsed && <span>랜딩 보기</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>로그아웃</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
