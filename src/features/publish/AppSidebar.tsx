import { LayoutDashboard, Lightbulb, FileText, Send, BarChart3, ExternalLink, LogOut, Home, Clapperboard, BookOpen } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useUserSite } from "./useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import SiteSwitcher from "./SiteSwitcher";
import { useScrollSpy } from "./useScrollSpy";

type SectionItem = { title: string; section: string; icon: typeof Home };
type RouteItem = { title: string; url: string; icon: typeof Home; end?: boolean };

const SECTION_IDS = ["overview", "recommendations", "content", "queue", "posts", "reports"];

const overviewItems: SectionItem[] = [
  { title: "대시보드", section: "overview", icon: LayoutDashboard },
];

const workflowItems: SectionItem[] = [
  { title: "콘텐츠 추천", section: "recommendations", icon: Lightbulb },
  { title: "글 작성", section: "content", icon: FileText },
  { title: "자동 발행 큐", section: "queue", icon: Send },
  { title: "발행된 글", section: "posts", icon: BookOpen },
];

const analyticsItems: SectionItem[] = [
  { title: "리포트", section: "reports", icon: BarChart3 },
];

const internalItems: RouteItem[] = [
  { title: "라이브 데모", url: "/dashboard/demo", icon: Clapperboard },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { site } = useUserSite();
  const { user, signOut } = useAuth();

  const onDashboardOnePage =
    location.pathname === "/dashboard" || location.pathname === "/dashboard/";
  const activeSection = useScrollSpy(onDashboardOnePage ? SECTION_IDS : []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const handleSectionClick = (e: React.MouseEvent, section: string) => {
    if (onDashboardOnePage) {
      e.preventDefault();
      const el = document.getElementById(section);
      if (el) {
        // 해시도 함께 갱신해 북마크/공유 가능
        window.history.replaceState(null, "", `/dashboard#${section}`);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    // 다른 페이지에 있을 때는 NavLink가 /dashboard#section으로 이동 → ScrollToTop이 처리
  };

  const renderSection = (item: SectionItem) => {
    const active = onDashboardOnePage && activeSection === item.section;
    return (
      <SidebarMenuItem key={item.section}>
        <SidebarMenuButton asChild isActive={active}>
          <NavLink
            to={`/dashboard#${item.section}`}
            onClick={(e) => handleSectionClick(e, item.section)}
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderRoute = (item: RouteItem) => {
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
      <SidebarContent className="pt-[var(--dash-subheader-h,3.75rem)]">
        <SiteSwitcher />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{overviewItems.map(renderSection)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>콘텐츠 운영</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{workflowItems.map(renderSection)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>성과 분석</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{analyticsItems.map(renderSection)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>내부 시연</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{internalItems.map(renderRoute)}</SidebarMenu>
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
