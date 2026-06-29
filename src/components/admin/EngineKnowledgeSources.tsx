import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Trash2, ExternalLink, Plus, BookOpen } from "lucide-react";
import { adminInvoke } from "@/pages/admin/_lib";
import { useToast } from "@/hooks/use-toast";

type Source = {
  id: string;
  label: string;
  url: string;
  category: string;
  notes: string | null;
  active: boolean;
  fetch_count: number;
  last_fetched_at: string | null;
  last_summary: string | null;
  last_error: string | null;
};

export default function EngineKnowledgeSources() {
  const { toast } = useToast();
  const [items, setItems] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", url: "", category: "geo", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminInvoke<{ items: Source[] }>("listEngineKnowledgeSources");
    setItems(res?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.label.trim() || !form.url.trim()) {
      toast({ title: "라벨과 URL은 필수", variant: "destructive" });
      return;
    }
    const r = await adminInvoke<{ id?: string; error?: string }>("addEngineKnowledgeSource", form);
    if (r?.id) {
      toast({ title: "추가됨" });
      setForm({ label: "", url: "", category: "geo", notes: "" });
      load();
    } else {
      toast({ title: "추가 실패", description: r?.error || "오류", variant: "destructive" });
    }
  };

  const toggle = async (s: Source) => {
    await adminInvoke("toggleEngineKnowledgeSource", { sourceId: s.id, active: !s.active });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await adminInvoke("deleteEngineKnowledgeSource", { sourceId: id });
    load();
  };

  const runOne = async (id?: string) => {
    setRunning(id ?? "all");
    const r = await adminInvoke<{ processed?: number; error?: string }>("runEngineKnowledgeFetch", { sourceId: id });
    setRunning(null);
    if (r?.processed !== undefined) {
      toast({ title: `스크랩 완료 (${r.processed}건)` });
      load();
    } else {
      toast({ title: "실행 실패", description: r?.error || "오류", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <CardTitle className="text-base">엔진 지식 소스 (외부 레퍼런스 URL)</CardTitle>
        </div>
        <Button size="sm" variant="outline" onClick={() => runOne()} disabled={running !== null}>
          {running === "all" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          전체 지금 스크랩
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          매일 07:10 KST 자동 수집 · 등록된 URL은 엔진 업데이트 시 큐레이트 레퍼런스로 자동 주입됩니다.
        </p>

        {/* Add form */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_120px_auto] gap-2">
          <Input placeholder="라벨 (예: WePick GEO 가이드)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <Input placeholder="카테고리" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Button size="sm" onClick={add}><Plus className="w-3 h-3 mr-1" />추가</Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">로딩…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">등록된 소스가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {items.map((s) => (
              <div key={s.id} className="border border-border rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <Switch checked={s.active} onCheckedChange={() => toggle(s)} />
                    <span className="font-medium truncate">{s.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{s.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => runOne(s.id)} disabled={running !== null}>
                      {running === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    </Button>
                    <a href={s.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-muted rounded">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">{s.url}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>가져온 횟수: {s.fetch_count}</span>
                  <span>마지막: {s.last_fetched_at ? new Date(s.last_fetched_at).toLocaleString("ko-KR") : "—"}</span>
                </div>
                {s.last_error && <p className="text-[11px] text-destructive">⚠ {s.last_error}</p>}
                {s.last_summary && (
                  <p className="text-[11px] text-muted-foreground line-clamp-3 border-l-2 border-muted pl-2 mt-1">
                    {s.last_summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
