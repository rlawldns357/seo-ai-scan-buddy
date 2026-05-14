import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, RefreshCw, Trash2, Brain } from "lucide-react";
import { adminInvoke } from "./_lib";
import { toast } from "@/components/ui/sonner";

interface Action {
  id: string;
  page_url: string;
  target_keyword: string | null;
  action_type: string;
  before_state: any;
  after_state: any;
  result: string;
  ai_judgement: string | null;
  next_action: string | null;
  remeasure_at: string | null;
  created_at: string;
  updated_at: string;
}

const RESULT: Record<string, { label: string; cls: string }> = {
  improved: { label: "개선됨", cls: "bg-score-excellent/15 text-score-excellent" },
  no_change: { label: "변화없음", cls: "bg-muted text-muted-foreground" },
  worse: { label: "악화됨", cls: "bg-destructive/15 text-destructive" },
  waiting: { label: "대기중", cls: "bg-accent/15 text-accent-foreground" },
  unclear: { label: "판단불가", cls: "bg-muted text-muted-foreground" },
};

const ACTION_TYPES = [
  "title 수정", "meta description 수정", "H1 수정", "첫 문단 수정",
  "FAQ 추가", "내부링크 추가", "sitemap/RSS 수정", "색인 요청", "신규 글 필요",
];

export default function AiGrowthLoop() {
  const [items, setItems] = useState<Action[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [judgingId, setJudgingId] = useState<string | null>(null);

  // create form
  const [pageUrl, setPageUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [actionType, setActionType] = useState(ACTION_TYPES[0]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminInvoke<{ items: Action[]; summary: any }>("listSeoActions");
    if (res) { setItems(res.items); setSummary(res.summary); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!pageUrl) { toast.error("페이지 URL 필요"); return; }
    const res = await adminInvoke<{ success: boolean; error?: string }>("createSeoAction", {
      page_url: pageUrl, target_keyword: keyword || null, action_type: actionType,
    });
    if (res?.success) { toast.success("액션 등록됨"); setPageUrl(""); setKeyword(""); load(); }
    else toast.error(res?.error || "실패");
  };

  const judge = async (id: string) => {
    setJudgingId(id);
    const res = await adminInvoke<{ success: boolean; ai_judgement: string }>("aiJudgeAction", { actionId: id });
    if (res?.success) toast.success("AI 판단 완료"); else toast.error("AI 호출 실패");
    setJudgingId(null);
    load();
  };

  const setResult = async (id: string, result: string) => {
    await adminInvoke("updateSeoAction", { actionId: id, result });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("삭제?")) return;
    await adminInvoke("deleteSeoAction", { actionId: id });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6" /> AI 성장 루프</h1>
          <p className="text-sm text-muted-foreground">SEO 수정 액션 ↔ 노출 변화 학습 리포트</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="총 액션" value={summary.total ?? 0} />
        <Kpi label="효과 확인" value={summary.improved ?? 0} tone="good" />
        <Kpi label="효과 미확인" value={summary.unverified ?? 0} tone="warn" />
        <Kpi label="재검토 필요" value={summary.needs_review ?? 0} tone="bad" />
        <Kpi label="평균 개선 일수" value={summary.avg_days_to_improve ?? 0} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">수정 액션 등록</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-[2fr_1fr_180px_auto] gap-2">
          <Input placeholder="https://www.searchtuneos.com/blog/..." value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} />
          <Input placeholder="타겟 키워드" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <select className="border border-border rounded-md px-2 text-sm bg-background" value={actionType} onChange={(e) => setActionType(e.target.value)}>
            {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button onClick={create}>등록</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">액션 로그 ({items.length}건)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="py-2 pr-2">수정일</th>
                  <th className="py-2 pr-2">페이지</th>
                  <th className="py-2 pr-2">키워드</th>
                  <th className="py-2 pr-2">유형</th>
                  <th className="py-2 pr-2">전 → 후</th>
                  <th className="py-2 pr-2">결과</th>
                  <th className="py-2 pr-2 max-w-[280px]">AI 판단</th>
                  <th className="py-2 pr-2">다음 액션</th>
                  <th className="py-2 pr-2 text-right">실행</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">액션 로그 없음 — SEO 모니터에서 "수정 액션 생성" 또는 위에서 등록.</td></tr>
                )}
                {items.map(a => {
                  const r = RESULT[a.result] ?? RESULT.waiting;
                  const before = a.before_state?.rank ?? "—";
                  const after = a.after_state?.rank ?? "—";
                  return (
                    <tr key={a.id} className="border-b last:border-b-0 hover:bg-muted/30 align-top">
                      <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">{new Date(a.created_at).toLocaleDateString("ko-KR")}</td>
                      <td className="py-2 pr-2 max-w-[200px]">
                        <a href={a.page_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">{a.page_url.replace(/^https?:\/\//, "")}</a>
                      </td>
                      <td className="py-2 pr-2">{a.target_keyword || "—"}</td>
                      <td className="py-2 pr-2">{a.action_type}</td>
                      <td className="py-2 pr-2 font-mono">{before} → {after}</td>
                      <td className="py-2 pr-2">
                        <select value={a.result} onChange={(e) => setResult(a.id, e.target.value)} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border-0 ${r.cls}`}>
                          {Object.entries(RESULT).map(([v, x]) => <option key={v} value={v}>{x.label}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-2 max-w-[280px] text-muted-foreground">{a.ai_judgement || <span className="opacity-50">—</span>}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{a.next_action || "—"}</td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={judgingId === a.id} onClick={() => judge(a.id)}>
                            <Brain className="w-3 h-3 mr-1" /> {judgingId === a.id ? "판단 중..." : "AI 재판단"}
                          </Button>
                          <button title="삭제" onClick={() => remove(a.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3 h-3 text-destructive" /></button>
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
