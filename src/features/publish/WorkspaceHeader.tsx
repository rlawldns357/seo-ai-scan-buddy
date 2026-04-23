import { ExternalLink } from "lucide-react";
import { useUserSite } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";

/**
 * Top-of-page workspace identity header for /dashboard.
 * Flat, single-row layout — sits above the numbered section stack
 * to act as the highest-level anchor for the user's site/account.
 */
export default function WorkspaceHeader() {
  const { site } = useUserSite();
  const { user } = useAuth();

  if (!site || !user) return null;

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap pb-5 mb-2 border-b border-border/60">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-base font-bold">
          {(site.title?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-foreground tracking-tight truncate">
              {site.title}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-score-excellent/10 text-score-excellent text-[10px] font-semibold px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-score-excellent animate-pulse" /> 운영중
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
  );
}
