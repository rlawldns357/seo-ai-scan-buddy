import { useEffect, useState } from "react";
import { ExternalLink, Sparkles, Crown, Zap, Shield, Star } from "lucide-react";
import { useUserSite } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import { useUserTier, type AppRole } from "@/features/auth/useUserTier";
import { supabase } from "@/integrations/supabase/client";

const TIER_META: Record<AppRole, { label: string; icon: typeof Sparkles; className: string }> = {
  free: { label: "Free", icon: Star, className: "bg-muted text-muted-foreground" },
  beta: { label: "Beta", icon: Sparkles, className: "bg-primary/10 text-primary ring-1 ring-primary/30" },
  lite: { label: "Lite", icon: Zap, className: "bg-accent/10 text-accent ring-1 ring-accent/30" },
  pro: { label: "Pro", icon: Sparkles, className: "bg-primary text-primary-foreground" },
  studio: { label: "Studio", icon: Crown, className: "bg-foreground text-background" },
  admin: { label: "Admin", icon: Shield, className: "bg-score-warning/10 text-score-warning ring-1 ring-score-warning/30" },
};

type Kpi = { queued: number; publishedToday: number; totalViews: number; weeklyVisitors: number };

/**
 * Top-of-page workspace identity header for /dashboard.
 * Single source of truth for: site identity, tier badge, KPI snapshot.
 * Replaces the old duplicate "site row + DashboardHero(ready) + KPI card".
 */
export default function WorkspaceHeader() {
  const { site } = useUserSite();
  const { user } = useAuth();
  const { tier } = useUserTier();
  const [kpi, setKpi] = useState<Kpi>({ queued: 0, publishedToday: 0, totalViews: 0, weeklyVisitors: 0 });

  useEffect(() => {
    if (!site) return;
    let cancelled = false;
    (async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const { data: posts } = await (supabase as any)
        .from("site_posts")
        .select("id, status, published_at, view_count")
        .eq("site_id", site.id);

      if (cancelled || !posts) return;

      const queued = posts.filter((p: any) => p.status === "scheduled").length;
      const published = posts.filter((p: any) => p.status === "published");
      const publishedToday = published.filter(
        (p: any) => p.published_at && new Date(p.published_at).getTime() >= todayStart.getTime(),
      ).length;
      const totalViews = published.reduce((s: number, p: any) => s + (p.view_count ?? 0), 0);

      const publishedIds = published.map((p: any) => p.id);
      let weeklyVisitors = 0;
      if (publishedIds.length) {
        const { data: views } = await (supabase as any)
          .from("site_post_views")
          .select("session_id, created_at")
          .in("post_id", publishedIds)
          .gte("created_at", weekAgo.toISOString());
        weeklyVisitors = new Set((views ?? []).map((v: any) => v.session_id)).size;
      }

      if (!cancelled) setKpi({ queued, publishedToday, totalViews, weeklyVisitors });
    })();
    return () => { cancelled = true; };
  }, [site]);

  if (!site || !user) return null;

  const tierMeta = TIER_META[tier];
  const TierIcon = tierMeta.icon;

  const kpis = [
    { label: "발행 대기", value: kpi.queued },
    { label: "오늘 발행", value: kpi.publishedToday },
    { label: "총 조회", value: kpi.totalViews },
    { label: "주간 방문", value: kpi.weeklyVisitors },
  ];

  return (
    <div className="mb-6 pb-5 border-b border-border/60">
      {/* Identity row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-base font-bold">
            {(site.title?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-foreground tracking-tight truncate">
                {site.title}
              </h1>
              <span className={`inline-flex items-center gap-1 rounded-full text-[10px] font-bold px-2 py-0.5 ${tierMeta.className}`}>
                <TierIcon className="w-3 h-3" /> {tierMeta.label}
              </span>
            </div>
            <a
              href={site.site_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition truncate"
            >
              {site.site_url.replace(/^https?:\/\//, "")} <ExternalLink className="w-3 h-3" />
              <span className="ml-2 text-muted-foreground/70">· {user.email}</span>
            </a>
          </div>
        </div>

        <a
          href={`/sites/${site.site_slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background text-foreground text-xs font-semibold px-3.5 py-2 hover:bg-muted transition shrink-0"
        >
          콘텐츠 허브 열기 <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* KPI snapshot — flat row, no card chrome */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-baseline justify-between sm:flex-col sm:items-start sm:gap-0.5">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
