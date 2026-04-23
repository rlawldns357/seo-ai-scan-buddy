import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Archive, ArchiveRestore, ExternalLink, Eye, Calendar, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import SectionCardHeader from "@/features/publish/ui/SectionCardHeader";

type ArchivePost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: "published" | "archived";
  published_at: string | null;
  view_count: number;
  source_axis: string | null;
};

const PAGE_SIZE = 20;

export default function ArchiveSection() {
  const { site } = useUserSite();
  const [posts, setPosts] = useState<ArchivePost[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "published" | "archived">("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    setPage(0);
  }, [tab, q]);

  useEffect(() => {
    if (!site) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("site_posts")
        .select("id,slug,title,excerpt,status,published_at,view_count,source_axis", { count: "exact" })
        .eq("site_id", site.id);
      if (tab === "all") query = query.in("status", ["published", "archived"]);
      else query = query.eq("status", tab);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      query = query.order("published_at", { ascending: false, nullsFirst: false }).range(from, to);
      const { data, error, count } = await query;
      if (cancelled) return;
      if (error) {
        toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
      } else {
        setPosts((data ?? []) as ArchivePost[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [site, tab, page, q]);

  const handleArchive = async (id: string, archive: boolean) => {
    setBusyId(id);
    const { error } = await supabase
      .from("site_posts")
      .update({ status: archive ? "archived" : "published" } as any)
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast({ title: "변경 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: archive ? "보관됨" : "복원됨" });
    setPosts((cur) => cur.map((p) => (p.id === id ? { ...p, status: archive ? "archived" : "published" } : p)));
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  if (!site) return null;

  return (
    <Card id="archive" className="rounded-2xl border-border/60 overflow-hidden scroll-mt-20">
      <SectionCardHeader
        tone="neutral"
        title={
          <span className="inline-flex items-center gap-2">
            <Archive className="w-3.5 h-3.5 text-muted-foreground" /> 발행 아카이브
          </span>
        }
        meta={
          <>
            <span><span className="text-foreground font-semibold">{total}</span> 편</span>
          </>
        }
      />
      <div className="p-3 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border/60 p-0.5 text-xs">
            {(["all", "published", "archived"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-1 rounded-full transition-colors ${
                  tab === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {k === "all" ? "전체" : k === "published" ? "발행됨" : "보관"}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목 검색"
              className="h-8 pl-8 rounded-full text-xs"
            />
          </div>
        </div>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-10">불러오는 중…</div>
      ) : posts.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10 border border-dashed rounded-2xl">
          {q ? "검색 결과가 없어요" : tab === "archived" ? "보관된 글이 없어요" : "아직 발행된 글이 없어요"}
        </div>
      ) : (
        <div className="space-y-1.5">
          {posts.map((p) => (
            <Card key={p.id} className="px-3 py-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  {p.status === "archived" && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      보관
                    </span>
                  )}
                  {p.source_axis && (
                    <span className="text-[9px] font-bold text-muted-foreground tracking-wider">{p.source_axis}</span>
                  )}
                  {p.published_at && (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {new Date(p.published_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                    <Eye className="h-2.5 w-2.5" />
                    {p.view_count}
                  </span>
                </div>
                <h4 className="text-sm font-medium text-foreground truncate">{p.title}</h4>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button asChild size="sm" variant="ghost" className="rounded-full h-7 text-[11px] px-2">
                  <Link to={`/sites/${site.site_slug}/${p.slug}`} target="_blank">
                    <ExternalLink className="w-3 h-3" /> 라이브
                  </Link>
                </Button>
                {p.status === "published" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full h-7 text-[11px] px-2"
                    disabled={busyId === p.id}
                    onClick={() => handleArchive(p.id, true)}
                  >
                    <Archive className="w-3 h-3" /> 보관
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full h-7 text-[11px] px-2"
                    disabled={busyId === p.id}
                    onClick={() => handleArchive(p.id, false)}
                  >
                    <ArchiveRestore className="w-3 h-3" /> 복원
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / 총 {total}편
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full h-7 text-[11px] px-3"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              이전
            </Button>
            <span className="tabular-nums px-1">
              {page + 1} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full h-7 text-[11px] px-3"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      )}
      </div>
    </Card>
  );
}
