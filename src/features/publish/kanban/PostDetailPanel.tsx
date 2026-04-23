import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { ExternalLink, Save, Trash2, Archive, ArchiveRestore } from "lucide-react";
import type { KanbanPost } from "./types";
import { COLUMN_META } from "./types";

type Props = {
  post: KanbanPost | null;
  siteSlug?: string | null;
  onClose: () => void;
  onSave: (patch: { title: string; excerpt: string; content: string }) => Promise<void>;
  onDelete: () => Promise<void>;
  onArchive?: (archive: boolean) => Promise<void>;
};

export default function PostDetailPanel({ post, siteSlug, onClose, onSave, onDelete, onArchive }: Props) {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setExcerpt(post.excerpt ?? "");
      setContent(post.content ?? "");
    }
  }, [post]);

  if (!post) return null;
  const meta = COLUMN_META[post.status];

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

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              size="sm"
              className="rounded-full"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave({ title, excerpt, content });
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Save className="w-3.5 h-3.5" /> {saving ? "저장 중..." : "저장"}
            </Button>
            {post.status === "published" && siteSlug && (
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to={`/sites/${siteSlug}/${post.slug}`} target="_blank">
                  <ExternalLink className="w-3.5 h-3.5" /> 라이브
                </Link>
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
