import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminInvoke } from "@/pages/admin/_lib";

interface Automation {
  jobid: number;
  jobname: string;
  label: string;
  category: string;
  description: string;
  schedule: string;
  active: boolean;
  triggerable: boolean;
  last_start: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  success_24h: number;
  fail_24h: number;
}

function fmtSchedule(s: string): string {
  // KST hint for common patterns (cron is UTC)
  const trimmed = s.trim();
  if (trimmed === "*/5 * * * *") return "5분마다";
  if (trimmed === "5 seconds") return "5초마다";
  const m = trimmed.match(/^(\d+)\s+(\d+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)$/);
  if (m) {
    const [, min, hourUtc, dom, mon, dow] = m;
    if (/^\d+$/.test(hourUtc)) {
      const hk = (Number(hourUtc) + 9) % 24;
      const time = `${String(hk).padStart(2, "0")}:${min.padStart(2, "0")} KST`;
      if (dom === "*" && mon === "*" && dow === "*") return `매일 ${time}`;
      if (mon === "*" && dow === "*") return `매월 ${dom}일 ${time}`;
    }
  }
  return s;
}

function fmtAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function AutomationsPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminInvoke<{ items: Automation[] }>("listAutomations");
    if (res?.items) setItems(res.items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const trigger = async (job: Automation) => {
    if (!job.triggerable) return;
    setRunning(job.jobname);
    const res = await adminInvoke<{ success: boolean; function: string; duration_ms: number; error: string | null }>(
      "triggerAutomation",
      { jobname: job.jobname },
    );
    setRunning(null);
    if (res?.success) {
      toast({ title: "실행 완료", description: `${job.label} · ${Math.round((res.duration_ms ?? 0) / 100) / 10}s` });
      load();
    } else {
      toast({ title: "실행 실패", description: res?.error || "알 수 없는 오류", variant: "destructive" });
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category)));
  const totalActive = items.filter(i => i.active).length;
  const totalFail24h = items.reduce((a, b) => a + b.fail_24h, 0);
  const totalSuccess24h = items.reduce((a, b) => a + b.success_24h, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-base">자동화 (pg_cron) 현황</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            활성 {totalActive}/{items.length} · 최근 24h 성공 {totalSuccess24h} · 실패 <span className={totalFail24h > 0 ? "text-destructive font-semibold" : ""}>{totalFail24h}</span>
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />새로고침
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {items.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground">자동화 데이터를 불러올 수 없습니다. 권한을 확인하세요.</p>
        )}
        {categories.map(cat => (
          <div key={cat}>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{cat}</div>
            <div className="space-y-2">
              {items.filter(i => i.category === cat).map(job => {
                const statusOk = job.last_status === "succeeded";
                const statusFail = job.last_status === "failed";
                return (
                  <div key={job.jobid} className="border border-border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{job.label}</span>
                        {!job.active && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">OFF</span>}
                        {statusOk && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {statusFail && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 break-words">{job.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap font-mono">
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtSchedule(job.schedule)}</span>
                        <span>마지막: {fmtAgo(job.last_start)}{job.last_duration_ms != null ? ` (${Math.round(job.last_duration_ms)}ms)` : ""}</span>
                        <span>24h: <span className="text-emerald-600">{job.success_24h}✓</span> / <span className={job.fail_24h > 0 ? "text-destructive" : ""}>{job.fail_24h}✗</span></span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={job.triggerable ? "secondary" : "ghost"}
                      disabled={!job.triggerable || running === job.jobname}
                      onClick={() => trigger(job)}
                      className="shrink-0"
                    >
                      {running === job.jobname ? (
                        <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />실행 중</>
                      ) : (
                        <><Play className="w-3.5 h-3.5 mr-1" />지금 실행</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
