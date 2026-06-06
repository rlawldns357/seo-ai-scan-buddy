import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, RefreshCw, PlayCircle, Trash2, Image as ImageIcon, Loader2, Sparkles, CheckCircle2, X } from "lucide-react";
import { adminInvoke } from "./_lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import PixelEngine from "@/components/admin/PixelEngine";

const Badge = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", className)}>{children}</span>
);
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cn("flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", props.className)} />
);

type QueueItem = {
  id: string;
  account_id: string | null;
  body: string;
  media_type: "TEXT" | "IMAGE";
  media_url: string | null;
  publish_at: string;
  status: "draft" | "ready" | "publishing" | "published" | "failed";
  threads_post_id: string | null;
  published_url: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
};

type Account = {
  id: string;
  threads_user_id: string | null;
  username: string | null;
  status: string;
  token_expires_at: string | null;
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
  const { data, error } = await supabase.functions.invoke("admin-threads", {
    body: { password, action, ...extra },
  });
  if (error) { toast({ title: "요청 실패", description: error.message, variant: "destructive" }); return null; }
  if ((data as any)?.error) { toast({ title: "요청 실패", description: (data as any).error, variant: "destructive" }); return null; }
  return data as T;
}

async function engineInvoke<T = any>(action: string, extra: Record<string, any> = {}): Promise<T | null> {
  const password = sessionStorage.getItem("admin_pw");
  if (!password) return null;
  const { data, error } = await supabase.functions.invoke("threads-engine-chat", {
    body: { password, action, ...extra },
  });
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [accountId, setAccountId] = useState<string>("");
  const [body, setBody] = useState("");
  const [mediaType, setMediaType] = useState<"TEXT" | "IMAGE">("TEXT");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Engine + chat
  const [engine, setEngine] = useState<EngineConfig | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const [qRes, aRes, eRes] = await Promise.all([
      threadsInvoke<{ items: QueueItem[] }>("list"),
      threadsInvoke<{ items: Account[] }>("accounts"),
      engineInvoke<{ config: EngineConfig; chat: ChatMsg[] }>("state"),
    ]);
    setItems(qRes?.items ?? []);
    setAccounts(aRes?.items ?? []);
    if (!accountId && aRes?.items?.[0]) setAccountId(aRes.items[0].id);
    if (eRes?.config) setEngine(eRes.config);
    if (eRes?.chat) setChat(eRes.chat);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chat]);

  const create = async () => {
    if (!accountId) { toast({ title: "계정을 선택해주세요", variant: "destructive" }); return; }
    if (!body.trim()) { toast({ title: "본문을 입력해주세요", variant: "destructive" }); return; }
    if (mediaType === "IMAGE" && !mediaUrl.trim()) { toast({ title: "이미지 URL을 입력해주세요", variant: "destructive" }); return; }
    const res = await threadsInvoke<{ id: string }>("createTest", {
      account_id: accountId, body, media_type: mediaType,
      media_url: mediaType === "IMAGE" ? mediaUrl : null,
      publish_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
    });
    if (res?.id) {
      toast({ title: "큐에 추가되었습니다" });
      setBody(""); setMediaUrl(""); setScheduledAt("");
      load();
    }
  };

  const runWorker = async () => {
    setRunning(true);
    const password = sessionStorage.getItem("admin_pw");
    const { data, error } = await supabase.functions.invoke("publish-threads", { body: { password } });
    setRunning(false);
    if (error || (data as any)?.error) toast({ title: "발행 실패", description: error?.message || (data as any)?.error, variant: "destructive" });
    else toast({ title: `처리 완료`, description: `${(data as any)?.processed ?? 0}건 처리됨` });
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

  const generateFromBlog = async () => {
    setGenerating(true);
    const password = sessionStorage.getItem("admin_pw");
    const { data, error } = await supabase.functions.invoke("generate-threads-from-blog", {
      body: { password, count: 3 },
    });
    setGenerating(false);
    if (error || (data as any)?.error) toast({ title: "생성 실패", description: error?.message || (data as any)?.error, variant: "destructive" });
    else { toast({ title: "블로그→Threads 생성 완료", description: `${(data as any)?.inserted ?? 0}건 큐에 추가됨` }); load(); }
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatBusy(true);
    setChatInput("");
    // 낙관적
    const optimistic: ChatMsg = {
      id: `tmp-${Date.now()}`, role: "user", content: msg,
      version_at: engine ? `v${engine.version_major}.${engine.version_minor}` : null,
      created_at: new Date().toISOString(),
    };
    setChat(prev => [...prev, optimistic]);
    const res = await engineInvoke<{ reply: string; proposed_rules: string | null; version: { major: number; minor: number } }>("chat", { message: msg });
    setChatBusy(false);
    if (res) {
      await load();
      if (res.proposed_rules) {
        toast({ title: "✨ 룰 변경안이 도착했어요", description: "오른쪽 카드에서 [적용]을 누르면 메이저 버전이 올라갑니다." });
      }
    }
  };

  const applyPending = async () => {
    if (!engine?.pending_rules) return;
    if (!confirm(`이 룰을 적용하면 엔진이 v${engine.version_major + 1}.0으로 업그레이드됩니다. 진행할까요?`)) return;
    const res = await engineInvoke<{ success: boolean; version: { major: number; minor: number } }>("apply");
    if (res?.success) {
      toast({ title: `🚀 엔진 v${res.version.major}.${res.version.minor} 배포 완료!`, description: "다음 자동 생성부터 새 룰이 적용됩니다." });
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
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

      {/* 상단 3열: 자동 생성 | 수동 게시 | 룰 엔진 챗 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 섹션 A: 자동 생성 */}
        <Card className="border-primary/30 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              자동 생성
              <Badge className="bg-primary/10 text-primary font-mono">엔진 {versionStr}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col">
            <p className="text-xs text-muted-foreground flex-1">
              최근 30일 내 미사용 블로그 글에서 자동으로 3건을 골라 훅을 생성하고 큐에 적재합니다.
              현재 룰 엔진({versionStr})의 카피 스타일이 적용됩니다.
            </p>
            <Button onClick={generateFromBlog} disabled={generating} className="w-full">
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              ✨ 블로그→Threads 3건 생성
            </Button>
          </CardContent>
        </Card>

        {/* 섹션 B: 수동 게시 */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2"><CardTitle className="text-base">수동 게시 (테스트)</CardTitle></CardHeader>
          <CardContent className="space-y-3 flex-1">
            {accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">연결된 Threads 계정이 없습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map(a => (
                  <button key={a.id} onClick={() => setAccountId(a.id)}
                    className={cn("rounded-full border px-3 py-1 text-xs", accountId === a.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                    @{a.username || "?"} <span className="ml-1 opacity-60">{a.status}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={mediaType === "TEXT" ? "default" : "outline"} onClick={() => setMediaType("TEXT")}>텍스트</Button>
              <Button type="button" size="sm" variant={mediaType === "IMAGE" ? "default" : "outline"} onClick={() => setMediaType("IMAGE")}>
                <ImageIcon className="w-4 h-4 mr-1" /> 이미지
              </Button>
            </div>
            <Textarea placeholder="본문 (최대 500자)" value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={500} />
            {mediaType === "IMAGE" && (
              <Input placeholder="이미지 URL (https://...)" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-auto" />
              <div className="flex-1" />
              <Button onClick={create} disabled={!accountId} size="sm">
                <Send className="w-4 h-4 mr-1" /> 큐에 추가
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 섹션 C: 룰 엔진 + 챗 */}
        <Card className="flex flex-col overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">💬 룰 엔진</span>
              <span className="font-mono text-xs text-muted-foreground">{versionStr}</span>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">대화 1회 = 마이너 +1 · 적용 = 메이저 +1</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            {/* 픽셀 엔진 */}
            <div className="flex items-center justify-center py-2">
              <PixelEngine major={engine?.version_major ?? 1} minor={engine?.version_minor ?? 0} size={96} />
            </div>

            {/* 대기 중인 변경안 */}
            {engine?.pending_rules && (
              <div className="space-y-2 rounded-lg border-2 border-dashed border-amber-500/50 p-2.5 bg-amber-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">⏳ 대기 중인 변경안</p>
                  <span className="text-[10px] font-mono text-muted-foreground">→ v{(engine.version_major) + 1}.0</span>
                </div>
                <pre className="text-[11px] whitespace-pre-wrap bg-background/50 rounded p-2 max-h-20 overflow-y-auto font-mono">{engine.pending_rules}</pre>
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

            {/* 챗 영역 */}
            <div ref={chatBoxRef} className="flex-1 min-h-[180px] max-h-[280px] overflow-y-auto space-y-2 rounded-md bg-muted/30 p-2.5">
              {chat.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
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

            {/* 현재 룰 (접힌 형태) */}
            <details className="text-[11px]">
              <summary className="cursor-pointer text-muted-foreground font-semibold uppercase tracking-wide">현재 룰 보기</summary>
              <pre className="mt-1.5 whitespace-pre-wrap bg-muted/50 rounded p-2 max-h-32 overflow-y-auto font-mono">
                {engine?.rules || "(없음)"}
              </pre>
            </details>

            {/* 입력 */}
            <div className="flex gap-1.5">
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
          </CardContent>
        </Card>
      </div>

      {/* 큐 목록 (하단 전체 너비) */}
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
  // PROPOSED_RULES 블록 가리기 (오른쪽 카드에서 따로 보여줌)
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
            {it.error_message && (
              <p className="text-[10px] text-destructive line-clamp-2">⚠ {it.error_message}</p>
            )}
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
