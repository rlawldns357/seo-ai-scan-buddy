import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";
import type { KanbanPost, KanbanStatus } from "./types";
import { COLUMN_META } from "./types";
import { isToday } from "./scheduleUtils";

const EMPTY_HINTS: Record<KanbanStatus, string> = {
  idea: "아직 아이디어가 없어요",
  draft: "아직 초안이 없어요",
  scheduled: "‘AI로 새 글 추가’를 눌러 발행 대기 큐를 채우세요",
  published: "아직 발행된 글이 없어요",
  archived: "보관된 글이 없어요",
};

type Props = {
  status: KanbanStatus;
  count: number;
  isEmpty?: boolean;
  /** Used by `scheduled` column to render the small summary line. */
  posts?: KanbanPost[];
  children: ReactNode;
};

export default function KanbanColumn({ status, count, isEmpty, posts, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = COLUMN_META[status];

  // Lightweight summary for the "발행 대기" column only.
  let summary: string | null = null;
  if (status === "scheduled" && posts && posts.length > 0) {
    const scheduledCount = posts.filter((p) => !!p.published_at).length;
    const todayCount = posts.filter((p) => isToday(p.published_at)).length;
    if (scheduledCount > 0) {
      summary = `예약된 글 ${scheduledCount}개${todayCount > 0 ? ` · 오늘 발행 예정 ${todayCount}개` : ""}`;
    }
  }

  return (
    <div className="flex flex-col min-w-0">
      <div className="px-1 mb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <span className="text-base leading-none">{meta.emoji}</span>
            {meta.label}
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {count}
            </span>
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
          {summary ?? meta.description}
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[300px] rounded-2xl p-2 space-y-2 transition-colors ${
          isOver ? "bg-primary/10 ring-2 ring-primary/40" : "bg-muted/20"
        }`}
      >
        {isEmpty ? (
          <div className="text-[11px] text-center py-8 border border-dashed border-border/40 rounded-xl">
            {isOver ? (
              <span className="text-primary font-semibold">여기로 드롭</span>
            ) : (
              <span className="text-muted-foreground">{EMPTY_HINTS[status]}</span>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
