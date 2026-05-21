import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { adminInvoke } from "./_lib";
import { Loader2, Play, RefreshCw } from "lucide-react";

type Site = { id: string; site_slug: string; title: string; site_url: string };
type Settings = {
  site_id: string;
  enabled: boolean;
  weekdays: number[];
  hours_kst: number[];
  daily_limit: number;
  auto_topup: boolean;
  min_queue: number;
  last_run_at: string | null;
};

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const DEFAULT_SETTINGS = (siteId: string): Settings => ({
  site_id: siteId,
  enabled: false,
  weekdays: [1, 2, 3, 4, 5],
  hours_kst: [9],
  daily_limit: 1,
  auto_topup: true,
  min_queue: 5,
  last_run_at: null,
});

export default function Autopublish() {
  const [sites, setSites] = useState<Site[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, Settings>>({});
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  async function load() {
    setLoading(true);
    const res = await adminInvoke<{ sites: Site[]; settings: Record<string, Settings>; queueCounts: Record<string, number> }>("listAutopublishSettings");
    if (res) {
      setSites(res.sites);
      const map: Record<string, Settings> = {};
      for (const s of res.sites) {
        map[s.id] = res.settings[s.id] || DEFAULT_SETTINGS(s.id);
      }
      setSettingsMap(map);
      setQueueCounts(res.queueCounts || {});
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function update(siteId: string, patch: Partial<Settings>) {
    setSettingsMap((m) => ({ ...m, [siteId]: { ...m[siteId], ...patch } }));
  }

  function toggleArr<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort((a: any, b: any) => a - b);
  }

  async function save(siteId: string) {
    setSaving(siteId);
    const s = settingsMap[siteId];
    const res = await adminInvoke<{ success: boolean; error?: string }>("upsertAutopublishSettings", {
      siteId,
      enabled: s.enabled,
      weekdays: s.weekdays,
      hours_kst: s.hours_kst,
      daily_limit: s.daily_limit,
      auto_topup: s.auto_topup,
      min_queue: s.min_queue,
    });
    setSaving(null);
    if (res?.success) toast.success("저장됨");
    else toast.error(res?.error || "저장 실패");
  }

  async function trigger(flushBacklog: boolean) {
    setTriggering(true);
    const res = await adminInvoke<any>("triggerProcessScheduled", { flushBacklog });
    setTriggering(false);
    if (res?.success) {
      toast.success(`발행 ${res.result?.published_count ?? 0}건`);
      load();
    } else toast.error("실행 실패");
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />불러오는 중…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">자동 발행 큐</h1>
          <p className="text-sm text-muted-foreground mt-1">사이트별 KST 요일/시간 슬롯 · 일일 캡 · 자동 보충</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-1" />새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={() => trigger(false)} disabled={triggering}>
            <Play className="w-4 h-4 mr-1" />지금 실행
          </Button>
          <Button size="sm" onClick={() => trigger(true)} disabled={triggering}>
            백로그 일괄 발행
          </Button>
        </div>
      </div>

      {sites.map((site) => {
        const s = settingsMap[site.id];
        if (!s) return null;
        return (
          <Card key={site.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{site.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {site.site_slug} · 큐 {queueCounts[site.id] ?? 0}편
                  {s.last_run_at && ` · 마지막 실행 ${new Date(s.last_run_at).toLocaleString("ko-KR")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`en-${site.id}`} className="text-sm">활성</Label>
                <Switch id={`en-${site.id}`} checked={s.enabled} onCheckedChange={(v) => update(site.id, { enabled: v })} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-sm mb-2 block">요일 (KST)</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant={s.weekdays.includes(i) ? "default" : "outline"}
                      size="sm"
                      className="w-10 h-9 p-0"
                      onClick={() => update(site.id, { weekdays: toggleArr(s.weekdays, i) })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">시간 (KST, 0–23)</Label>
                <div className="grid grid-cols-12 gap-1">
                  {HOURS.map((h) => (
                    <Button
                      key={h}
                      type="button"
                      variant={s.hours_kst.includes(h) ? "default" : "outline"}
                      size="sm"
                      className="h-8 p-0 text-xs"
                      onClick={() => update(site.id, { hours_kst: toggleArr(s.hours_kst, h) })}
                    >
                      {h}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">일일 발행 캡 (1–10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={s.daily_limit}
                    onChange={(e) => update(site.id, { daily_limit: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">최소 큐 (auto-topup 기준)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={s.min_queue}
                    onChange={(e) => update(site.id, { min_queue: Math.max(1, Math.min(50, Number(e.target.value) || 5)) })}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Switch id={`tu-${site.id}`} checked={s.auto_topup} onCheckedChange={(v) => update(site.id, { auto_topup: v })} />
                  <Label htmlFor={`tu-${site.id}`} className="text-sm">큐 자동 보충</Label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => save(site.id)} disabled={saving === site.id}>
                  {saving === site.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  저장
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
