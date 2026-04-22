import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Play, RotateCcw, Check, Loader2, Send, FileText, Gauge, Lightbulb, TrendingUp, ShoppingBag, MousePointerClick, Eye, ClipboardList, ChevronDown, ChevronUp, Mic, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { PURELEAF_DEMO } from "@/data/demoBrandSeed";

type Phase = "idle" | "recommend" | "brief" | "draft" | "score" | "publish" | "done";
type Topic = { axis: "SEO" | "AEO" | "GEO"; title: string; reason: string };
type Scores = { seo: { score: number; comment: string }; aeo: { score: number; comment: string }; geo: { score: number; comment: string } };
type SeoBrief = {
  topic: string;
  intent: "informational" | "commercial" | "transactional";
  title: string;
  titleVariants?: { label: string; value: string; angle: string }[];
  metaDescription: string;
  metaDescriptionVariants?: { label: string; value: string; angle: string }[];
  primaryKeyword: string;
  secondaryKeywords: string[];
  keywordClusters?: {
    primary: string[];
    secondary: string[];
    longTail: string[];
    lsi: string[];
  };
  outline: { h2: string; points: string[] }[];
  faq: { q: string; a: string }[];
  structuredData: string[];
  internalLinkHints: string[];
};

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-stream-content`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// 미니멀 3단계 그룹 — 내부 5단계 로직은 유지하되 시연자/관객 시점에서는 3단계만 보여줌
// 1) 진단·기획  ← recommend + brief
// 2) 자동 생성  ← draft
// 3) 발행 검수  ← score + publish
const PHASE_GROUPS: {
  key: "diagnose" | "generate" | "ship";
  label: string;
  sub: string;
  icon: typeof Lightbulb;
  includes: Phase[];
}[] = [
  { key: "diagnose", label: "1 · 진단 & 기획", sub: "구매 키워드 + 발행 패키지", icon: Lightbulb, includes: ["recommend", "brief"] },
  { key: "generate", label: "2 · 자동 생성", sub: "1시간짜리 글을 30초에", icon: FileText, includes: ["draft"] },
  { key: "ship", label: "3 · 발행 검수", sub: "3축 채점 → 자동 발행 큐", icon: Send, includes: ["score", "publish"] },
];


// 평균 점수 → 월 SEO 기대효과 (데모용 추정 공식)
// ⚠️ 매출은 단정형이 아닌 "기대 범위"로 노출. 광고대행 컨텍스트에서 절감 광고비를 강조.
function estimateSeoImpact(avg: number) {
  const k = Math.max(0.2, avg / 100); // 0.2~1.0
  const monthlyImpressions = Math.round(2400 * k * (1 + k));      // ~480 ~ 4,800
  const monthlyClicks = Math.round(monthlyImpressions * (0.04 + k * 0.06)); // CTR 4~10%
  const conv = 0.018 + k * 0.012;                                  // 1.8~3.0%
  const orders = Math.max(0, Math.round(monthlyClicks * conv));
  const aov = 48000;                                               // 평균 객단가 가정
  const revenue = orders * aov;
  // 매출 기대 범위 (보수적 70% ~ 낙관 130%)
  const revenueLow = Math.round(revenue * 0.7);
  const revenueHigh = Math.round(revenue * 1.3);
  // 절감 광고비 = 무료 유입 클릭 × 평균 CPC (네이버·구글 이커머스 벤치마크 ₩850 가정)
  const avgCpc = 850;
  const adSavings = monthlyClicks * avgCpc;
  return { monthlyImpressions, monthlyClicks, orders, revenue, revenueLow, revenueHigh, adSavings, avgCpc };
}

const krw = (n: number) => "₩" + n.toLocaleString("ko-KR");

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

function ScoreGauge({
  label,
  value,
  comment,
  color,
  weakest = false,
}: {
  label: string;
  value: number;
  comment: string;
  color: string;
  weakest?: boolean;
}) {
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
  const tier =
    value >= 80 ? { label: "우수", emoji: "🏆", ring: "ring-emerald-500/30", glow: "from-emerald-500/15 to-transparent", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" }
    : value >= 65 ? { label: "양호", emoji: "✨", ring: "ring-primary/30", glow: "from-primary/15 to-transparent", chip: "bg-primary/15 text-primary" }
    : value >= 50 ? { label: "보완 필요", emoji: "⚠️", ring: "ring-amber-500/30", glow: "from-amber-500/15 to-transparent", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400" }
    : { label: "긴급 점검", emoji: "🚨", ring: "ring-destructive/30", glow: "from-destructive/15 to-transparent", chip: "bg-destructive/15 text-destructive" };

  const upliftPotential = weakest ? Math.min(99, value + 15) : null;

  return (
    <div className={cn(
      "relative flex flex-col items-center gap-2 p-4 rounded-xl border bg-card overflow-hidden ring-1 transition-all hover:shadow-md",
      tier.ring,
      weakest && "ring-2 ring-amber-500/60 shadow-[0_0_24px_-4px] shadow-amber-500/40 animate-[pulse_2.4s_ease-in-out_infinite] -translate-y-0.5",
    )}>
      <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", tier.glow)} />

      {weakest && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold shadow-md whitespace-nowrap">
          🎯 가장 먼저 보강
        </div>
      )}

      <div className="relative w-full flex items-center justify-between">
        <span className="text-[10px] font-extrabold tracking-widest text-foreground uppercase">{label}</span>
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", tier.chip)}>
          {tier.emoji} {tier.label}
        </span>
      </div>
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
          <circle cx="40" cy="40" r={r} stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.1s linear", filter: `drop-shadow(0 0 6px ${color}66)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-foreground tabular-nums leading-none">{v}</span>
          <span className="text-[9px] text-muted-foreground font-mono mt-0.5">/100</span>
        </div>
      </div>
      <div className="relative text-[11px] text-muted-foreground text-center leading-tight min-h-[28px] px-1">
        {comment || "—"}
      </div>

      {weakest && upliftPotential !== null && (
        <div className="relative w-full mt-1 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300">
          <span>보강 시</span>
          <span className="tabular-nums">{value}</span>
          <span>→</span>
          <span className="tabular-nums text-amber-600 dark:text-amber-200">{upliftPotential}</span>
          <span>점 가능</span>
        </div>
      )}
    </div>
  );
}

