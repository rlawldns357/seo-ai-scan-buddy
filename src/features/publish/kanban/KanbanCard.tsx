import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, Calendar, CalendarClock, X, Send, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import type { KanbanPost, KanbanStatus } from "./types";
import { COLUMN_META } from "./types";
import {
  SCHEDULE_BADGE,
  formatScheduleKST,
  getScheduleStatus,
} from "./scheduleUtils";
import ScheduleModal from "./ScheduleModal";
import { cn } from "@/lib/utils";

type Props = {
  post: KanbanPost;
  busy?: boolean;
  onOpen: (p: KanbanPost) => void;
  onAdvance?: (p: KanbanPost) => void;
  onRollDice?: (p: KanbanPost) => void;
  nextStatus?: KanbanStatus | null;
  /** Set/replace schedule on a `scheduled`-column card. Pass ISO string. */
  onSchedule?: (p: KanbanPost, iso: string) => Promise<void> | void;
  /** Cancel scheduled time → moves card back to `draft`. */
  onCancelSchedule?: (p: KanbanPost) => Promise<void> | void;
  /** Publish immediately (skip schedule). */
  onPublishNow?: (p: KanbanPost) => Promise<void> | void;
  /** Permanently delete the post. */
  onDelete?: (p: KanbanPost) => Promise<void> | void;
  /** Other already-scheduled posts in this site, for the modal's 7-day timeline. */
  scheduledSiblings?: { id: string; title: string; iso: string }[];
};

export default function KanbanCard({
  post,
  busy,
  onOpen,
  onAdvance,
  nextStatus,
  onSchedule,
  onCancelSchedule,
  onPublishNow,
  onDelete,
  scheduledSiblings,
}: Props) {
  const meta = COLUMN_META[post.status];
  const scheduleStatus = getScheduleStatus(post);
  const isScheduledCol = post.status === "scheduled";
  const isPublishedCol = post.status === "published";
  const showScheduleArea = isScheduledCol;
  const badge = SCHEDULE_BADGE[scheduleStatus];

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const publishError: string | null = (post as KanbanPost & { publishError?: string | null }).publishError ?? null;

  return (
    <>
      <Card
        onClick={() => onOpen(post)}
        className={`group relative cursor-pointer hover:border-primary/40 transition-colors border-l-2 ${meta.accent} ${busy ? "opacity-60 pointer-events-none" : ""}`}
      >
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            title="삭제"
            aria-label="이 글 삭제"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
        <div className="px-3 py-2.5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                {post.source_axis && (
                  <span
                    className="text-[9px] font-bold text-muted-foreground tracking-wider cursor-help"
                    title={
                      post.source_axis === "SEO"
                        ? "SEO — 검색 엔진 최적화 콘텐츠"
                        : post.source_axis === "AEO"
                        ? "AEO — AI 답변 엔진 최적화 콘텐츠"
                        : post.source_axis === "GEO"
                        ? "GEO — 생성형 AI 인용 최적화 콘텐츠"
                        : post.source_axis
                    }
                  >
                    {post.source_axis}
                  </span>
                )}
                {/* Schedule badge — only for scheduled column (avoid noise elsewhere) */}
                {isScheduledCol && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
                {isPublishedCol && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary inline-flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" /> 발행됨
                  </span>
                )}
                {isPublishedCol && post.published_at && (
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5" />
                    {new Date(post.published_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {post.status === "published" && post.view_count > 0 && (
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

              {publishError && (
                <p className="mt-1 text-[11px] text-destructive inline-flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  발행에 실패했어요. 다시 시도해주세요
                </p>
              )}
            </div>
          </div>

          {/* Schedule row — left: prominent time info, right: actions */}
          {showScheduleArea && onSchedule && (
            <div
              className={cn(
                "mt-2 pt-2 border-t border-border/40 flex items-center gap-2 flex-wrap",
                scheduleStatus === "overdue" && "border-destructive/30",
                scheduleStatus === "due_soon" && "border-score-warning/40",
              )}
            >
              {/* Left: schedule info (visual anchor) */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <CalendarClock
                  className={cn(
                    "h-4 w-4 shrink-0",
                    scheduleStatus === "overdue"
                      ? "text-destructive"
                      : scheduleStatus === "due_soon"
                      ? "text-score-warning"
                      : scheduleStatus === "scheduled"
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                />
                {scheduleStatus === "none" ? (
                  <span className="text-[12px] text-muted-foreground">예약 없음</span>
                ) : (
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        scheduleStatus === "overdue"
                          ? "text-destructive"
                          : scheduleStatus === "due_soon"
                          ? "text-score-warning"
                          : "text-primary",
                      )}
                    >
                      {scheduleStatus === "overdue"
                        ? "예약 지남"
                        : scheduleStatus === "due_soon"
                        ? "곧 발행"
                        : "예약됨"}
                    </span>
                    <span className="text-[12px] font-semibold text-foreground font-mono tabular-nums truncate">
                      {formatScheduleKST(post.published_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-1 shrink-0">
                {scheduleStatus === "none" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 rounded-full"
                    onClick={(e) => { e.stopPropagation(); setScheduleOpen(true); }}
                  >
                    <CalendarClock className="h-3 w-3" /> 자동 발행 예약
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] px-2 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); setScheduleOpen(true); }}
                      title="시간 변경"
                    >
                      <CalendarClock className="h-3 w-3" /> 변경
                    </Button>
                    {onCancelSchedule && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); onCancelSchedule(post); }}
                        title="예약 취소"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
                {onPublishNow && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] px-2 rounded-full"
                    onClick={(e) => { e.stopPropagation(); onPublishNow(post); }}
                    title="즉시 발행"
                  >
                    <Send className="h-3 w-3" /> 즉시
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Advance fallback (non-scheduled columns) */}
          {!showScheduleArea && nextStatus && onAdvance && (
            <div className="flex items-center flex-wrap gap-1 mt-2 pt-2 border-t border-border/40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2 rounded-full"
                onClick={(e) => { e.stopPropagation(); onAdvance(post); }}
              >
                {COLUMN_META[nextStatus].label}(으)로 ▶
              </Button>
            </div>
          )}
        </div>
      </Card>

      {showScheduleArea && onSchedule && (
        <ScheduleModal
          open={scheduleOpen}
          initialIso={post.published_at}
          currentPostId={post.id}
          existingSchedules={scheduledSiblings ?? []}
          onClose={() => setScheduleOpen(false)}
          onSave={async (iso) => {
            await onSchedule(post, iso);
            setScheduleOpen(false);
          }}
        />
      )}
    </>
  );
}
