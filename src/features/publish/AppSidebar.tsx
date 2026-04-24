import {
  LayoutDashboard,
  Lightbulb,
  KanbanSquare,
  BarChart3,
  ExternalLink,
  LogOut,
  Home,
  Clapperboard,
  Archive,
  Sparkles,
  Crown,
  ShoppingBag,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserSite } from "./useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import { useUserTier, type AppRole } from "@/features/auth/useUserTier";
import SiteSwitcher from "./SiteSwitcher";
import { cn } from "@/lib/utils";

type Tone = "primary" | "warning" | "accent" | "neutral" | "success";
type RouteSection = {
  title: string;
  url: string;
  index: number;
  icon: LucideIcon;
  tone: Tone;
  end?: boolean;
};
type RouteItem = { title: string; url: string; icon: LucideIcon; end?: boolean };

/** OnePage 의 SectionShell 톤과 1:1 매칭 — 색만 사이드바 컨텍스트에 맞게 정리 */
const TONE: Record<Tone, { dot: string; text: string; badgeBg: string; activeBg: string }> = {
  primary: {
    dot: "bg-primary",
    text: "text-primary",
    badgeBg: "bg-primary/10 text-primary ring-1 ring-primary/20",
    activeBg: "bg-primary/8",
  },
  warning: {
    dot: "bg-score-warning",
    text: "text-score-warning",
    badgeBg: "bg-score-warning/10 text-score-warning ring-1 ring-score-warning/20",
    activeBg: "bg-score-warning/8",
  },
  accent: {
    dot: "bg-accent",
    text: "text-accent",
    badgeBg: "bg-accent/10 text-accent ring-1 ring-accent/20",
    activeBg: "bg-accent/8",
  },
  neutral: {
    dot: "bg-muted-foreground/60",
    text: "text-muted-foreground",
    badgeBg: "bg-muted text-muted-foreground ring-1 ring-border",
    activeBg: "bg-muted/60",
  },
  success: {
    dot: "bg-score-excellent",
    text: "text-score-excellent",
    badgeBg: "bg-score-excellent/10 text-score-excellent ring-1 ring-score-excellent/20",
    activeBg: "bg-score-excellent/8",
  },
};

const overviewItems: RouteSection[] = [
  { title: "대시보드", url: "/dashboard", index: 1, icon: LayoutDashboard, tone: "primary", end: true },
];

const workflowItems: RouteSection[] = [
  { title: "콘텐츠 추천", url: "/dashboard/recommendations", index: 2, icon: Lightbulb, tone: "warning" },
  { title: "워크플로우", url: "/dashboard/workflow", index: 3, icon: KanbanSquare, tone: "accent" },
  { title: "제품 카탈로그", url: "/dashboard/products", index: 4, icon: ShoppingBag, tone: "primary" },
  { title: "발행 아카이브", url: "/dashboard/archive", index: 5, icon: Archive, tone: "neutral" },
];

const analyticsItems: RouteSection[] = [
  { title: "성과 리포트", url: "/dashboard/reports", index: 6, icon: BarChart3, tone: "success" },
];

const internalItems: RouteItem[] = [
  { title: "라이브 데모", url: "/dashboard/demo", icon: Clapperboard },
];

const TIER_LABEL: Record<AppRole, string> = {
  free: "FREE",
  beta: "BETA",
  lite: "LITE",
  pro: "PRO",
  studio: "STUDIO",
  admin: "ADMIN",
};

