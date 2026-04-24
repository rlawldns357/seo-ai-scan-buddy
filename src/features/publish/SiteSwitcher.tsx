import { useState } from "react";
import { Check, ChevronsUpDown, Globe, Plus, Lock } from "lucide-react";
import { useUserSites } from "./useUserSite";
import AddSiteModal from "./AddSiteModal";
import { useSidebar } from "@/components/ui/sidebar";

const FREE_SITE_LIMIT = 1;

export default function SiteSwitcher() {
  const { sites, activeSite, setActiveSiteId } = useUserSites();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const locked = sites.length >= FREE_SITE_LIMIT;

  if (collapsed) {
    return (
      <div className="px-2 pt-2">
        <button
          onClick={() => setAddOpen(true)}
          className="w-full flex items-center justify-center h-8 rounded-md bg-sidebar-accent hover:bg-sidebar-accent/80 transition"
          aria-label="사이트 추가"
        >
          <Globe className="h-4 w-4 text-sidebar-accent-foreground" />
        </button>
        <AddSiteModal open={addOpen} onOpenChange={setAddOpen} />
      </div>
    );
  }

  return (
    <div className="px-2 pt-2 pb-1 relative">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent transition text-left"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Globe className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">현재 사이트</div>
            <div className="text-xs font-semibold text-sidebar-foreground truncate mt-0.5">
              {activeSite?.title ?? "사이트 없음"}
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
        <button
          onClick={() => setAddOpen(true)}
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent transition"
          aria-label="새 사이트 추가"
          title={locked ? "추가 사이트는 PRO 플랜 필요" : "새 사이트 추가"}
        >
          {locked ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Plus className="h-4 w-4 text-primary" />
          )}
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute left-2 right-2 mt-1 z-[61] rounded-lg border border-sidebar-border bg-popover shadow-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto py-1">
              {sites.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">등록된 사이트가 없습니다</div>
              )}
              {sites.map((s) => {
                const active = s.id === activeSite?.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveSiteId(s.id);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition text-left"
                  >
                    <div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Globe className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{s.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{s.site_url}</div>
                    </div>
                    {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setAddOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs border-t border-sidebar-border hover:bg-accent transition text-left"
            >
              {locked ? (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="font-medium text-foreground">새 사이트 추가</span>
              {locked && (
                <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">PRO</span>
              )}
            </button>
          </div>
        </>
      )}

      <AddSiteModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