export default function Demo() {
  const [siteUrl, setSiteUrl] = useState("https://my-brand-shop.com");
  const [seedTopic, setSeedTopic] = useState("");
  const [brief, setBrief] = useState<SeoBrief | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicBuf, setTopicBuf] = useState("");
  const [picked, setPicked] = useState<Topic | null>(null);
  const [draft, setDraft] = useState("");
  const [scores, setScores] = useState<Scores | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [presenterMode, setPresenterMode] = useState(false);
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const [showForecastDetail, setShowForecastDetail] = useState(false);
  // 결과 탭 상태 (다음 단계: Topics/Brief/Draft/Scores를 단일 카드 + 탭으로 통합 예정)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [resultTab, setResultTab] = useState<"topics" | "brief" | "draft" | "scores">("topics");
  const [phaseTimings, setPhaseTimings] = useState<Partial<Record<Phase, number>>>({});
  const phaseStartRef = useRef<{ phase: Phase; t: number } | null>(null);
  const draftRef = useRef<HTMLDivElement>(null);

  // Track elapsed time per phase (records previous phase duration on transition)
  useEffect(() => {
    const now = performance.now();
    if (phase === "idle") {
      setPhaseTimings({});
      phaseStartRef.current = null;
      return;
    }
    const prev = phaseStartRef.current;
    if (prev && prev.phase !== phase) {
      const dur = (now - prev.t) / 1000;
      setPhaseTimings((m) => ({ ...m, [prev.phase]: dur }));
    }
    phaseStartRef.current = { phase, t: now };
  }, [phase]);

  // 단계 진행에 따라 결과 탭을 자동 전환 (사용자가 직접 탭 클릭하면 그 선택을 유지)
  const tabAutoRef = useRef(true);
  useEffect(() => {
    if (!tabAutoRef.current) return;
    if (phase === "recommend") setResultTab("topics");
    else if (phase === "brief") setResultTab("brief");
    else if (phase === "draft") setResultTab("draft");
    else if (phase === "score" || phase === "publish" || phase === "done") setResultTab("scores");
  }, [phase]);

  const SAMPLE_URLS = [
    { url: "https://www.musinsa.com", label: "무신사 (패션 카테고리)" },
    { url: "https://kream.co.kr", label: "KREAM (한정판/리셀)" },
    { url: "https://my-brand-shop.com", label: "가상 브랜드 쇼핑몰" },
  ];

  const SCRIPT: { phase: Phase; line: string }[] = [
    { phase: "idle", line: "지금 보시는 건 내부 시연 전용 페이지예요. DB에는 아무것도 저장되지 않습니다." },
    { phase: "recommend", line: "사이트만 보고 AI가 구매 의도가 있는 키워드 토픽 3개를 즉석에서 뽑습니다. SEO·AEO·GEO 3축이 골고루 나오는지 봐주세요." },
    { phase: "brief", line: "본문을 쓰기 전에 먼저 SEO 기획 패키지를 만들어요 — 제목·메타·키워드·FAQ·구조까지 발행 직전 형태로 한 번에 나옵니다." },
    { phase: "draft", line: "이 기획대로 실시간으로 글이 써지는 모습이에요. 사람이 1시간 걸릴 글을 30초 안에 마크다운으로 완성합니다." },
    { phase: "score", line: "발행 전에 자동으로 SEO·AEO·GEO 3축 점수를 매겨요. 약점이 보이면 다시 생성하거나 수동 보정이 가능합니다." },
    { phase: "publish", line: "이 글이 발행 큐에 올라가면, 매일 정해진 시간에 자동으로 사이트에 게시됩니다." },
    { phase: "done", line: "맨 아래 카드 보세요 — 글 1편이 매월 자산처럼 매출을 만들어주는 게 핵심입니다. 발행할수록 곱해집니다." },
  ];
  const currentLine = SCRIPT.find(s => s.phase === phase)?.line ?? SCRIPT[0].line;

  const completed = useMemo(() => {
    const order: Phase[] = ["recommend", "brief", "draft", "score", "publish"];
    const idx = order.indexOf(phase);
    if (phase === "done") return order;
    return order.slice(0, idx);
  }, [phase]);

  const reset = () => {
    setPhase("idle"); setTopics([]); setTopicBuf(""); setPicked(null);
    setBrief(null); setDraft(""); setScores(null); setQueueId(null); setRunning(false);
  };

  const runFullDemo = async () => {
    if (!siteUrl.trim()) { toast({ title: "사이트 URL을 입력해 주세요" }); return; }
    reset();
    setRunning(true);
    try {
      // 1) Recommend topics (skipped only visually if seedTopic provided — we still recommend for variety)
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
      // If user provided a seed topic, build a virtual chosen topic with SEO axis;
      // otherwise pick the first recommended topic.
      const chosen: Topic = seedTopic.trim()
        ? { axis: "SEO", title: seedTopic.trim(), reason: "사용자가 직접 지정" }
        : finalTopics[0];
      setPicked(chosen);
      await new Promise(r => setTimeout(r, 500));

      // 2) SEO Brief (제목·메타·키워드·FAQ·구조화)
      setPhase("brief");
      const briefResp = await fetch(STREAM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ mode: "seo-brief", siteUrl, topic: chosen.title }),
      });
      if (!briefResp.ok) {
        const errBody = await briefResp.json().catch(() => ({}));
        throw new Error(errBody.error || "SEO 기획 패키지 생성 실패");
      }
      const briefData = (await briefResp.json()) as SeoBrief;
      setBrief(briefData);
      await new Promise(r => setTimeout(r, 700));

      // 3) Draft streaming (uses brief.title as the topic for tighter alignment)
      setPhase("draft");
      let bodyBuf = "";
      await streamEndpoint({ mode: "draft", siteUrl, topic: briefData.title || chosen.title, axis: chosen.axis }, (chunk) => {
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

  /**
   * 사전 제작된 PURELEAF 브랜드 시드를 즉시 주입.
   * AI 호출/네트워크 없이 풀 데모 결과 화면을 그대로 보여줄 때 사용.
   * 시연 리허설, 오프라인 시연, AI 크레딧 절약 시나리오에 유용.
   */
  const loadSampleSeed = () => {
    if (running) return;
    const seed = PURELEAF_DEMO;
    setSiteUrl(seed.brand.siteUrl);
    setSeedTopic("");
    setTopics(seed.topics);
    setTopicBuf("");
    setPicked(seed.topics.find((t) => t.title === seed.pickedTopicTitle) ?? seed.topics[0]);
    setBrief(seed.brief);
    setDraft(seed.draftMarkdown);
    setScores(seed.scores);
    setQueueId(`sample-${Date.now().toString(36)}`);
    setPhaseTimings({
      recommend: 4.2,
      brief: 6.8,
      draft: 22.5,
      score: 3.1,
      publish: 0.7,
    });
    setPhase("done");
    toast({
      title: "샘플 데이터를 불러왔어요",
      description: `${seed.brand.name} (${seed.brand.category}) — 시연 리허설용`,
    });
  };

  const axisColor = (a: string) =>
    a === "SEO" ? "hsl(var(--primary))" : a === "AEO" ? "hsl(217 91% 60%)" : "hsl(280 70% 60%)";

  return (
    <>
      <Helmet><title>AutoBlog 라이브 데모 | 내부 시연용</title></Helmet>

      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
              ⚡ 10초 생성
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-bold">
              📦 다음 30편 큐 대기
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight tracking-tight">
            검색 유입을 만드는 콘텐츠 시스템, <span className="text-primary">AutoBlog</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 leading-snug">
            광고는 끄면 멈추고 <span className="text-foreground font-semibold">검색은 잠들어도 일합니다</span>. 다음 30편이 큐에 쌓여 매일 자동 발행 — 아침에 승인 한 번.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant={presenterMode ? "default" : "outline"}
            size="sm"
            className="rounded-full h-8 text-[11px]"
            onClick={() => { setPresenterMode(v => !v); if (!presenterMode) setGuideOpen(true); }}
            title="시연 진행자용 가이드/멘트 표시"
          >
            <Mic className="w-3.5 h-3.5" /> 진행자
          </Button>
          <Button variant="outline" size="icon" className="rounded-full h-8 w-8" onClick={reset} disabled={running} title="초기화">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Control — 컴팩트 한 줄 */}
      <Card className="p-3 mb-3">
        <div className="grid md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
          <Input id="demo-url" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="사이트 URL (예: https://my-brand-shop.com)" disabled={running} className="h-10" />
          <Input id="demo-topic" value={seedTopic} onChange={(e) => setSeedTopic(e.target.value)}
            placeholder="주제 (선택) — 비우면 AI가 자동 추천" disabled={running} className="h-10" />
          <Button
            type="button" variant="outline" size="sm"
            className="rounded-full h-10 text-[11px] whitespace-nowrap"
            onClick={loadSampleSeed} disabled={running}
            title="AI 호출 없이 사전 제작된 PURELEAF 결과를 즉시 표시"
          >
            <FlaskConical className="w-3.5 h-3.5" /> 샘플
          </Button>
          <Button onClick={runFullDemo} disabled={running} className="rounded-full h-10 whitespace-nowrap">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "진행 중…" : "라이브 데모 시작"}
          </Button>
        </div>
      </Card>

      {/* 10초 라이브 가이드 — 진행자 모드에서만 표시 */}
      {presenterMode && (
      <Card className="p-0 mb-4 overflow-hidden border-primary/30">
        <button
          onClick={() => setGuideOpen(o => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground">10초 라이브 시연 가이드</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">진행자용</span>
          </div>
          {guideOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {guideOpen && (
          <div className="p-4 space-y-4 border-t bg-card">
            {/* 시작 멘트 */}
            <div>
              <div className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Mic className="w-3 h-3" /> 시작 멘트 (클릭 직전)
              </div>
              <blockquote className="text-sm text-foreground leading-relaxed border-l-2 border-primary pl-3 py-1">
                "지금부터 <span className="font-bold">10초 안에</span>, 광고비 0원으로 검색에서 매출이 들어오는 과정을 보여드릴게요.
                URL 하나면 됩니다. AI가 토픽을 뽑고, 글을 쓰고, 채점하고, 발행 큐까지 자동으로 올립니다.
                마지막엔 이 글 1편이 매달 얼마를 벌어줄지 숫자로 보여드릴게요."
              </blockquote>
            </div>

            {/* 입력값 예시 */}
            <div>
              <div className="text-[11px] font-bold text-muted-foreground mb-1.5">추천 입력 URL (클릭하면 자동 입력)</div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_URLS.map(s => (
                  <button
                    key={s.url}
                    onClick={() => setSiteUrl(s.url)}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background hover:bg-muted text-[11px] text-foreground transition-colors disabled:opacity-50"
                  >
                    <span className="font-mono text-foreground">{s.url.replace(/^https?:\/\//, "")}</span>
                    <span className="text-muted-foreground">· {s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 클릭 흐름 + 결과 노출 순서 */}
            <div>
              <div className="text-[11px] font-bold text-muted-foreground mb-1.5">클릭 흐름 & 결과 노출 순서 (총 ~10초)</div>
              <ol className="text-xs text-foreground space-y-1.5">
                {[
                  ["①", "「라이브 데모 시작」 클릭", "한 번의 클릭으로 전 과정이 자동 진행됨을 강조"],
                  ["②", "추천 토픽 3개 카드 등장", "축별 색상(SEO/AEO/GEO)으로 다양성 어필"],
                  ["③", "본문이 타이핑되며 차오름", "‘사람이 1시간 걸릴 일이 몇 초 만에’ 라고 멘트"],
                  ["④", "3축 게이지가 0→점수까지 애니메이션", "발행 전 자동 검수가 된다는 신뢰 포인트"],
                  ["⑤", "월 예상 SEO 매출 카드 (가장 강조)", "여기서 한 박자 쉬며 숫자 짚어주기"],
                  ["⑥", "발행 큐 등록 완료 카드", "매일 자동 발행 → 자산이 누적됨을 마무리 멘트"],
                ].map(([t, action, tip]) => (
                  <li key={t as string} className="flex gap-2">
                    <span className="font-mono text-[10px] text-primary font-bold shrink-0 w-9 pt-0.5">{t}</span>
                    <div className="min-w-0">
                      <div className="font-semibold">{action}</div>
                      <div className="text-[11px] text-muted-foreground">→ {tip}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* 마무리 멘트 */}
            <div>
              <div className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Mic className="w-3 h-3" /> 마무리 멘트 (결과 카드 등장 직후)
              </div>
              <blockquote className="text-sm text-foreground leading-relaxed border-l-2 border-primary pl-3 py-1">
                "방금 보신 건 <span className="font-bold">10초 만에 만든 1편</span>이에요. 그런데 진짜 무기는 속도가 아니라 <span className="font-bold">재고</span>예요.
                자는 동안 <span className="font-bold">다음 30편이 큐에 미리 쌓이고</span>, 매일 예약 시간에 알아서 발행됩니다.
                당신이 해야 할 일은 아침에 <span className="font-bold">승인 한 번</span>. 광고는 끄면 0이지만, 큐에 쌓인 콘텐츠는 매일 자산이 됩니다.
                다음 단계는 실제 사이트 URL 한 번 직접 넣어보시는 거예요."
              </blockquote>
            </div>

            {/* 실시간 멘트 헬퍼 */}
            {running && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Mic className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-foreground leading-relaxed">
                  <span className="font-bold text-primary">[지금 말할 멘트]</span> {currentLine}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
      )}

      {/* Live Generation Bar — 실시간 생성 중 강조 */}
      {running && (
        <Card className="p-4 mb-4 border-primary/40 bg-gradient-to-r from-primary/5 via-background to-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">LIVE</span>
                <span className="text-sm font-bold text-foreground truncate">
                  {phase === "recommend" && "AI가 구매 의도 키워드를 발굴하고 있어요…"}
                  {phase === "brief" && "AI가 제목·메타·키워드·FAQ·구조를 한 번에 설계 중이에요…"}
                  {phase === "draft" && "AI가 SEO 친화 본문을 한 글자씩 작성 중이에요…"}
                  {phase === "score" && "AI가 발행 전 3축 콘텐츠 품질을 채점 중이에요…"}
                  {phase === "publish" && "발행 큐에 자동으로 등록 중이에요…"}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary via-primary/70 to-primary animate-pulse"
                  style={{
                    width: phase === "recommend" ? "15%" : phase === "brief" ? "35%" : phase === "draft" ? "60%" : phase === "score" ? "82%" : phase === "publish" ? "95%" : "100%",
                    transition: "width 0.6s ease-out",
                  }} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Overall progress summary */}
      {(running || phase === "done") && (() => {
        const order: Phase[] = ["recommend", "brief", "draft", "score", "publish"];
        const doneCount = phase === "done" ? order.length : completed.length;
        const pct = Math.round((doneCount / order.length) * 100);
        const totalElapsed = Object.values(phaseTimings).reduce((a, b) => a + (b || 0), 0);
        return (
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground">{doneCount}/{order.length}</span>
              <span>단계 완료</span>
              <span className="text-muted-foreground/50">·</span>
              <span>총 경과 <span className="font-mono font-semibold text-foreground">{totalElapsed.toFixed(1)}초</span></span>
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[260px]">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] font-bold text-primary tabular-nums shrink-0">{pct}%</span>
            </div>
          </div>
        );
      })()}

      {/* Stepper — 미니멀 3단계 (진단 · 자동생성 · 발행검수) */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {PHASE_GROUPS.map((g) => {
          const isActive = g.includes.includes(phase);
          const isDone =
            phase === "done" ||
            (g.includes.every((p) => completed.includes(p)) && !isActive);
          const Icon = g.icon;
          const dur = g.includes.reduce((sum, p) => sum + (phaseTimings[p] || 0), 0);
          return (
            <div
              key={g.key}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all",
                isActive && "border-primary bg-primary/5 shadow-sm scale-[1.02]",
                isDone && "border-primary/30 bg-primary/5",
                !isActive && !isDone && "border-border bg-card opacity-60",
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  isDone ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-foreground truncate">{g.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {isDone && dur > 0 ? `✓ ${dur.toFixed(1)}초` : isActive ? "진행 중…" : g.sub}
                </div>
              </div>
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
            {topics.map((t, i) => {
              // 데모 시그널: 토픽 제목 길이/축 기반의 의사결정 보조 지표 (deterministic)
              const seedHash = t.title.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
              const monthlyVolume = 800 + (seedHash % 28) * 250; // 800~7,800
              const competition = ["낮음", "중간", "중상"][seedHash % 3];
              const intent = t.axis === "AEO" ? "정보 탐색" : t.axis === "GEO" ? "비교 검토" : "구매 직결";
              const intentTone = t.axis === "SEO" ? "text-emerald-600 dark:text-emerald-400" : t.axis === "GEO" ? "text-primary" : "text-foreground";
              return (
                <div key={i}
                  className={cn(
                    "p-3 rounded-lg border text-left",
                    picked?.title === t.title ? "border-primary bg-primary/5" : "border-border bg-card",
                  )}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: `${axisColor(t.axis)}20`, color: axisColor(t.axis) }}>
                      {t.axis}
                    </div>
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", intentTone)}>{intent}</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground leading-snug mb-1">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight mb-2">{t.reason}</div>
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border/60">
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">월 검색량(추정)</div>
                      <div className="text-[11px] font-bold text-foreground tabular-nums">{monthlyVolume.toLocaleString()}회</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">경쟁도</div>
                      <div className="text-[11px] font-bold text-foreground">{competition}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {topics.length > 0 && (
            <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
              ※ 검색량·경쟁도는 데모용 추정 지표입니다. 실제 운영에서는 Search Console·키워드 도구 데이터로 교체됩니다.
            </p>
          )}
        </Card>
      )}

      {/* SEO Brief Package — 발행 직전 기획 */}
      {(phase === "brief" || brief) && (
        <Card className="p-5 mb-4 border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">SEO 기획 패키지</h2>
            {brief && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">
                {brief.intent === "transactional" ? "거래형" : brief.intent === "commercial" ? "구매검토형" : "정보형"}
              </span>
            )}
            {phase === "brief" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </div>
          {!brief && phase === "brief" && (
            <p className="text-xs text-muted-foreground">AI가 제목·메타·키워드·FAQ·구조를 동시에 설계 중…</p>
          )}
          {brief && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">최종 주제</div>
                  <div className="text-sm font-semibold text-foreground">{brief.topic}</div>
                </div>

                {/* 블로그 제목 3안 */}
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    H1 제목 후보 {brief.titleVariants?.length ?? 1}안
                  </div>
                  {brief.titleVariants && brief.titleVariants.length > 0 ? (
                    <div className="space-y-1.5">
                      {brief.titleVariants.map((v, i) => {
                        const isPicked = v.value === brief.title;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "rounded-md border p-2.5",
                              isPicked
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card",
                            )}
                          >
                            <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                isPicked ? "text-primary" : "text-muted-foreground",
                              )}>
                                {v.label}{isPicked && " ✓"}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">{v.value.length}자</span>
                            </div>
                            <div className={cn(
                              "text-sm font-semibold leading-snug",
                              isPicked ? "text-foreground" : "text-foreground/80",
                            )}>
                              {v.value}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1 leading-snug">→ {v.angle}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-base font-bold text-foreground leading-snug">{brief.title}</div>
                  )}
                </div>

                {/* 메타 설명 2안 */}
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    메타 설명 후보 {brief.metaDescriptionVariants?.length ?? 1}안
                  </div>
                  {brief.metaDescriptionVariants && brief.metaDescriptionVariants.length > 0 ? (
                    <div className="space-y-1.5">
                      {brief.metaDescriptionVariants.map((v, i) => {
                        const isPicked = v.value === brief.metaDescription;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "rounded-md border p-2.5",
                              isPicked
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card",
                            )}
                          >
                            <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider",
                                isPicked ? "text-primary" : "text-muted-foreground",
                              )}>
                                {v.label}{isPicked && " ✓"}
                              </span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">{v.value.length}자</span>
                            </div>
                            <div className="text-xs text-foreground leading-relaxed">{v.value}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">→ {v.angle}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-foreground leading-relaxed bg-muted/40 rounded-md p-2 border">{brief.metaDescription}</div>
                  )}
                </div>
              </div>

              {/* 핵심 키워드 묶음 (4분류) */}
              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">핵심 키워드 묶음</div>
                {brief.keywordClusters ? (
                  <div className="space-y-2">
                    {([
                      { key: "primary", label: "🎯 Primary (1~2개)", desc: "본문·제목·메타에 반드시 들어가야 하는 메인 타깃", chip: "bg-primary text-primary-foreground border-primary" },
                      { key: "secondary", label: "📌 Secondary", desc: "H2·문단에 자연스럽게 분포시킬 보조 키워드", chip: "bg-foreground/10 text-foreground border-foreground/20" },
                      { key: "longTail", label: "🔍 Long-tail", desc: "검색 의도가 명확한 롱테일 — FAQ·소제목에 활용", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
                      { key: "lsi", label: "🧬 LSI / 의미 연관", desc: "본문 자연 노출로 주제 권위 강화 (의미·성분·인증)", chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30" },
                    ] as const).map((g) => {
                      const items = brief.keywordClusters![g.key];
                      if (!items?.length) return null;
                      return (
                        <div key={g.key} className="rounded-md border bg-card p-2.5">
                          <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
                            <span className="text-[11px] font-bold text-foreground">{g.label}</span>
                            <span className="text-[10px] text-muted-foreground">{g.desc}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {items.map((kw, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                                  g.chip,
                                )}
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                      🎯 {brief.primaryKeyword}
                    </span>
                    {brief.secondaryKeywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-foreground text-[11px] border">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">본문 구조 (H2 {brief.outline.length}개)</div>
                <ol className="space-y-2">
                  {brief.outline.map((sec, i) => (
                    <li key={i} className="border-l-2 border-primary/30 pl-3 py-0.5">
                      <div className="text-sm font-semibold text-foreground">H2. {sec.h2}</div>
                      <ul className="mt-1 space-y-0.5">
                        {sec.points.map((pt, j) => (
                          <li key={j} className="text-[11px] text-muted-foreground leading-snug">· {pt}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">FAQ (AEO · AI 답변 채택, {brief.faq.length}개)</div>
                <div className="space-y-1.5">
                  {brief.faq.map((f, i) => (
                    <details key={i} className="rounded-md border bg-card p-2">
                      <summary className="text-xs font-semibold text-foreground cursor-pointer">Q. {f.q}</summary>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed pl-3">A. {f.a}</p>
                    </details>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">권장 schema.org</div>
                  <div className="flex flex-wrap gap-1">
                    {brief.structuredData.map((s, i) => (
                      <code key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border text-foreground">{s}</code>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">내부 링크 힌트</div>
                  <ul className="space-y-0.5">
                    {brief.internalLinkHints.map((h, i) => (
                      <li key={i} className="text-[11px] text-muted-foreground">→ {h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Draft live */}
      {(phase === "draft" || draft) && (() => {
        const charCount = draft.length;
        // 사람 평균 타이핑 250자/분 + 리서치/구성 시간 가산 → 1,000자당 약 12분
        const humanMinutes = Math.max(1, Math.round((charCount / 1000) * 12));
        const aiSeconds = phaseTimings.draft ? Math.round(phaseTimings.draft) : Math.max(1, Math.round(charCount / 200));
        const speedMultiplier = humanMinutes > 0 && aiSeconds > 0
          ? Math.round((humanMinutes * 60) / aiSeconds)
          : 0;
        return (
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <FileText className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">실시간 본문 생성</h2>
              {phase === "draft" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">{charCount.toLocaleString()}자</span>
            </div>

            {/* 실시간 마이크로카피 — 진행 중일 때만 노출 */}
            {phase === "draft" && (() => {
              const headingMatches = draft.match(/^##\s+(.+)$/gm) ?? [];
              const lastH2 = headingMatches.length > 0
                ? headingMatches[headingMatches.length - 1].replace(/^##\s+/, "").trim().slice(0, 40)
                : null;
              const stage = charCount < 200 ? "도입부 · 검색 의도 정리"
                : charCount < 800 ? "기획안 → 본문 매핑"
                : charCount < 2000 ? "근거·예시 단락 작성"
                : charCount < 3500 ? "비교·체크리스트 구성"
                : "FAQ·결론 마무리";
              const elapsed = phaseStartRef.current?.phase === "draft"
                ? Math.max(0.1, (performance.now() - phaseStartRef.current.t) / 1000)
                : 1;
              const tokensPerSec = Math.round(charCount / elapsed);
              const liveLabel = lastH2 ? `H2 작성 중 — "${lastH2}"` : stage;
              return (
                <div className="mb-3 p-2.5 rounded-md border border-primary/30 bg-primary/5 flex items-center gap-2 flex-wrap">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="text-[11px] font-semibold text-primary truncate flex-1 min-w-0">{liveLabel}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums font-mono shrink-0">
                    ~{tokensPerSec.toLocaleString()} 자/초 · {elapsed.toFixed(1)}s
                  </span>
                </div>
              );
            })()}

            {/* 사람 vs AI 비교 — 임팩트 강화 */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="p-2.5 rounded-lg border bg-muted/40">
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">사람이 쓰면</div>
                <div className="text-base font-bold text-muted-foreground tabular-nums">~{humanMinutes}분</div>
                <div className="text-[10px] text-muted-foreground">리서치+작성 평균</div>
              </div>
              <div className="p-2.5 rounded-lg border border-primary bg-primary/5">
                <div className="text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">AutoBlog</div>
                <div className="text-base font-bold text-primary tabular-nums">{aiSeconds}초</div>
                <div className="text-[10px] text-muted-foreground">실측 생성 시간</div>
              </div>
              <div className="p-2.5 rounded-lg border bg-card">
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">속도 차</div>
                <div className="text-base font-extrabold text-foreground tabular-nums">×{speedMultiplier || "—"}</div>
                <div className="text-[10px] text-muted-foreground">{speedMultiplier ? `${speedMultiplier}배 빠름` : "측정 중"}</div>
              </div>
            </div>

            <div ref={draftRef}
              className="max-h-[420px] overflow-auto rounded-md border border-border bg-muted/30 p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed text-foreground">
              {draft || <span className="text-muted-foreground">기획안을 본문으로 옮기는 중…</span>}
              {phase === "draft" && <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse align-middle" />}
            </div>

            {phase !== "draft" && draft && (
              <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
                💡 매일 1편 = 월 30편. 사람 외주(편당 5~10만원) 환산 시 <span className="font-bold text-foreground">월 150~300만원</span> 규모의 콘텐츠 제작비를 대체합니다.
              </p>
            )}
          </Card>
        );
      })()}

      {/* Scores */}
      {scores && (() => {
        const avgPrep = Math.round((scores.seo.score + scores.aeo.score + scores.geo.score) / 3);
        const verdict = avgPrep >= 80 ? { label: "발행 준비 완료", tone: "bg-emerald-500 text-white", icon: "🟢" }
          : avgPrep >= 65 ? { label: "가벼운 검수 후 발행", tone: "bg-primary text-primary-foreground", icon: "🔵" }
          : { label: "보완 후 재검수", tone: "bg-destructive text-destructive-foreground", icon: "🔴" };
        const axes = [
          { key: "SEO" as const, score: scores.seo.score },
          { key: "AEO" as const, score: scores.aeo.score },
          { key: "GEO" as const, score: scores.geo.score },
        ];
        const sorted = [...axes].sort((a, b) => b.score - a.score);
        const strongest = sorted[0];
        const weakest = sorted[sorted.length - 1];
        return (
          <Card className="p-5 mb-4 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
                  <Gauge className="w-4 h-4 text-primary" />
                  발행 전 콘텐츠 품질 점검
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold uppercase tracking-wider">실시간 채점</span>
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  사람 검수 1시간 분량을 3초 안에 — SEO·AEO·GEO 3축 신호 자동 점검 · <span className="font-mono">{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span> 기준
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">종합</div>
                  <div className="text-3xl font-extrabold text-foreground leading-none tabular-nums">{avgPrep}<span className="text-sm text-muted-foreground font-normal">/100</span></div>
                </div>
                <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap", verdict.tone)}>
                  {verdict.icon} {verdict.label}
                </span>
              </div>
            </div>

            {/* 강점·약점 한 줄 요약 */}
            <div className="flex items-center gap-2 mb-3 text-[11px] flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                💪 강점 {strongest.key} <span className="tabular-nums">{strongest.score}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
                🎯 보완 {weakest.key} <span className="tabular-nums">{weakest.score}</span> · +{Math.max(5, 80 - weakest.score)}점 여력
              </span>
            </div>

            {(() => {
              // 자동으로 가장 낮은 축을 약점으로 선정
              const minScore = Math.min(scores.seo.score, scores.aeo.score, scores.geo.score);
              return (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <ScoreGauge label="SEO" value={scores.seo.score} comment={scores.seo.comment} color={axisColor("SEO")} weakest={scores.seo.score === minScore} />
                  <ScoreGauge label="AEO" value={scores.aeo.score} comment={scores.aeo.comment} color={axisColor("AEO")} weakest={scores.aeo.score === minScore} />
                  <ScoreGauge label="GEO" value={scores.geo.score} comment={scores.geo.comment} color={axisColor("GEO")} weakest={scores.geo.score === minScore} />
                </div>
              );
            })()}

            {/* 내부 팀용 — 발행 전 신호 점검 (관찰된 근거 함께 노출) */}
            {(() => {
              // brief에서 직접 측정 가능한 신호들
              const titleLen = brief?.title?.length ?? 0;
              const metaLen = brief?.metaDescription?.length ?? 0;
              const primaryKw = brief?.primaryKeyword ?? "";
              const titleHasKw = primaryKw && brief?.title?.includes(primaryKw);
              const metaHasKw = primaryKw && brief?.metaDescription?.includes(primaryKw);
              const h2Count = brief?.outline?.length ?? 0;
              const faqCount = brief?.faq?.length ?? 0;
              const schemaCount = brief?.structuredData?.length ?? 0;
              const internalLinks = brief?.internalLinkHints?.length ?? 0;
              const totalKw =
                (brief?.keywordClusters?.primary?.length ?? 0) +
                (brief?.keywordClusters?.secondary?.length ?? 0) +
                (brief?.keywordClusters?.longTail?.length ?? 0) +
                (brief?.keywordClusters?.lsi?.length ?? 0);

              const checks = [
                {
                  label: "타깃 키워드 적합도",
                  hint: "주 키워드가 제목·메타에 자연스럽게 들어갔는지",
                  value: Math.round((scores.seo.score * 0.6 + scores.aeo.score * 0.4)),
                  evidence: brief
                    ? [
                        `주 키워드 "${primaryKw}" — 제목 포함 ${titleHasKw ? "✓" : "✗"} · 메타 포함 ${metaHasKw ? "✓" : "✗"}`,
                        `클러스터 키워드 ${totalKw}개 (Primary/Secondary/Long-tail/LSI 분포)`,
                      ]
                    : ["기획안 생성 후 측정"],
                },
                {
                  label: "색인·노출 친화도",
                  hint: "메타 길이·H2 구조 등 검색엔진이 읽기 쉬운 신호",
                  value: scores.seo.score,
                  evidence: brief
                    ? [
                        `제목 ${titleLen}자 ${titleLen >= 25 && titleLen <= 60 ? "(권장 범위)" : "(권장 25~60자)"}`,
                        `메타 ${metaLen}자 ${metaLen >= 80 && metaLen <= 160 ? "(권장 범위)" : "(권장 80~160자)"} · 내부링크 후보 ${internalLinks}개`,
                      ]
                    : ["기획안 생성 후 측정"],
                },
                {
                  label: "콘텐츠 구조 완성도",
                  hint: "도입–본문–결론, 소제목·표·리스트의 가독성 신호",
                  value: Math.round((scores.aeo.score * 0.7 + scores.seo.score * 0.3)),
                  evidence: brief
                    ? [
                        `H2 소제목 ${h2Count}개 ${h2Count >= 4 ? "(충분)" : "(보완 권장)"}`,
                        `본문 약 ${draft ? draft.length.toLocaleString() : "—"}자 · 마크다운 구조 적용`,
                      ]
                    : ["기획안 생성 후 측정"],
                },
                {
                  label: "FAQ·스키마 활용도",
                  hint: "AI 답변·리치결과에 인용되기 쉬운 FAQ/JSON-LD 준비",
                  value: Math.round((scores.aeo.score * 0.5 + scores.geo.score * 0.5)),
                  evidence: brief
                    ? [
                        `FAQ 질문 ${faqCount}개 ${faqCount >= 3 ? "(AEO 충족)" : "(3개 이상 권장)"}`,
                        `스키마 ${schemaCount}종: ${(brief.structuredData ?? []).slice(0, 3).join(" · ") || "—"}`,
                      ]
                    : ["기획안 생성 후 측정"],
                },
              ];
              const tone = (v: number) =>
                v >= 80 ? { txt: "준비 양호", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" }
                : v >= 65 ? { txt: "보완 권장", cls: "bg-primary/15 text-primary", bar: "bg-primary" }
                : { txt: "수정 필요", cls: "bg-destructive/15 text-destructive", bar: "bg-destructive" };
              return (
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowScoreDetail((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-[12px] font-bold text-foreground">내부 팀 빠른 체크 — 발행 전 신호 4종</h3>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">실측 신호 기반</span>
                    </div>
                    {showScoreDetail
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                  {showScoreDetail && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        {checks.map((c) => {
                          const t = tone(c.value);
                          return (
                            <div key={c.label} className="p-3 rounded-lg border bg-card">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="text-[12px] font-bold text-foreground">{c.label}</div>
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", t.cls)}>{t.txt} {c.value}</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-1.5">
                                <div className={cn("h-full rounded-full transition-all", t.bar)} style={{ width: `${c.value}%` }} />
                              </div>
                              <div className="text-[10.5px] text-muted-foreground leading-snug mb-1.5">{c.hint}</div>
                              <ul className="space-y-0.5 pt-1.5 border-t border-border/60">
                                {c.evidence.map((e, i) => (
                                  <li key={i} className="text-[10.5px] text-foreground/80 leading-snug flex gap-1.5">
                                    <span className="text-muted-foreground shrink-0">·</span>
                                    <span className="font-mono">{e}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
                        * 검색 순위·트래픽을 보장하지 않으며, 발행 직전 콘텐츠의 구조·메타 신호를 기준으로 한 자체 진단 점수입니다.
                      </p>
                    </>
                  )}
                </div>
              );
            })()}

          </Card>
        );
      })()}

      {/* SEO Impact Forecast — 강조 포인트 */}
      {scores && (() => {
        const avg = Math.round((scores.seo.score + scores.aeo.score + scores.geo.score) / 3);
        const f = estimateSeoImpact(avg);
        // 12개월 누적: 매일 1편 발행 가정. n번째 달까지 누적 발행 글 수 = 30 * n.
        // 각 글은 발행 후 1~2개월부터 성숙 → 단순화: 발행된 글의 평균 성숙도 0.6 적용
        const months = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const articles = 30 * m;
          const matured = articles * 0.6; // 평균 성숙도 보정
          return {
            m,
            articles,
            revenue: Math.round(matured * f.revenue),
            clicks: Math.round(matured * f.monthlyClicks),
            adSavings: Math.round(matured * f.adSavings),
          };
        });
        const maxAdSavings = Math.max(...months.map(x => x.adSavings));
        const month12 = months[11];
        return (
          <Card className="p-5 mb-4 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">SEO 기대효과 · 광고비로 환산해 보면</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-bold uppercase tracking-wider">핵심 지표</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">
              평균 점수 <span className="font-bold text-foreground">{avg}점</span> 기준 · 색인 안정화(약 4~8주) 이후 <span className="font-bold text-foreground">글 1편</span>이 한 달간 만들어낼 수 있는 추정치 ·
              CPC 벤치마크 <span className="font-mono text-foreground">₩{f.avgCpc.toLocaleString()}</span> 적용
            </p>

            {/* 절감 광고비 — 광고대행 컨텍스트 메인 KPI */}
            <div className="mb-3 p-4 rounded-xl bg-primary text-primary-foreground border border-primary shadow-md">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-90 mb-1">
                    <TrendingUp className="w-3.5 h-3.5" /> 월 광고비 절감 추정액
                  </div>
                  <div className="text-3xl font-extrabold tabular-nums leading-none">{krw(f.adSavings)}</div>
                  <div className="text-[11px] opacity-85 mt-1">
                    같은 트래픽({f.monthlyClicks.toLocaleString()}회 클릭)을 광고로 확보할 때 드는 비용 기준
                  </div>
                </div>
                <div className="text-right text-[10px] opacity-80 max-w-[170px]">
                  💡 절감한 예산은<br/>
                  <span className="font-bold">핵심 캠페인 강화·신규 채널 테스트</span>에<br/>
                  재투자할 여력으로 활용 가능
                </div>
              </div>
            </div>

            {/* 보조 3지표 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-card border">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1"><Eye className="w-3 h-3" /> 검색 노출</div>
                <div className="text-lg font-bold text-foreground tabular-nums">{f.monthlyImpressions.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">월 노출 추정 (Google·Naver)</div>
              </div>
              <div className="p-3 rounded-lg bg-card border">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1"><MousePointerClick className="w-3 h-3" /> 자연 유입</div>
                <div className="text-lg font-bold text-foreground tabular-nums">{f.monthlyClicks.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">광고비 없이 유입되는 클릭</div>
              </div>
              <div className="p-3 rounded-lg bg-card border">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1"><ShoppingBag className="w-3 h-3" /> 기대 주문</div>
                <div className="text-lg font-bold text-foreground tabular-nums">{f.orders.toLocaleString()}건</div>
                <div className="text-[10px] text-muted-foreground">전환율 ~{(1.8 + (avg / 100) * 1.2).toFixed(1)}% 가정</div>
              </div>
            </div>

            {/* 매출은 "기대 범위"로 톤다운 — 작은 보조 영역 */}
            <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-dashed">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">참고치</span> · 주문이 매출로 이어질 경우 추정 범위 (객단가 ₩48,000 가정, 카테고리에 따라 변동)
                </div>
                <div className="text-sm font-bold text-foreground tabular-nums">
                  {krw(f.revenueLow)} ~ {krw(f.revenueHigh)}
                </div>
              </div>
            </div>

            {/* 12개월 누적 절감 광고비 차트 */}
            <div className="mt-5 p-4 rounded-xl bg-card border">
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    하루 1편씩, 12개월간 쌓이는 절감 광고비 시뮬레이션
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long" })} 기준 시작 · 절감액을 다른 캠페인·채널 테스트에 재투자할 수 있는 여력 추정
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">12개월차 월 절감 광고비</div>
                  <div className="text-2xl font-extrabold text-primary leading-none tabular-nums">{krw(month12.adSavings)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">누적 콘텐츠 자산 {month12.articles}편</div>
                </div>
              </div>
              <div className="flex items-end gap-1 h-32 mt-2">
                {months.map((mo, i) => {
                  const h = maxAdSavings > 0 ? (mo.adSavings / maxAdSavings) * 100 : 0;
                  const isLast = i === months.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="text-[9px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {Math.round(mo.adSavings / 10000).toLocaleString()}만
                      </div>
                      <div
                        className={cn(
                          "w-full rounded-t transition-all duration-500",
                          isLast ? "bg-primary" : "bg-primary/40"
                        )}
                        style={{ height: `${h}%`, minHeight: "4px" }}
                      />
                      <div className={cn("text-[9px] font-mono", isLast ? "text-primary font-bold" : "text-muted-foreground")}>
                        {mo.m}M
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-muted/40">
                  <div className="text-[10px] text-muted-foreground">3개월차</div>
                  <div className="text-xs font-bold text-foreground">{krw(months[2].adSavings)}</div>
                </div>
                <div className="p-2 rounded bg-muted/40">
                  <div className="text-[10px] text-muted-foreground">6개월차</div>
                  <div className="text-xs font-bold text-foreground">{krw(months[5].adSavings)}</div>
                </div>
                <div className="p-2 rounded bg-primary/15 border border-primary/30">
                  <div className="text-[10px] text-primary font-bold">12개월차</div>
                  <div className="text-xs font-extrabold text-primary">{krw(month12.adSavings)}</div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
              💡 광고는 집행을 멈추는 순간 노출도 함께 멈추지만,
              <span className="font-bold text-foreground"> 잘 만들어진 SEO 콘텐츠는 발행 이후에도 검색 결과에서 24시간 일하는 자산</span>으로 남습니다.
              여기서 절감되는 광고비만큼 <span className="font-bold text-foreground">핵심 캠페인을 더 두텁게, 신규 채널을 더 과감하게</span> 시도할 여력이 생깁니다.
              <br/>
              <span className="text-muted-foreground/80">※ 위 수치는 카테고리·경쟁도·CPC 변동에 따라 달라질 수 있는 추정치이며, 검색 순위나 매출을 보장하지 않습니다.</span>
            </p>
          </Card>
        );
      })()}
      {phase === "done" && queueId && (
        <Card className="p-5 mb-4 border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
                오늘 밤 자동 발행 일정에 등록되었습니다
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                  <Send className="w-2.5 h-2.5" /> 발행 큐 대기
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                다음 자동 발행 시각 <span className="font-mono font-semibold text-foreground">{(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" }); })()} 08:50 KST</span> · 큐 ID <span className="font-mono">{queueId}</span> · 시연 모드라 실제 저장은 일어나지 않아요
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={runFullDemo} disabled={running}>
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
