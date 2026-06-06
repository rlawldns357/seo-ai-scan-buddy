import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const Badge = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", className)}>{children}</span>
);
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cn("flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", props.className)} />
);
import { Send, RefreshCw, PlayCircle, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { adminInvoke } from "./_lib";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

async function threadsInvoke<T = any>(action: string, extra: Record<string, any> = {}): Promise<T | null> {
  const password = sessionStorage.getItem("admin_pw");
  if (!password) return null;
  const { data, error } = await supabase.functions.invoke("admin-threads", {
    body: { password, action, ...extra },
  });
  if (error) {
    toast({ title: "요청 실패", description: error.message, variant: "destructive" });
    return null;
  }
  if ((data as any)?.error) {
    toast({ title: "요청 실패", description: (data as any).error, variant: "destructive" });
    return null;
  }
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

  const [accountId, setAccountId] = useState<string>("");
  const [body, setBody] = useState("");
  const [mediaType, setMediaType] = useState<"TEXT" | "IMAGE">("TEXT");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState(""); // datetime-local string

  const load = async () => {
    setLoading(true);
    const [qRes, aRes] = await Promise.all([
      threadsInvoke<{ items: QueueItem[] }>("list"),
      threadsInvoke<{ items: Account[] }>("accounts"),
    ]);
    setItems(qRes?.items ?? []);
    setAccounts(aRes?.items ?? []);
    if (!accountId && aRes?.items?.[0]) setAccountId(aRes.items[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const create = async () => {
    if (!accountId) { toast({ title: "계정을 선택해주세요", variant: "destructive" }); return; }
    if (!body.trim()) { toast({ title: "본문을 입력해주세요", variant: "destructive" }); return; }
    if (mediaType === "IMAGE" && !mediaUrl.trim()) { toast({ title: "이미지 URL을 입력해주세요", variant: "destructive" }); return; }
    const res = await threadsInvoke<{ id: string }>("createTest", {
      account_id: accountId,
      body,
      media_type: mediaType,
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
    if (error || (data as any)?.error) {
      toast({ title: "발행 실패", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: `처리 완료`, description: `${(data as any)?.processed ?? 0}건 처리됨` });
    }
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

  const grouped = {
    ready: items.filter(i => i.status === "ready" || i.status === "publishing" || i.status === "draft"),
    published: items.filter(i => i.status === "published"),
    failed: items.filter(i => i.status === "failed"),
  };

  const generateFromBlog = async () => {
    const password = sessionStorage.getItem("admin_pw");
    const { data, error } = await supabase.functions.invoke("generate-threads-from-blog", {
      body: { password, count: 3 },
    });
    if (error || (data as any)?.error) {
      toast({ title: "생성 실패", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "블로그 글에서 생성 완료", description: `${(data as any)?.inserted ?? 0}건 큐에 추가됨` });
      load();
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg md:text-2xl font-bold">Threads 자동 발행</h1>
          <p className="hidden md:block text-sm text-muted-foreground">Meta Threads API 직접 연동 MVP</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> 새로고침
          </Button>
          <Button variant="secondary" size="sm" onClick={generateFromBlog}>
            ✨ 블로그→Threads 3건 생성
          </Button>
          <Button size="sm" onClick={runWorker} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
            지금 발행 실행
          </Button>
        </div>
      </div>


      {/* 계정 상태 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">연결된 계정</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              연결된 Threads 계정이 없습니다. <code className="font-mono">social_accounts</code> 테이블에 access_token, threads_user_id, username을 수동으로 INSERT해주세요.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {accounts.map(a => (
                <div key={a.id} className={`rounded-lg border p-3 cursor-pointer ${accountId === a.id ? "border-primary bg-primary/5" : "border-border"}`} onClick={() => setAccountId(a.id)}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">@{a.username || "(username 없음)"}</p>
                    <Badge className={STATUS_STYLES[a.status] || ""}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">user_id: {a.threads_user_id || "없음"}</p>
                  {a.token_expires_at && (
                    <p className="text-[11px] text-muted-foreground">토큰 만료: {new Date(a.token_expires_at).toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 신규 게시 폼 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">새 게시글 생성</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={mediaType === "TEXT" ? "default" : "outline"} onClick={() => setMediaType("TEXT")}>텍스트</Button>
            <Button type="button" size="sm" variant={mediaType === "IMAGE" ? "default" : "outline"} onClick={() => setMediaType("IMAGE")}>
              <ImageIcon className="w-4 h-4 mr-1" /> 이미지
            </Button>
          </div>
          <Textarea placeholder="본문 (최대 500자)" value={body} onChange={e => setBody(e.target.value)} rows={4} maxLength={500} />
          {mediaType === "IMAGE" && (
            <Input placeholder="이미지 URL (https://...) — Meta가 공개적으로 접근 가능해야 함" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-muted-foreground">예약 시각 (비우면 즉시):</label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-auto" />
            <div className="flex-1" />
            <Button onClick={create} disabled={!accountId}>
              <Send className="w-4 h-4 mr-1" /> 큐에 추가
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ⚠️ access_token은 절대 프론트에 노출되지 않습니다. Meta API 호출은 Edge Function에서만 수행됩니다.
          </p>
        </CardContent>
      </Card>

      {/* 큐 목록 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <QueueColumn title={`대기/진행 (${grouped.ready.length})`} items={grouped.ready} onRetry={retry} onDelete={remove} />
        <QueueColumn title={`성공 (${grouped.published.length})`} items={grouped.published} onRetry={retry} onDelete={remove} />
        <QueueColumn title={`실패 (${grouped.failed.length})`} items={grouped.failed} onRetry={retry} onDelete={remove} />
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
          <div key={it.id} className="rounded-lg border border-border p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Badge className={STATUS_STYLES[it.status] || ""}>{it.status}</Badge>
              <span className="text-[10px] text-muted-foreground">{new Date(it.created_at).toLocaleString()}</span>
            </div>
            <p className="text-xs whitespace-pre-wrap line-clamp-4">{it.body}</p>
            {it.media_type === "IMAGE" && it.media_url && (
              <p className="text-[10px] text-muted-foreground truncate">🖼 {it.media_url}</p>
            )}
            {it.error_message && (
              <p className="text-[11px] text-destructive line-clamp-3">⚠ {it.error_message} (재시도 {it.retry_count}회)</p>
            )}
            {it.published_url && (
              <a href={it.published_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline">게시물 열기 →</a>
            )}
            <div className="flex gap-1 pt-1">
              {it.status === "failed" && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRetry(it.id)}>
                  <RefreshCw className="w-3 h-3 mr-1" /> 재시도
                </Button>
              )}
              {(it.status === "ready" || it.status === "failed" || it.status === "draft") && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => onDelete(it.id)}>
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
