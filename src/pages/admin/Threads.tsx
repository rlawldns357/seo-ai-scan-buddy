import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Send, RefreshCw, PlayCircle, Trash2, Loader2, CheckCircle2, X, MessageCircle, ScrollText, Radio, Sparkles, Pencil, Calendar, Save, Zap, Clock, RotateCw, Settings2, Brain, TrendingUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import PixelEngine from "@/components/admin/PixelEngine";

const Badge = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", className)}>{children}</span>
);

type QueueItem = {
  id: string;
  body: string;
  publish_at: string;
  status: "draft" | "ready" | "publishing" | "published" | "failed";
  published_url: string | null;
  error_message: string | null;
  pause_reason: string | null;
  retry_count: number | null;
  created_at: string;
};

type EngineConfig = {
  version_major: number;
  version_minor: number;
  rules: string;
  pending_rules: string | null;
  character_name: string | null;
  character_tagline: string | null;
  character_voice: string | null;
  api_knowledge: string | null;
  api_knowledge_updated_at: string | null;
};

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  version_at: string | null;
  created_at: string;
};

type AutogenSettings = {
  enabled: boolean;
  daily_count: number;
  hour_kst: number;
  minute_kst: number;
  slot_start_hour_kst: number;
  slot_end_hour_kst: number;
  updated_at?: string;
};


async function threadsInvoke<T = any>(action: string, extra: Record<string, any> = {}): Promise<T | null> {
  const password = sessionStorage.getItem("admin_pw");
  if (!password) return null;
  const { data, error } = await supabase.functions.invoke("admin-threads", { body: { password, action, ...extra } });
  if (error) { toast({ title: "요청 실패", description: error.message, variant: "destructive" }); return null; }
  if ((data as any)?.error) { toast({ title: "요청 실패", description: (data as any).error, variant: "destructive" }); return null; }
  return data as T;
}

async function engineInvoke<T = any>(action: string, extra: Record<string, any> = {}): Promise<T | null> {
  const password = sessionStorage.getItem("admin_pw");
  if (!password) return null;
  const { data, error } = await supabase.functions.invoke("threads-engine-chat", { body: { password, action, ...extra } });
  if (error) { toast({ title: "엔진 오류", description: error.message, variant: "destructive" }); return null; }
  if ((data as any)?.error) { toast({ title: "엔진 오류", description: (data as any).error, variant: "destructive" }); return null; }
  return data as T;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  publishing: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "갱신 전";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}일 전`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}시간 전`;
  const m = Math.floor(diff / 60000);
  return `${m}분 전`;
}

