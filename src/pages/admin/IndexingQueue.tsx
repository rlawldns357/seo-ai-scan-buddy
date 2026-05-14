import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Inbox, Trash2, RefreshCw, Check, AlertCircle } from "lucide-react";
import { adminInvoke, copyToClipboard } from "./_lib";
import { toast } from "@/components/ui/sonner";

interface Item {
  id: string;
  url: string;
  target_keyword: string | null;
  engine: string;
  reason: string | null;
  priority: number;
  status: string;
  requested_at: string | null;
  verified_at: string | null;
  result: string | null;
  note: string | null;
  created_at: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "대기", cls: "bg-muted text-muted-foreground" },
  requested: { label: "요청 제출 완료", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  verified: { label: "색인 확인 완료", cls: "bg-score-excellent/15 text-score-excellent" },
  re_request: { label: "재요청 필요", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  hold: { label: "보류", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  failed: { label: "실패", cls: "bg-destructive/15 text-destructive" },
};

const ENGINE_LABEL: Record<string, string> = {
  both: "Naver + Google",
  google: "Google",
  naver: "Naver",
};

const SITE_ORIGIN = "https://searchtuneos.com";
function toAbsoluteUrl(u: string): string {
  if (!u) return "";
  const t = u.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return SITE_ORIGIN + t;
  return `${SITE_ORIGIN}/${t}`;
}
function pathOf(u: string): string {
  const abs = toAbsoluteUrl(u);
  try { const url = new URL(abs); return url.pathname + url.search + url.hash || "/"; } catch { return abs; }
}

const NAVER_CONSOLE = "https://searchadvisor.naver.com/console/board/request";
const GOOGLE_CONSOLE = "https://search.google.com/search-console";

export default function IndexingQueue() {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // add form
  const [newUrl, setNewUrl] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newEngine, setNewEngine] = useState("both");
  const [newReason, setNewReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminInvoke<{ items: Item[]; summary: any }>("listIndexingQueue");
    if (res) { setItems(res.items); setSummary(res.summary); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newUrl) { toast.error("URL 입력 필요"); return; }
    const res = await adminInvoke<{ success: boolean; error?: string }>("addIndexingItem", {
      url: newUrl, target_keyword: newKeyword || null, engine: newEngine, reason: newReason || null, priority: 5,
    });
    if (res?.success) { toast.success("추가됨"); setNewUrl(""); setNewKeyword(""); setNewReason(""); load(); }
    else toast.error(res?.error || "실패");
  };

  const update = async (id: string, status: string) => {
    await adminInvoke("updateIndexingStatus", { itemId: id, status });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await adminInvoke("deleteIndexingItem", { itemId: id });
    load();
  };

  const filtered = items.filter(i => filter === "all" || i.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="w-6 h-6" /> 색인 요청 큐</h1>
          <p className="text-sm text-muted-foreground">네이버 서치어드바이저 + 구글 서치 콘솔에 수동 제출할 URL 작업대</p>
        </div>
        <div className="flex gap-2">
          <a href={NAVER_CONSOLE} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">네이버 콘솔 <ExternalLink className="w-3 h-3 ml-1" /></Button>
          </a>
          <a href={GOOGLE_CONSOLE} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">구글 콘솔 <ExternalLink className="w-3 h-3 ml-1" /></Button>
          </a>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <Kpi label="오늘 후보" value={summary.today_candidates ?? 0} />
        <Kpi label="대기" value={items.filter(i => i.status === "pending").length} />
        <Kpi label="요청 제출 완료" value={summary.requested ?? 0} tone="good" />
        <Kpi label="색인 확인 완료" value={summary.verified ?? 0} tone="good" />
        <Kpi label="재요청 필요" value={summary.re_request ?? 0} tone="warn" />
        <Kpi label="보류" value={summary.hold ?? 0} tone="warn" />
        <Kpi label="실패" value={items.filter(i => i.status === "failed").length} tone="bad" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">URL 직접 추가</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-[2fr_1fr_140px_1fr_auto] gap-2">
          <Input placeholder="https://searchtuneos.com/... (상대경로 입력 시 자동으로 절대 URL 변환)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          <Input placeholder="타겟 키워드" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
          <select className="border border-border rounded-md px-2 text-sm bg-background" value={newEngine} onChange={(e) => setNewEngine(e.target.value)}>
            <option value="both">{ENGINE_LABEL.both}</option>
            <option value="naver">{ENGINE_LABEL.naver}</option>
            <option value="google">{ENGINE_LABEL.google}</option>
          </select>
          <Input placeholder="요청 사유" value={newReason} onChange={(e) => setNewReason(e.target.value)} />
          <Button onClick={add}>추가</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">큐 ({filtered.length}건)</CardTitle>
            <div className="flex gap-1 text-xs flex-wrap">
              {(["all", "pending", "requested", "verified", "re_request", "hold", "failed"] as const).map(s => {
                const cnt = s === "all" ? items.length : items.filter(i => i.status === s).length;
                return (
                  <button key={s} onClick={() => setFilter(s)} className={`px-2 py-1 rounded ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                    {s === "all" ? "전체" : STATUS[s]?.label ?? s} <span className="opacity-70">{cnt}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> 네이버는 URL 한 개씩 수동 제출 — <strong>전체 URL 복사</strong> 후 콘솔 새 창에 붙여넣기.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="py-2 pr-2 text-center">우선</th>
                  <th className="py-2 pr-2">경로 / URL</th>
                  <th className="py-2 pr-2">키워드</th>
                  <th className="py-2 pr-2">엔진</th>
                  <th className="py-2 pr-2">사유</th>
                  <th className="py-2 pr-2">상태</th>
                  <th className="py-2 pr-2">요청일</th>
                  <th className="py-2 pr-2">확인일</th>
                  <th className="py-2 pr-2">메모</th>
                  <th className="py-2 pr-2 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">큐가 비어있습니다 — SEO 모니터에서 미노출 키워드를 추가하세요.</td></tr>
                )}
                {filtered.map(it => {
                  const st = STATUS[it.status] ?? STATUS.pending;
                  const fullUrl = toAbsoluteUrl(it.url);
                  const path = pathOf(it.url);
                  return (
                    <tr key={it.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="py-2 pr-2 text-center font-mono">{it.priority}</td>
                      <td className="py-2 pr-2 max-w-[260px]">
                        <a href={fullUrl} target="_blank" rel="noreferrer" title={fullUrl} className="text-primary hover:underline truncate block font-mono">{path}</a>
                        <span className="text-[10px] text-muted-foreground truncate block" title={fullUrl}>{fullUrl}</span>
                      </td>
                      <td className="py-2 pr-2">{it.target_keyword || "—"}</td>
                      <td className="py-2 pr-2 whitespace-nowrap">{ENGINE_LABEL[it.engine] ?? it.engine}</td>
                      <td className="py-2 pr-2 max-w-[160px] text-muted-foreground truncate" title={it.reason || ""}>{it.reason || "—"}</td>
                      <td className="py-2 pr-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${st.cls}`}>{st.label}</span></td>
                      <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">{it.requested_at ? new Date(it.requested_at).toLocaleDateString("ko-KR") : "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">{it.verified_at ? new Date(it.verified_at).toLocaleDateString("ko-KR") : "—"}</td>
                      <td className="py-2 pr-2 max-w-[140px] truncate text-muted-foreground" title={it.note || ""}>{it.note || "—"}</td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-1 justify-end items-center">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs px-2"
                            title={`전체 URL 복사: ${fullUrl}`}
                            aria-label="전체 URL 복사"
                            onClick={() => { copyToClipboard(fullUrl); toast.success(`전체 URL 복사됨: ${fullUrl}`); }}
                          >
                            <Copy className="w-3 h-3 mr-1" /> 전체 URL 복사
                          </Button>
                          <IconBtn title="요청 제출 완료 처리" aria-label="요청 제출 완료 처리" onClick={() => update(it.id, "requested")}><Check className="w-3 h-3" /></IconBtn>
                          <IconBtn title="색인 확인 완료 처리" aria-label="색인 확인 완료 처리" onClick={() => update(it.id, "verified")}><Check className="w-3 h-3 text-score-excellent" /></IconBtn>
                          <IconBtn title="재요청 필요로 표시" aria-label="재요청 필요로 표시" onClick={() => update(it.id, "re_request")}><RefreshCw className="w-3 h-3" /></IconBtn>
                          <IconBtn title="보류 처리" aria-label="보류 처리" onClick={() => update(it.id, "hold")}>
                            <span className="text-[11px] leading-none">⏸ 보류</span>
                          </IconBtn>
                          <IconBtn title="삭제" aria-label="삭제" onClick={() => remove(it.id)}><Trash2 className="w-3 h-3 text-destructive" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" | "warn" }) {
  const cls = tone === "good" ? "text-score-excellent" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-accent" : "text-foreground";
  return (
    <Card><CardContent className="pt-4 pb-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button title={title} onClick={onClick} className="p-1.5 rounded hover:bg-muted text-xs">{children}</button>;
}
