import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Send, RefreshCw, PlayCircle, Trash2, Loader2, CheckCircle2, X, MessageCircle } from "lucide-react";
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
  created_at: string;
};

type EngineConfig = {
  version_major: number;
  version_minor: number;
  rules: string;
  pending_rules: string | null;
};

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  version_at: string | null;
  created_at: string;
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

export default function Threads() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [engine, setEngine] = useState<EngineConfig | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const [qRes, eRes] = await Promise.all([
      threadsInvoke<{ items: QueueItem[] }>("list"),
      engineInvoke<{ config: EngineConfig; chat: ChatMsg[] }>("state"),
    ]);
    setItems(qRes?.items ?? []);
    if (eRes?.config) setEngine(eRes.config);
    if (eRes?.chat) setChat(eRes.chat);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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

  const retry = async (id: string) => {
    const res = await threadsInvoke<{ success: boolean }>("retry", { id });
    if (res?.success) { toast({ title: "재시도 큐에 등록됨" }); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    const res = await threadsInvoke<{ success: boolean }>("deleteItem", { id });
    if (res?.success) { toast({ title: "삭제됨" }); load(); }
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
    const res = await engineInvoke<{ reply: string; proposed_rules: string | null }>("chat", { message: msg });
    setChatBusy(false);
    if (res) {
      await load();
      if (res.proposed_rules) toast({ title: "✨ 룰 변경안이 도착했어요", description: "[적용]을 누르면 메이저 버전이 올라갑니다." });
    }
  };

  const applyPending = async () => {
    if (!engine?.pending_rules) return;
    if (!confirm(`이 룰을 적용하면 엔진이 v${engine.version_major + 1}.0으로 업그레이드됩니다. 진행할까요?`)) return;
    const res = await engineInvoke<{ success: boolean; version: { major: number; minor: number } }>("apply");
    if (res?.success) {
      toast({ title: `🚀 엔진 v${res.version.major}.${res.version.minor} 배포 완료!` });
      load();
    }
  };

  const resetPending = async () => {
    const res = await engineInvoke<{ success: boolean }>("reset");
    if (res?.success) { toast({ title: "변경안 폐기됨" }); load(); }
  };

  const grouped = {
    ready: items.filter(i => i.status === "ready" || i.status === "publishing" || i.status === "draft"),
    published: items.filter(i => i.status === "published"),
    failed: items.filter(i => i.status === "failed"),
  };

  const versionStr = engine ? `v${engine.version_major}.${engine.version_minor}` : "v—";

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-bold">Threads 자동 발행</h1>
          <p className="hidden md:block text-sm text-muted-foreground">룰 엔진 {versionStr} · Meta Threads Graph API</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> 새로고침
          </Button>
          <Button size="sm" onClick={runWorker} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
            지금 발행
          </Button>
        </div>
      </div>

      {/* 룰 엔진 카드 (컴팩트) */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="shrink-0">
              <PixelEngine major={engine?.version_major ?? 1} minor={engine?.version_minor ?? 0} size={72} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm md:text-base">룰 엔진</span>
                <Badge className="bg-primary/10 text-primary font-mono">{versionStr}</Badge>
                {engine?.pending_rules && (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400">⏳ 변경안 대기</Badge>
                )}
              </div>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-1 line-clamp-2">
                {engine?.rules?.split("\n")[0] || "현재 룰 없음"}
              </p>
            </div>
            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="shrink-0">
                  <MessageCircle className="w-4 h-4 md:mr-1" />
                  <span className="hidden md:inline">대화하기</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 pb-2 border-b">
                  <DialogTitle className="flex items-center gap-2 text-base">
                    💬 룰 엔진 대화 <span className="font-mono text-xs text-muted-foreground">{versionStr}</span>
                  </DialogTitle>
                  <p className="text-[11px] text-muted-foreground">대화 1회 = 마이너 +1 · 적용 = 메이저 +1</p>
                </DialogHeader>

                {engine?.pending_rules && (
                  <div className="mx-4 mt-3 space-y-2 rounded-lg border-2 border-dashed border-amber-500/50 p-2.5 bg-amber-500/5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">⏳ 대기 중인 변경안</p>
                      <span className="text-[10px] font-mono text-muted-foreground">→ v{engine.version_major + 1}.0</span>
                    </div>
                    <pre className="text-[11px] whitespace-pre-wrap bg-background/50 rounded p-2 max-h-24 overflow-y-auto font-mono">{engine.pending_rules}</pre>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={applyPending}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 적용
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={resetPending}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                <div ref={chatBoxRef} className="flex-1 min-h-[240px] overflow-y-auto space-y-2 p-4 bg-muted/20">
                  {chat.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-10">
                      엔진에게 룰 변경을 제안해보세요.<br />
                      <span className="opacity-60">예: "이모지 빼", "질문형으로 통일"</span>
                    </p>
                  )}
                  {chat.map(m => <ChatBubble key={m.id} msg={m} />)}
                  {chatBusy && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> 엔진이 생각하는 중...
                    </div>
                  )}
                </div>

                <details className="text-[11px] px-4 pt-2">
                  <summary className="cursor-pointer text-muted-foreground font-semibold uppercase tracking-wide">현재 룰 보기</summary>
                  <pre className="mt-1.5 whitespace-pre-wrap bg-muted/50 rounded p-2 max-h-32 overflow-y-auto font-mono">{engine?.rules || "(없음)"}</pre>
                </details>

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
          </div>
        </CardContent>
      </Card>

      {/* 큐 목록: 대기 → 성공 → 실패 */}
      <div className="grid gap-3 md:grid-cols-3">
        <QueueColumn title={`대기 (${grouped.ready.length})`} items={grouped.ready} onRetry={retry} onDelete={remove} />
        <QueueColumn title={`성공 (${grouped.published.length})`} items={grouped.published} onRetry={retry} onDelete={remove} />
        <QueueColumn title={`실패 (${grouped.failed.length})`} items={grouped.failed} onRetry={retry} onDelete={remove} />
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

function QueueColumn({ title, items, onRetry, onDelete }: {
  title: string; items: QueueItem[]; onRetry: (id: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground">항목 없음</p>}
        {items.map(it => (
          <div key={it.id} className="rounded-lg border border-border p-2 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Badge className={STATUS_STYLES[it.status] || ""}>{it.status}</Badge>
              <span className="text-[10px] text-muted-foreground">{new Date(it.created_at).toLocaleString()}</span>
            </div>
            <p className="text-xs whitespace-pre-wrap line-clamp-3">{it.body}</p>
            {it.error_message && <p className="text-[10px] text-destructive line-clamp-2">⚠ {it.error_message}</p>}
            {it.published_url && (
              <a href={it.published_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline">게시물 열기 →</a>
            )}
            <div className="flex gap-1">
              {it.status === "failed" && (
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onRetry(it.id)}>
                  <RefreshCw className="w-3 h-3 mr-0.5" /> 재시도
                </Button>
              )}
              {(it.status === "ready" || it.status === "failed" || it.status === "draft") && (
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-destructive" onClick={() => onDelete(it.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