const TIER_STYLE: Record<AppRole, string> = {
  free: "bg-muted text-muted-foreground",
  beta: "bg-primary/10 text-primary ring-1 ring-primary/20",
  lite: "bg-accent/10 text-accent ring-1 ring-accent/20",
  pro: "bg-gradient-to-r from-primary to-accent text-primary-foreground",
  studio: "bg-gradient-to-r from-accent via-primary to-score-excellent text-primary-foreground",
  admin: "bg-foreground text-background",
};

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { site } = useUserSite();
  const { user, signOut } = useAuth();
  const { tier } = useUserTier();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const renderSection = (item: RouteSection) => {
    const active = item.end
      ? location.pathname === item.url
      : location.pathname === item.url || location.pathname.startsWith(item.url + "/");
    const tone = TONE[item.tone];
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton
          asChild
          isActive={active}
          className={cn("group/sec relative h-9 transition-colors", active && tone.activeBg)}
        >
          <NavLink to={item.url} end={item.end} className="flex items-center gap-2 w-full">
            {active && !collapsed && (
              <span
                className={cn("absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full", tone.dot)}
                aria-hidden
              />
            )}
            {collapsed ? (
              <item.icon className={cn("h-4 w-4", active ? tone.text : "text-muted-foreground")} />
            ) : (
              <>
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-mono font-bold tabular-nums shrink-0 transition",
                    active ? tone.badgeBg : "bg-muted/60 text-muted-foreground/70 group-hover/sec:bg-muted",
                  )}
                >
                  {String(item.index).padStart(2, "0")}
                </span>
                <item.icon
                  className={cn("h-3.5 w-3.5 shrink-0 transition", active ? tone.text : "text-muted-foreground")}
                />
                <span
                  className={cn(
                    "text-[13px] truncate transition",
                    active ? "font-semibold text-foreground" : "text-sidebar-foreground",
                  )}
                >
                  {item.title}
                </span>
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderRoute = (item: RouteItem) => {
    const active = item.end
      ? location.pathname === item.url
      : location.pathname.startsWith(item.url);
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={active} className="h-9">
          <NavLink to={item.url} end={item.end} className="flex items-center gap-2">
            <item.icon className="h-4 w-4 text-muted-foreground" />
            {!collapsed && <span className="text-[13px]">{item.title}</span>}
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
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] font-semibold">
              콘텐츠 운영
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>{workflowItems.map(renderSection)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] font-semibold">
              성과 분석
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>{analyticsItems.map(renderSection)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {tier === "admin" && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] font-semibold">
                관리자 도구
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>{internalItems.map(renderRoute)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {site && !collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] font-semibold">
              블로그 허브
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-9">
                    <NavLink
                      to={`/sites/${site.site_slug}`}
                      target="_blank"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[13px] truncate">{site.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Pro 업그레이드 프롬프트 — Free/Beta/Lite 한정, 접힘 상태 숨김 */}
        {!collapsed && user && (tier === "free" || tier === "beta" || tier === "lite") && (
          <div className="px-2 mt-2">
            <button
              onClick={() => navigate("/autoblog#pricing")}
              className="w-full text-left rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-accent/8 p-3 hover:border-primary/40 transition group"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Upgrade
                </span>
              </div>
              <div className="text-[12px] font-semibold text-foreground leading-tight">
                무제한 재생성 · 사이트 3개
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-foreground transition">
                Pro 플랜 보기 →
              </div>
            </button>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        {user && !collapsed && (
          <div className="px-2 pb-1.5">
            <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/40 px-2 py-1.5">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 text-foreground flex items-center justify-center text-[11px] font-bold shrink-0">
                {(user.email?.[0] ?? "U").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "px-1.5 py-[1px] rounded text-[9px] font-bold tracking-wider shrink-0",
                      TIER_STYLE[tier],
                    )}
                  >
                    {tier === "studio" && <Crown className="inline h-2.5 w-2.5 mr-0.5 -mt-0.5" />}
                    {TIER_LABEL[tier]}
                  </span>
                  {site && (
                    <span className="text-[9px] text-muted-foreground truncate">
                      · {site.title}
                    </span>
                  )}
                </div>
                <div
                  className="text-[10px] text-muted-foreground truncate mt-0.5"
                  title={user.email ?? ""}
                >
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-8">
              <NavLink to="/" className="flex items-center gap-2">
                <Home className="h-3.5 w-3.5 text-muted-foreground" />
                {!collapsed && <span className="text-[12px]">랜딩 보기</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="h-8">
              <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
              {!collapsed && <span className="text-[12px]">로그아웃</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
