import { Lightbulb, FileText, Send, BarChart3, Home, ExternalLink } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useUserSite } from "./useUserSite";

const items = [
  { title: "홈", url: "/dashboard", icon: Home, end: true },
  { title: "콘텐츠 추천", url: "/dashboard/recommendations", icon: Lightbulb },
  { title: "글 작성", url: "/dashboard/content", icon: FileText },
  { title: "자동 발행", url: "/dashboard/auto-publish", icon: Send },
  { title: "리포트", url: "/dashboard/reports", icon: BarChart3 },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { site } = useUserSite();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Auto Publish</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.end
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url);
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {site && !collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>내 사이트</SidebarGroupLabel>
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
    </Sidebar>
  );
}