export default function Threads() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refreshingKnowledge, setRefreshingKnowledge] = useState(false);

  const [engine, setEngine] = useState<EngineConfig | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesTab, setRulesTab] = useState<"rules" | "api">("rules");
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const [autogen, setAutogen] = useState<AutogenSettings | null>(null);

  const load = async () => {
    setLoading(true);
    const [qRes, eRes, aRes, agRes] = await Promise.all([
      threadsInvoke<{ items: QueueItem[] }>("list"),
      engineInvoke<{ config: EngineConfig; chat: ChatMsg[] }>("state"),
      threadsInvoke<{ items: Array<{ id: string; status: string }> }>("accounts"),
      threadsInvoke<{ settings: AutogenSettings | null }>("getAutogen"),
    ]);
    setItems(qRes?.items ?? []);
    if (eRes?.config) setEngine(eRes.config);
    if (eRes?.chat) setChat(eRes.chat);
    const active = (aRes?.items ?? []).find(a => a.status === "active");
    setAccountId(active?.id ?? aRes?.items?.[0]?.id ?? null);
    if (agRes?.settings) setAutogen(agRes.settings);
    setLoading(false);
  };

  const saveAutogen = async (patch: Partial<AutogenSettings>): Promise<boolean> => {
    const res = await threadsInvoke<{ success: boolean }>("updateAutogen", patch);
    if (res?.success) { toast({ title: "자동 생성 룰 저장됨" }); load(); return true; }
    return false;
  };



  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const createItem = async (body: string, publishAt: string): Promise<boolean> => {
    if (!accountId) {
      toast({ title: "활성 Threads 계정이 없습니다", variant: "destructive" });
      return false;
    }
    const res = await threadsInvoke<{ id?: string }>("createTest", {
      account_id: accountId,
      body,
      publish_at: publishAt,
    });
    if (res?.id) { toast({ title: "대기 항목 추가됨" }); load(); return true; }
    return false;
  };

  useEffect(() => {
    if (chatOpen && chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chat, chatOpen]);

  const runWorker = async () => {
    setRunning(true);
    const password = sessionStorage.getItem("admin_pw");
    const { data, error } = await supabase.functions.invoke("publish-threads", { body: { password, force: true } });
    setRunning(false);
    if (error || (data as any)?.error) toast({ title: "발행 실패", description: error?.message || (data as any)?.error, variant: "destructive" });
    else toast({ title: "처리 완료", description: `${(data as any)?.processed ?? 0}건 처리됨` });
    load();
  };

  const generateNow = async () => {
    setGenerating(true);
    const password = sessionStorage.getItem("admin_pw");
    const { data, error } = await supabase.functions.invoke("generate-threads-from-blog", { body: { password, count: 10 } });
    setGenerating(false);
    if (error || (data as any)?.error) {
      toast({ title: "생성 실패", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "🪡 생성 완료", description: `${(data as any)?.inserted ?? 0}건 큐에 적재됨` });
      load();
    }
  };

  const retry = async (id: string) => {
    const res = await threadsInvoke<{ success: boolean }>("retry", { id });
    if (res?.success) { toast({ title: "재시도 큐에 등록됨" }); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    const res = await threadsInvoke<{ success: boolean }>("deleteItem", { id });
    if (res?.success) { toast({ title: "삭제됨" }); load(); }
  };

  const updateItem = async (id: string, patch: { body?: string; publish_at?: string; status?: "ready" | "draft"; pause_reason?: string }) => {
    const res = await threadsInvoke<{ success: boolean }>("updateItem", { id, ...patch });
    if (res?.success) { toast({ title: "수정 완료" }); load(); return true; }
    return false;
  };

  const scheduleItem = async (id: string) => {
    const res = await threadsInvoke<{ success: boolean; publish_at: string }>("scheduleItem", { id });
    if (res?.success) {
      const t = new Date(res.publish_at).toLocaleString();
      toast({ title: "예약됨", description: `다음 슬롯: ${t}` });
      load();
    }
  };

  const unscheduleItem = async (id: string) => {
    const res = await threadsInvoke<{ success: boolean }>("unscheduleItem", { id });
    if (res?.success) { toast({ title: "킵으로 되돌림" }); load(); }
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatBusy(true);
    setChatInput("");
    const optimistic: ChatMsg = {
      id: `tmp-${Date.now()}`, role: "user", content: msg,
      version_at: engine ? `v${engine.version_major}.${engine.version_minor}` : null,
      created_at: new Date().toISOString(),
    };
    setChat(prev => [...prev, optimistic]);
    const res = await engineInvoke<{ reply: string; applied_rules: string | null; version: { major: number; minor: number } }>("chat", { message: msg });
    setChatBusy(false);
    if (res) {
      await load();
      if (res.applied_rules) {
        toast({ title: `🚀 엔진 v${res.version.major}.${res.version.minor} 자동 배포!`, description: "새 룰이 다음 자동 생성부터 적용됩니다." });
      }
    }
  };

  const refreshApiKnowledge = async () => {
    setRefreshingKnowledge(true);
    const password = sessionStorage.getItem("admin_pw");
    const { data, error } = await supabase.functions.invoke("refresh-threads-api-knowledge", { body: { password } });
    setRefreshingKnowledge(false);
    if (error || (data as any)?.error) {
      toast({ title: "갱신 실패", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "📡 API 지식 갱신 완료", description: `${(data as any)?.length ?? 0}자 학습` });
      load();
    }
  };

  // 대기 컬럼: 킵(draft)을 위로, 예약된(ready/publishing)을 아래로 — publish_at 빠른 순
  const keepItems = items
    .filter(i => i.status === "draft")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const scheduledItems = items
    .filter(i => i.status === "ready" || i.status === "publishing")
    .sort((a, b) => new Date(a.publish_at).getTime() - new Date(b.publish_at).getTime());
  const grouped = {
    ready: [...keepItems, ...scheduledItems],
    published: items.filter(i => i.status === "published"),
    failed: items.filter(i => i.status === "failed"),
  };

  const versionStr = engine ? `v${engine.version_major}.${engine.version_minor}` : "v—";
  const characterName = engine?.character_name || "쓰레드튜너";
  const characterTagline = engine?.character_tagline || "Threads 발행 전문가";
  const characterVoiceShort = (engine?.character_voice || "").split(/[.!?]/)[0];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-bold">Thread Tuner</h1>
          <p className="hidden md:block text-sm text-muted-foreground">
            {characterName} · {characterTagline} · 엔진 {versionStr}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> 새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={generateNow} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            지금 생성
          </Button>
          <Button size="sm" onClick={runWorker} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
            지금 발행
          </Button>
        </div>
      </div>

      {/* 캐릭터 카드 */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="shrink-0">
              <PixelEngine major={engine?.version_major ?? 1} minor={engine?.version_minor ?? 0} size={72} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm md:text-base">{characterName}</span>
                <Badge className="bg-primary/10 text-primary font-mono normal-case">{versionStr}</Badge>
              </div>
              <p className="text-[11px] md:text-xs text-muted-foreground">{characterTagline}</p>
              {characterVoiceShort && (
                <p className="text-[11px] md:text-xs italic text-foreground/70 line-clamp-1">"{characterVoiceShort}"</p>
              )}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                <Radio className="w-3 h-3" />
                <span>API 지식: {timeAgo(engine?.api_knowledge_updated_at ?? null)}</span>
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 min-w-0 order-2">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  대화로 룰 수정하기
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 pb-2 border-b">
                  <DialogTitle className="flex items-center gap-2 text-base">
                    💬 {characterName} <span className="font-mono text-xs text-muted-foreground">{versionStr}</span>
                  </DialogTitle>
                  <p className="text-[11px] text-muted-foreground">대화 1회 = 마이너 +1 · 적용 = 메이저 +1</p>
                </DialogHeader>

                <div ref={chatBoxRef} className="flex-1 min-h-[240px] overflow-y-auto space-y-2 p-4 bg-muted/20">
                  {chat.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-10">
                      {characterName}에게 룰 변경을 제안해보세요.<br />
                      <span className="opacity-60">예: "이모지 빼", "질문형으로 통일"</span>
                    </p>
                  )}
                  {chat.map(m => <ChatBubble key={m.id} msg={m} />)}
                  {chatBusy && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> {characterName}가 생각하는 중...
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 p-3 border-t bg-background">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="룰을 어떻게 바꿀까요?"
                    disabled={chatBusy}
                    className="h-9 text-sm"
                  />
                  <Button size="sm" onClick={sendChat} disabled={chatBusy || !chatInput.trim()} className="h-9">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 min-w-0 order-1">
                  <ScrollText className="w-4 h-4 mr-1" /> 현재 룰
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 pb-2 border-b">
                  <DialogTitle className="text-base">📜 {characterName}의 두뇌</DialogTitle>
                </DialogHeader>

                {/* 탭 */}
                <div className="flex border-b shrink-0">
                  <button
                    onClick={() => setRulesTab("rules")}
                    className={cn("flex-1 px-3 py-2 text-xs font-semibold border-b-2 transition",
                      rulesTab === "rules" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>
                    룰 {versionStr}
                  </button>
                  <button
                    onClick={() => setRulesTab("api")}
                    className={cn("flex-1 px-3 py-2 text-xs font-semibold border-b-2 transition",
                      rulesTab === "api" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>
                    학습된 지식
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {rulesTab === "rules" ? (
                    <>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">현재 적용 중 ({versionStr})</p>
                        <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded p-3 font-mono leading-relaxed">{engine?.rules || "(없음)"}</pre>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 학습 루프 상태 패널 */}
                      {(() => {
                        const updatedAt = engine?.api_knowledge_updated_at ? new Date(engine.api_knowledge_updated_at) : null;
                        const nextAt = updatedAt ? new Date(updatedAt.getTime() + 30 * 86400000) : null;
                        const daysLeft = nextAt ? Math.max(0, Math.ceil((nextAt.getTime() - Date.now()) / 86400000)) : null;
                        const isHealthy = updatedAt && (Date.now() - updatedAt.getTime()) < 35 * 86400000;
                        return (
                          <div className="rounded-lg border border-border bg-gradient-to-br from-primary/5 to-background p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("w-1.5 h-1.5 rounded-full", isHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                                <p className="text-[11px] font-bold">🔄 학습 루프</p>
                                <Badge className={cn("text-[9px]", isHealthy ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
                                  {isHealthy ? "정상" : updatedAt ? "갱신 권장" : "미학습"}
                                </Badge>
                              </div>
                              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={refreshApiKnowledge} disabled={refreshingKnowledge}>
                                {refreshingKnowledge ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                                지금 갱신
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[10px]">
                              <div>
                                <p className="text-muted-foreground">마지막</p>
                                <p className="font-mono font-semibold">{timeAgo(engine?.api_knowledge_updated_at ?? null)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">다음 예정</p>
                                <p className="font-mono font-semibold">{daysLeft !== null ? `${daysLeft}일 후` : "—"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">주기</p>
                                <p className="font-mono font-semibold">월 1회</p>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed pt-1 border-t border-border/50">
                              출처: Meta Threads Graph API 공식 문서 (Perplexity sonar-pro) → {characterName}의 모든 답변·자동 발행에 자동 주입
                            </p>
                          </div>
                        );
                      })()}

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">학습 내용</p>
                        <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded p-3 font-mono leading-relaxed">
                          {engine?.api_knowledge || "(아직 학습되지 않음 — 위 [지금 갱신]을 눌러 Meta Threads Graph API 스펙을 학습시키세요)"}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* 큐 목록: 대기 → 성공 → 실패 */}
      <div className="grid gap-3 md:grid-cols-3">
        <QueueColumn
          title={`대기 (킵 ${keepItems.length} · 예약 ${scheduledItems.length})`}
          items={grouped.ready}
          onRetry={retry} onDelete={remove} onUpdate={updateItem}
          onCreate={createItem} onSchedule={scheduleItem} onUnschedule={unscheduleItem}
          topSlot={<AutogenRuleCard settings={autogen} onSave={saveAutogen} />}
        />
        <QueueColumn title={`성공 (${grouped.published.length})`} items={grouped.published} onRetry={retry} onDelete={remove} onUpdate={updateItem} />
        <QueueColumn title={`실패 (${grouped.failed.length})`} items={grouped.failed} onRetry={retry} onDelete={remove} onUpdate={updateItem} />
      </div>
    </div>
  );
}


function ChatBubble({ msg }: { msg: ChatMsg }) {
  if (msg.role === "system") {
    return (
      <div className="text-center text-[11px] text-muted-foreground py-1.5 border-y border-dashed border-border my-1">
        {msg.content}
      </div>
    );
  }
  const isUser = msg.role === "user";
  const displayContent = msg.content.replace(/PROPOSED_RULES:[\s\S]*?END_RULES/g, "").trim() || msg.content;
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs whitespace-pre-wrap",
        isUser ? "bg-primary text-primary-foreground" : "bg-background border border-border"
      )}>
        {displayContent}
        {msg.version_at && (
          <div className={cn("text-[9px] font-mono mt-0.5 opacity-60", isUser ? "text-primary-foreground" : "text-muted-foreground")}>
            {msg.version_at}
          </div>
        )}
      </div>
    </div>
  );
}

function QueueColumn({ title, items, onRetry, onDelete, onUpdate, onCreate, onSchedule, onUnschedule, topSlot }: {
  title: string;
  items: QueueItem[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: { body?: string; publish_at?: string; status?: "ready" | "draft"; pause_reason?: string }) => Promise<boolean>;
  onCreate?: (body: string, publishAt: string) => Promise<boolean>;
  onSchedule?: (id: string) => void;
  onUnschedule?: (id: string) => void;
  topSlot?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {topSlot}
        {onCreate && <NewItemForm onCreate={onCreate} />}

        {items.length === 0 && <p className="text-xs text-muted-foreground">항목 없음</p>}
        {items.map(it => (
          <QueueCard
            key={it.id} item={it}
            onRetry={onRetry} onDelete={onDelete} onUpdate={onUpdate}
            onSchedule={onSchedule} onUnschedule={onUnschedule}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function AutogenRuleCard({ settings, onSave }: {
  settings: AutogenSettings | null;
  onSave: (patch: Partial<AutogenSettings>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AutogenSettings | null>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(settings); }, [settings]);

  if (!settings) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-1.5 text-[11px] text-muted-foreground">
        자동 생성 룰 로딩 중…
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const timeStr = `${pad(settings.hour_kst)}:${pad(settings.minute_kst)}`;
  const slotStr = `${settings.slot_start_hour_kst}~${settings.slot_end_hour_kst}시`;

  const submit = async () => {
    if (!draft) return;
    setSaving(true);
    const ok = await onSave({
      enabled: draft.enabled,
      daily_count: draft.daily_count,
      hour_kst: draft.hour_kst,
      minute_kst: draft.minute_kst,
      slot_start_hour_kst: draft.slot_start_hour_kst,
      slot_end_hour_kst: draft.slot_end_hour_kst,
    });
    setSaving(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative w-full rounded-full border px-3 py-2 flex items-center gap-2.5 text-left transition-all overflow-hidden",
            settings.enabled
              ? "border-primary/50 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 shadow-[0_0_20px_-8px_hsl(var(--primary))] hover:shadow-[0_0_28px_-6px_hsl(var(--primary))]"
              : "border-dashed border-border bg-muted/20 hover:bg-muted/40",
          )}
          title={settings.enabled ? "자동 생성 작동 중 — 클릭해서 설정" : "자동 생성 OFF — 클릭해서 설정"}
        >
          <span className={cn(
            "shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors",
            settings.enabled
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}>
            <RotateCw className={cn(
              "w-3.5 h-3.5",
              settings.enabled && "animate-spin [animation-duration:3s]",
            )} />
          </span>
          <span className="flex-1 min-w-0 text-[11px] truncate">
            <span className={cn("font-semibold", settings.enabled ? "text-primary" : "text-muted-foreground")}>
              {settings.enabled ? `자동 생성 중 · 매일 ${timeStr} KST` : "자동 생성 OFF"}
            </span>
            <span className="text-muted-foreground">
              {settings.enabled ? ` · ${settings.daily_count}개 · ${slotStr} 발행` : ` · 수동 생성만 사용`}
            </span>
          </span>
          <Settings2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95vw] p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-primary" /> 자동 생성 룰
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            매일 정해진 시각에 블로그 글에서 Threads 초안을 자동으로 만들어 <strong>킵(draft)</strong> 상태로 적재합니다. 체크박스를 누르면 다음 빈 슬롯에 자동 예약됩니다.
          </p>
        </DialogHeader>
        {draft && (
          <div className="p-4 space-y-4">
            {/* 활성 토글 */}
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-xs font-semibold">자동 생성 활성화</p>
                <p className="text-[10px] text-muted-foreground">OFF 시 cron이 호출돼도 생성을 건너뜁니다</p>
              </div>
              <Switch
                checked={draft.enabled}
                onCheckedChange={v => setDraft({ ...draft, enabled: v })}
              />
            </div>

            {/* 개수 */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">하루 생성 개수 (1~30)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={draft.daily_count}
                onChange={e => setDraft({ ...draft, daily_count: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })}
                className="h-8 text-xs"
              />
            </div>

            {/* 실행 시각 */}
            <div className="space-y-1.5">
              <Label className="text-[11px] flex items-center gap-1"><Clock className="w-3 h-3" /> 실행 시각 (KST)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min={0} max={23}
                  value={draft.hour_kst}
                  onChange={e => setDraft({ ...draft, hour_kst: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
                  className="h-8 text-xs w-20"
                />
                <span className="text-xs">:</span>
                <Input
                  type="number" min={0} max={59}
                  value={draft.minute_kst}
                  onChange={e => setDraft({ ...draft, minute_kst: Math.min(59, Math.max(0, Number(e.target.value) || 0)) })}
                  className="h-8 text-xs w-20"
                />
                <span className="text-[11px] text-muted-foreground">
                  → {pad(draft.hour_kst)}:{pad(draft.minute_kst)} KST
                </span>
              </div>
            </div>

            {/* 발행 슬롯 시간대 */}
            <div className="space-y-1.5">
              <Label className="text-[11px]">발행 슬롯 시간대 (KST, 체크 시 자동 배정)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min={0} max={23}
                  value={draft.slot_start_hour_kst}
                  onChange={e => setDraft({ ...draft, slot_start_hour_kst: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
                  className="h-8 text-xs w-20"
                />
                <span className="text-xs">~</span>
                <Input
                  type="number" min={0} max={23}
                  value={draft.slot_end_hour_kst}
                  onChange={e => setDraft({ ...draft, slot_end_hour_kst: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
                  className="h-8 text-xs w-20"
                />
                <span className="text-[11px] text-muted-foreground">시</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                예: 10~19 → 매시 정각에 10개 슬롯이 열립니다.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setDraft(settings); setOpen(false); }}>취소</Button>
              <Button size="sm" className="h-8 text-xs" onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                저장
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}



function NewItemForm({ onCreate }: { onCreate: (body: string, publishAt: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [at, setAt] = useState(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    const ok = await onCreate(body.trim().slice(0, 500), new Date(at).toISOString());
    setSaving(false);
    if (ok) { setBody(""); setOpen(false); }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition"
      >
        + 새 대기 항목 추가
      </button>
    );
  }
  return (
    <div className="rounded-md border border-primary/40 bg-primary/5 p-2.5 space-y-2">
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value.slice(0, 500))}
        rows={3}
        placeholder="본문 (URL 포함, 480자 권장)"
        className="text-xs font-mono"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
        <Input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} className="h-7 text-[11px] flex-1" />
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">{compactTime(new Date(at).toISOString())}</span>
      </div>
      <div className="flex gap-1.5 justify-end">
        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { setOpen(false); setBody(""); }}>취소</Button>
        <Button size="sm" className="h-7 text-[11px]" onClick={submit} disabled={saving || !body.trim()}>
          {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          예약
        </Button>
      </div>
    </div>
  );
}

// ISO → datetime-local input value (로컬 타임존 기준)
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 본문에서 제목 한 줄 추출 (URL/이모지 라인 제외)
function extractTitle(body: string): string {
  const lines = (body || "").split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^https?:\/\//i.test(line)) continue;
    return line.replace(/\s+👉\s*$/, "");
  }
  return body.slice(0, 60);
}

// 시각 콤팩트 포맷: 오늘이면 HH:mm, 아니면 MM/DD HH:mm
function compactTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const same = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return same ? hm : `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${hm}`;
}

function QueueCard({ item, onRetry, onDelete, onUpdate, onSchedule, onUnschedule }: {
  item: QueueItem;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: { body?: string; publish_at?: string; status?: "ready" | "draft"; pause_reason?: string }) => Promise<boolean>;
  onSchedule?: (id: string) => void;
  onUnschedule?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editBody, setEditBody] = useState(item.body);
  const [editAt, setEditAt] = useState(toLocalInput(item.publish_at));
  const [editStatus, setEditStatus] = useState<"ready" | "draft">(item.status === "draft" ? "draft" : "ready");
  const [pauseReason, setPauseReason] = useState(item.pause_reason ?? "");
  const [saving, setSaving] = useState(false);

  const editable = item.status === "ready" || item.status === "failed" || item.status === "draft";
  const isKept = item.status === "draft";
  const isScheduled = item.status === "ready" || item.status === "publishing";
  const title = extractTitle(item.body);

  const toggle = () => {
    if (!expanded) {
      setEditBody(item.body);
      setEditAt(toLocalInput(item.publish_at));
      setEditStatus(item.status === "draft" ? "draft" : "ready");
      setPauseReason(item.pause_reason ?? "");
    }
    setExpanded(v => !v);
  };

  const save = async () => {
    if (editStatus === "draft" && !pauseReason.trim()) {
      toast({ title: "정지 사유를 입력해주세요", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ok = await onUpdate(item.id, {
      body: editBody,
      publish_at: new Date(editAt).toISOString(),
      status: editStatus,
      pause_reason: editStatus === "draft" ? pauseReason.trim() : "",
    });
    setSaving(false);
    if (ok) setExpanded(false);
  };

  const toggleCheck = (e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    if (isKept && onSchedule) onSchedule(item.id);
    else if (isScheduled && onUnschedule) onUnschedule(item.id);
  };

  const checkable = (isKept && !!onSchedule) || (isScheduled && !!onUnschedule);

  const parts = editBody.split(/\n---\n/).map(s => s.trim()).filter(Boolean);
  const isThread = parts.length > 1;

  const addSplit = () => {
    setEditBody(b => (b.endsWith("\n") ? b : b + "\n") + "---\n");
  };

  return (
    <>
      <div className={cn("rounded-md border overflow-hidden",
        isKept ? "border-dashed border-border bg-muted/20" : "border-border")}>
        <div className={cn(
          "w-full px-2 py-1.5 flex items-center gap-2 transition",
          (editable || item.published_url) && "hover:bg-muted/40",
        )}>
          {checkable && (
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={toggleCheck}
              onClick={e => e.stopPropagation()}
              title={isKept ? "체크하면 다음 슬롯에 자동 예약" : "체크 해제하면 킵으로 되돌림"}
              className="shrink-0 w-3.5 h-3.5 cursor-pointer accent-primary"
            />
          )}
          <button
            type="button"
            onClick={editable || item.published_url ? toggle : undefined}
            className={cn(
              "flex-1 min-w-0 flex items-center gap-2 text-left",
              (editable || item.published_url) && "cursor-pointer",
            )}
          >
            <span className={cn("shrink-0 w-1.5 h-1.5 rounded-full",
              item.status === "published" ? "bg-emerald-500" :
              item.status === "failed" ? "bg-destructive" :
              item.status === "draft" ? "bg-muted-foreground" :
              item.status === "publishing" ? "bg-amber-500 animate-pulse" :
              "bg-blue-500"
            )} />
            <span className={cn("flex-1 min-w-0 text-xs truncate", isKept && "text-muted-foreground")} title={title}>{title}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
              {isKept ? "킵" : compactTime(item.publish_at)}
            </span>
          </button>
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{title}</DialogTitle>
          </DialogHeader>

          {editable ? (
            <div className="space-y-3">
              {item.status === "failed" && item.error_message && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-destructive mb-1">실패 사유</p>
                  <p className="text-[11px] text-destructive whitespace-pre-wrap font-mono break-all">{item.error_message}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px]">
                    본문 ({editBody.length}자)
                    {isThread && <span className="ml-2 text-primary">· 스레드 {parts.length}개로 발행</span>}
                  </Label>
                  <button
                    type="button"
                    onClick={addSplit}
                    className="text-[10px] text-primary hover:underline"
                    title="구분선(---)을 추가하면 스레드 체인으로 분할 발행됩니다"
                  >
                    + 스레드 나누기
                  </button>
                </div>
                <Textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  rows={12}
                  className="text-xs font-mono min-h-[240px]"
                />
                {isThread && (
                  <div className="rounded-md border border-border bg-muted/30 p-2 space-y-1">
                    {parts.map((p, i) => (
                      <div key={i} className="text-[10px] font-mono flex gap-2">
                        <span className="text-primary shrink-0">{i + 1}/{parts.length}</span>
                        <span className={cn("flex-1", p.length > 500 && "text-destructive")}>
                          {p.length}자{p.length > 500 ? " · 500자 초과!" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] flex items-center gap-1"><Calendar className="w-3 h-3" /> 예약 발행</Label>
                  <Input
                    type="datetime-local"
                    value={editAt}
                    onChange={e => setEditAt(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">상태</Label>
                  <div className="flex gap-1">
                    {(["ready", "draft"] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditStatus(s)}
                        className={cn(
                          "flex-1 h-8 rounded-md border text-xs font-semibold transition",
                          editStatus === s
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                        )}
                      >
                        {s === "ready" ? "예약" : "킵"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {editStatus === "draft" && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-amber-600 dark:text-amber-400">킵 사유 (필수)</Label>
                  <Textarea
                    value={pauseReason}
                    onChange={e => setPauseReason(e.target.value.slice(0, 500))}
                    rows={2}
                    className="text-xs"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {item.status === "failed" && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onRetry(item.id)}>
                    <RefreshCw className="w-3 h-3 mr-1" /> 재시도
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => onDelete(item.id)}>
                  <Trash2 className="w-3 h-3 mr-1" /> 삭제
                </Button>
                <Button size="sm" className="h-8 text-xs ml-auto" onClick={save} disabled={saving || !editBody.trim() || parts.some(p => p.length > 500)}>
                  {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs whitespace-pre-wrap">{item.body}</p>
              {item.published_url && (
                <a href={item.published_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline inline-block">
                  게시물 열기 →
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
