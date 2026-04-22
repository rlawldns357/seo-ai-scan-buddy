import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Play, RotateCcw, Check, Loader2, Send, Zap, FileText, Gauge, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "recommend" | "draft" | "score" | "publish" | "done";
type Topic = { axis: "SEO" | "AEO" | "GEO"; title: string; reason: string };
type Scores = { seo: { score: number; comment: string }; aeo: { score: number; comment: string }; geo: { score: number; comment: string } };

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-stream-content`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const PHASES: { key: Phase; label: string; icon: typeof Lightbulb }[] = [
  { key: "recommend", label: "토픽 추천", icon: Lightbulb },
  { key: "draft", label: "본문 실시간 생성", icon: FileText },
  { key: "score", label: "3축 채점", icon: Gauge },
  { key: "publish", label: "발행 큐 등록", icon: Send },
];

async function streamEndpoint(body: any, onDelta: (s: string) => void): Promise<void> {
  const resp = await fetch(STREAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify(body),
  });
  if (resp.status === 429) throw new Error("AI 사용량 한도에 도달했어요. 잠시 후 다시 시도해 주세요.");
  if (resp.status === 402) throw new Error("AI 크레딧이 소진되었어요. 워크스페이스 결제 페이지를 확인해 주세요.");
  if (!resp.ok || !resp.body) throw new Error("스트리밍 시작 실패");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;
  while (!done) {
    const r = await reader.read();
    if (r.done) break;
    buf += decoder.decode(r.value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
}

function parseTopicsFromBuffer(text: string): Topic[] {
  return text.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    try {
      const o = JSON.parse(l);
      if (o.title && o.axis) return { axis: o.axis, title: o.title, reason: o.reason || "" } as Topic;
    } catch {}
    return null;
  }).filter(Boolean) as Topic[];
}

function ScoreGauge({ label, value, comment, color }: { label: string; value: number; comment: string; color: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setV(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  const r = 36;
  const c = 2 * Math.PI * r;
  const off = c - (v / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
          <circle cx="40" cy="40" r={r} stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.1s linear" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground">{v}</div>
      </div>
      <div className="text-xs font-bold tracking-wide text-foreground">{label}</div>
      <div className="text-[11px] text-muted-foreground text-center leading-tight min-h-[28px]">{comment || "—"}</div>
    </div>
  );
}

export default function Demo() {
  const [siteUrl, setSiteUrl] = useState("https://example.com");
  const [phase, setPhase] = useState<Phase>("idle");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicBuf, setTopicBuf] = useState("");
  const [picked, setPicked] = useState<Topic | null>(null);
  const [draft, setDraft] = useState("");
  const [scores, setScores] = useState<Scores | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const draftRef = useRef<HTMLDivElement>(null);

  const completed = useMemo(() => {
    const order: Phase[] = ["recommend", "draft", "score", "publish"];
    const idx = order.indexOf(phase);
    if (phase === "done") return order;
    return order.slice(0, idx);
  }, [phase]);

  const reset = () => {
    setPhase("idle"); setTopics([]); setTopicBuf(""); setPicked(null);
    setDraft(""); setScores(null); setQueueId(null); setRunning(false);
  };

  const runFullDemo = async () => {
    if (!siteUrl.trim()) { toast({ title: "사이트 URL을 입력해 주세요" }); return; }
    reset();
    setRunning(true);
    try {
      // 1) Recommend
      setPhase("recommend");
      let buf = "";
      await streamEndpoint({ mode: "recommend", siteUrl }, (chunk) => {
        buf += chunk;
        setTopicBuf(buf);
        setTopics(parseTopicsFromBuffer(buf));
      });
      const finalTopics = parseTopicsFromBuffer(buf);
      if (finalTopics.length === 0) throw new Error("토픽 추천 실패");
      setTopics(finalTopics);
      // Pick first non-SEO axis with lowest implied priority — just pick first
      const chosen = finalTopics[0];
      setPicked(chosen);
      await new Promise(r => setTimeout(r, 600));

      // 2) Draft streaming
      setPhase("draft");
      let bodyBuf = "";
      await streamEndpoint({ mode: "draft", siteUrl, topic: chosen.title, axis: chosen.axis }, (chunk) => {
        bodyBuf += chunk;
        setDraft(bodyBuf);
        if (draftRef.current) draftRef.current.scrollTop = draftRef.current.scrollHeight;
      });
      if (!bodyBuf.trim()) throw new Error("본문 생성 실패");

      // 3) Score
      setPhase("score");
      const r = await fetch(STREAM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ mode: "score", draft: bodyBuf }),
      });
      if (!r.ok) throw new Error("채점 실패");
      const sc = (await r.json()) as Scores;
      setScores(sc);
      await new Promise(res => setTimeout(res, 1100));

      // 4) Publish queue (simulated, no DB)
      setPhase("publish");
      await new Promise(res => setTimeout(res, 700));
      setQueueId(`demo-${Date.now().toString(36)}`);
      setPhase("done");
    } catch (e: any) {
      toast({ title: "데모 실패", description: e?.message || "오류", variant: "destructive" });
      setPhase("idle");
    } finally {
      setRunning(false);
    }
  };

  const axisColor = (a: string) =>
    a === "SEO" ? "hsl(var(--primary))" : a === "AEO" ? "hsl(217 91% 60%)" : "hsl(280 70% 60%)";

  return (
    <>
      <Helmet><title>AutoBlog 라이브 데모 | 내부 시연용</title></Helmet>

      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold mb-2">
            <Zap className="w-3 h-3" /> INTERNAL DEMO · 데이터 저장 안 됨
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">AutoBlog 라이브 시연</h1>
          <p className="text-sm text-muted-foreground">URL 1개로 추천→실시간 본문 생성→3축 채점→발행 큐 등록까지 전 과정을 한 번에 보여줍니다.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={reset} disabled={running}>
          <RotateCcw className="w-3.5 h-3.5" /> 초기화
        </Button>
      </div>

      {/* Control */}
      <Card className="p-5 mb-4">
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <Label htmlFor="demo-url">사이트 URL</Label>
            <Input id="demo-url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://example.com" disabled={running} />
          </div>
          <Button onClick={runFullDemo} disabled={running} className="rounded-full h-10">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "데모 진행 중…" : "전체 데모 시작"}
          </Button>
        </div>
      </Card>

      {/* Stepper */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {PHASES.map((p) => {
          const isDone = completed.includes(p.key) || phase === "done";
          const isActive = phase === p.key;
          const Icon = p.icon;
          return (
            <div key={p.key}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                isActive && "border-primary bg-primary/5 shadow-sm",
                isDone && "border-primary/30 bg-primary/5",
                !isActive && !isDone && "border-border bg-card opacity-60",
              )}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                isDone ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
              )}>
                {isDone ? <Check className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="text-xs font-semibold text-foreground">{p.label}</div>
            </div>
          );
        })}
      </div>

      {/* Topics */}
      {(phase === "recommend" || topics.length > 0) && (
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">추천 토픽</h2>
            {phase === "recommend" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>
          {topics.length === 0 && phase === "recommend" && (
            <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all max-h-32 overflow-auto">{topicBuf || "AI가 사이트를 분석 중…"}</pre>
          )}
          <div className="grid md:grid-cols-3 gap-2">
            {topics.map((t, i) => (
              <div key={i}
                className={cn(
                  "p-3 rounded-lg border text-left",
                  picked?.title === t.title ? "border-primary bg-primary/5" : "border-border bg-card",
                )}>
                <div className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mb-1.5"
                  style={{ background: `${axisColor(t.axis)}20`, color: axisColor(t.axis) }}>
                  {t.axis}
                </div>
                <div className="text-sm font-semibold text-foreground leading-snug mb-1">{t.title}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{t.reason}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Draft live */}
      {(phase === "draft" || draft) && (
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">실시간 본문 생성</h2>
            {phase === "draft" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            <span className="ml-auto text-[11px] text-muted-foreground">{draft.length.toLocaleString()}자</span>
          </div>
          <div ref={draftRef}
            className="max-h-[420px] overflow-auto rounded-md border border-border bg-muted/30 p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed text-foreground">
            {draft || <span className="text-muted-foreground">…</span>}
            {phase === "draft" && <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse align-middle" />}
          </div>
        </Card>
      )}

      {/* Scores */}
      {scores && (
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">콘텐츠 준비 점수 (SEO · AEO · GEO)</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ScoreGauge label="SEO" value={scores.seo.score} comment={scores.seo.comment} color={axisColor("SEO")} />
            <ScoreGauge label="AEO" value={scores.aeo.score} comment={scores.aeo.comment} color={axisColor("AEO")} />
            <ScoreGauge label="GEO" value={scores.geo.score} comment={scores.geo.comment} color={axisColor("GEO")} />
          </div>
        </Card>
      )}

      {/* Publish */}
      {phase === "done" && queueId && (
        <Card className="p-5 mb-4 border-primary/40 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">발행 큐 등록 완료 (시뮬레이션)</div>
              <div className="text-xs text-muted-foreground">큐 ID: <span className="font-mono">{queueId}</span> · 실제 DB 저장은 일어나지 않았습니다.</div>
            </div>
            <Button variant="outline" size="sm" className="rounded-full" onClick={runFullDemo} disabled={running}>
              <Sparkles className="w-3.5 h-3.5" /> 다시 시연
            </Button>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground text-center mt-6">
        ⚙️ 내부 팀 시연 전용 · 모든 결과는 메모리에서만 동작하며 user_sites / site_posts 테이블에 영향을 주지 않습니다.
      </p>
    </>
  );
}
