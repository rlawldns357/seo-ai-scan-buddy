import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Calendar, GripVertical } from "lucide-react";
import type { KanbanPost, KanbanStatus } from "./types";
import { COLUMN_META } from "./types";

type Props = {
  post: KanbanPost;
  busy?: boolean;
  onOpen: (p: KanbanPost) => void;
  onAdvance?: (p: KanbanPost) => void;
  onRollDice?: (p: KanbanPost) => void;
  nextStatus?: KanbanStatus | null;
};

export default function KanbanCard({ post, busy, onOpen, onAdvance, onRollDice, nextStatus }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
    data: { post },
  });

  const meta = COLUMN_META[post.status];

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      onClick={() => !isDragging && onOpen(post)}
      className={`group relative cursor-pointer hover:border-primary/40 transition-colors border-l-2 ${meta.accent} ${busy ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 mt-0.5 text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="드래그하여 이동"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              {post.source_axis && (
                <span className="text-[9px] font-bold text-muted-foreground tracking-wider">
                  {post.source_axis}
                </span>
              )}
              {post.status === "published" && post.published_at && (
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5" />
                  {new Date(post.published_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                </span>
              )}
              {post.status === "published" && (
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                  <Eye className="h-2.5 w-2.5" />
                  {post.view_count}
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2 break-keep">
              {post.title}
            </h4>
            {post.status !== "idea" && post.excerpt && (
              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2 break-keep">
                {post.excerpt}
              </p>
            )}
          </div>
        </div>

        {/* Mobile-friendly action row */}
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {nextStatus && onAdvance && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2 rounded-full"
              onClick={(e) => { e.stopPropagation(); onAdvance(post); }}
            >
              {COLUMN_META[nextStatus].label}로 ▶
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
