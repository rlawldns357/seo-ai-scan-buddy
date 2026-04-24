import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ExternalLink, Save, Trash2, Archive, ArchiveRestore, CalendarClock, Sparkles, Loader2 } from "lucide-react";
import type { KanbanPost } from "./types";
import { COLUMN_META } from "./types";

type SavePatch = {
  title: string;
  excerpt: string;
  content: string;
  published_at?: string | null;
};

type Props = {
  post: KanbanPost | null;
  siteSlug?: string | null;
  onClose: () => void;
  onSave: (patch: SavePatch) => Promise<void>;
  onDelete: () => Promise<void>;
  onArchive?: (archive: boolean) => Promise<void>;
  /** Generate (or regenerate) body via AI for a draft. Receives current title from the form. */
  onGenerateBody?: (title: string) => Promise<{ title?: string; excerpt?: string; content?: string } | void>;
};

/** ISO → "YYYY-MM-DDTHH:mm" (browser local) for <input type="datetime-local">. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function PostDetailPanel({ post, siteSlug, onClose, onSave, onDelete, onArchive, onGenerateBody }: Props) {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setExcerpt(post.excerpt ?? "");
      setContent(post.content ?? "");
      setScheduledLocal(isoToLocalInput(post.published_at));
    }
  }, [post]);

  const isDraftLike = post && (post.status === "draft" || post.status === "idea");
  const showScheduler = post && (post.status === "draft" || post.status === "scheduled" || post.status === "idea");
  const isPastDue = useMemo(() => {
    if (!scheduledLocal) return false;
    const t = new Date(scheduledLocal).getTime();
    return Number.isFinite(t) && t < Date.now();
  }, [scheduledLocal]);

  if (!post) return null;
  const meta = COLUMN_META[post.status];
  const hasBody = (content?.trim().length ?? 0) >= 30;

  return (
    <Sheet open={!!post} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="px-1.5 py-0.5 rounded bg-muted font-bold">
              {meta.emoji} {meta.label}
            </span>
            {post.source_axis && <span>{post.source_axis}</span>}
          </div>
          <SheetTitle className="text-lg break-keep">{title || "(제목 없음)"}</SheetTitle>
          <SheetDescription className="text-xs">
            카드를 다른 칸으로 드래그하면 상태가 바뀝니다.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="post-title" className="text-xs">제목</Label>
            <Input id="post-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="post-excerpt" className="text-xs">요약</Label>
            <Input id="post-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="post-content" className="text-xs">본문 (마크다운)</Label>
            <textarea
              id="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[280px] rounded-md border border-input bg-background p-3 text-xs font-mono"
            />
          </div>

          {showScheduler && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <Label htmlFor="post-scheduled" className="text-xs flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> 예약 발행 시각
              </Label>
              <Input
                id="post-scheduled"
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className="mt-1.5 h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {scheduledLocal ? (
                  isPastDue ? (
                    <>지정 시각이 이미 지났어요. <span className="text-foreground font-semibold">저장 시 1분 안에 자동 발행</span>됩니다.</>
                  ) : (
                    <><span className="text-foreground font-semibold">{new Date(scheduledLocal).toLocaleString("ko-KR")}</span>에 자동 발행됩니다. (저장 후 ‘발행 대기’로 이동)</>
                  )
                ) : (
                  "비워두면 수동 발행. 시각을 지정하면 저장 시 ‘발행 대기’로 이동하고, 시각이 되면 자동 발행됩니다."
                )}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              size="sm"
              className="rounded-full"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave({
                    title,
                    excerpt,
                    content,
                    ...(showScheduler ? { published_at: localInputToIso(scheduledLocal) } : {}),
                  });
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Save className="w-3.5 h-3.5" /> {saving ? "저장 중..." : "저장"}
            </Button>
            {(post.status === "published" || post.status === "archived") && siteSlug && (
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to={`/sites/${siteSlug}/${post.slug}`} target="_blank">
                  <ExternalLink className="w-3.5 h-3.5" /> 라이브
                </Link>
              </Button>
            )}
            {post.status === "published" && onArchive && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => onArchive(true)}
                title="칸반에서 숨겨요. 라이브 사이트에는 그대로 노출됩니다."
              >
                <Archive className="w-3.5 h-3.5" /> 보관
              </Button>
            )}
            {post.status === "archived" && onArchive && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => onArchive(false)}
              >
                <ArchiveRestore className="w-3.5 h-3.5" /> 발행됨으로 복원
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-destructive hover:text-destructive ml-auto"
              onClick={async () => {
                if (!confirm("이 글을 영구 삭제할까요?")) return;
                await onDelete();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> 삭제
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
