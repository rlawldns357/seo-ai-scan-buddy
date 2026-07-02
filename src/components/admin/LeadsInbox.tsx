import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, Inbox, Copy, ExternalLink } from "lucide-react";

interface Lead {
  id: string;
  email: string;
  source: string;
  stage: string;
  analyzed_url: string | null;
  landing_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  seo_score: number | null;
  aeo_score: number | null;
  geo_score: number | null;
  funnel_day_sent: number | null;
  tripwire_purchased_at: string | null;
  admin_notify_sent_at: string | null;
  notes: string | null;
  created_at: string;
}

const STAGES = [
  { key: "all", label: "전체" },
  { key: "new", label: "신규" },
  { key: "nurturing", label: "육성중" },
  { key: "tripwire", label: "트립와이어" },
  { key: "closed", label: "클로징" },
  { key: "cold", label: "냉각" },
] as const;

const stageBadge = (s: string) => {
  const map: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    nurturing: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    tripwire: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    closed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    cold: "bg-muted text-muted-foreground border-border",
  };
  return map[s] || map.new;
};

export default function LeadsInbox() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [stage, setStage] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const fetchLeads = async () => {
    const pw = sessionStorage.getItem("admin_pw") || "";
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("admin-insights", {
        body: { password: pw, action: "listLeads", stage, source, limit: 300 },
      });
      if (data?.leads) {
        setLeads(data.leads);
        setCounts(data.stageCounts || {});
        setTotal(data.total || 0);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); /* eslint-disable-next-line */ }, [stage, source]);

  const setStageFor = async (id: string, newStage: string) => {
    const pw = sessionStorage.getItem("admin_pw") || "";
    await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "updateLeadStage", leadId: id, stage: newStage },
    });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: newStage } : l)));
  };

  const exportCsv = () => {
    const headers = ["created_at","email","source","stage","seo","aeo","geo","analyzed_url","landing_url","utm_source","utm_medium","utm_campaign","funnel_day","notes"];
    const rows = leads.map((l) => [
      l.created_at, l.email, l.source, l.stage,
      l.seo_score ?? "", l.aeo_score ?? "", l.geo_score ?? "",
      l.analyzed_url ?? "", l.landing_url ?? "",
      l.utm_source ?? "", l.utm_medium ?? "", l.utm_campaign ?? "",
      l.funnel_day_sent ?? "", (l.notes || "").replace(/[\r\n,]/g, " "),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sources = Array.from(new Set(leads.map((l) => l.source))).slice(0, 20);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Inbox className="w-4 h-4 text-primary" />
          리드 인박스
          <span className="text-xs text-muted-foreground font-normal">총 {total.toLocaleString()}건</span>
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5 mr-1" />CSV</Button>
          <Button size="sm" variant="outline" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />새로고침
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stage tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                stage === s.key ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
              }`}
            >
              {s.label}{s.key !== "all" && counts[s.key] ? ` (${counts[s.key]})` : ""}
            </button>
          ))}
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="ml-2 text-xs bg-background border border-border rounded-md px-2 py-1"
          >
            <option value="all">모든 소스</option>
            {sources.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[560px] overflow-y-auto">
          {leads.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">리드가 없습니다.</p>
          )}
          {leads.map((l) => (
            <div key={l.id} className="border border-border rounded-lg p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigator.clipboard?.writeText(l.email)}
                      className="text-sm font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                      title="이메일 복사"
                    >
                      {l.email}<Copy className="w-3 h-3 opacity-40" />
                    </button>
                    <Badge variant="outline" className={`text-[10px] ${stageBadge(l.stage)}`}>{l.stage}</Badge>
                    <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">{l.source}</span>
                    {l.funnel_day_sent ? (
                      <span className="text-[10px] text-muted-foreground">Day {l.funnel_day_sent}/5</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {(l.seo_score !== null || l.aeo_score !== null || l.geo_score !== null) && (
                      <span>S {l.seo_score ?? "-"} · A {l.aeo_score ?? "-"} · G {l.geo_score ?? "-"}</span>
                    )}
                    {(l.utm_source || l.utm_medium) && (
                      <span>UTM: {[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(" / ")}</span>
                    )}
                    <span>{new Date(l.created_at).toLocaleString("ko-KR")}</span>
                  </div>
                  {l.analyzed_url && (
                    <a href={l.analyzed_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-1 truncate max-w-full">
                      <ExternalLink className="w-3 h-3" />{l.analyzed_url}
                    </a>
                  )}
                </div>
                <select
                  value={l.stage}
                  onChange={(e) => setStageFor(l.id, e.target.value)}
                  className="text-xs bg-background border border-border rounded-md px-2 py-1 shrink-0"
                >
                  {STAGES.filter((s) => s.key !== "all").map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
