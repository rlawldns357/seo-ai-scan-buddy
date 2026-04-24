/**
 * Schedule status helpers for AutoBlog kanban cards.
 *
 * We reuse `site_posts.published_at` as the "scheduled at" timestamp when
 * `status === 'scheduled'`. After actual publish, the same column stores the
 * real publish time (status flips to 'published'). This keeps DB unchanged.
 */

import type { KanbanPost } from "./types";

export type ScheduleStatus =
  | "none"
  | "scheduled"
  | "due_soon"
  | "overdue"
  | "published";

const ONE_HOUR_MS = 60 * 60 * 1000;

export function getScheduleStatus(
  post: Pick<KanbanPost, "status" | "published_at">,
  now: number = Date.now(),
): ScheduleStatus {
  if (post.status === "published") return "published";
  if (post.status !== "scheduled") return "none";
  if (!post.published_at) return "none";
  const t = new Date(post.published_at).getTime();
  if (!Number.isFinite(t)) return "none";
  const diff = t - now;
  if (diff < 0) return "overdue";
  if (diff <= ONE_HOUR_MS) return "due_soon";
  return "scheduled";
}

const KO_DAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "2026.04.29 화 09:00 KST" */
export function formatScheduleKST(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Convert to KST (UTC+9) regardless of viewer locale.
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const dow = KO_DAY[kst.getUTCDay()];
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${dow} ${hh}:${mm} KST`;
}

/** "오늘 09:00" / "내일 09:00" / "4/29 09:00" — compact label. */
export function formatScheduleShort(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const sameDay =
    kst.getUTCFullYear() === nowKst.getUTCFullYear() &&
    kst.getUTCMonth() === nowKst.getUTCMonth() &&
    kst.getUTCDate() === nowKst.getUTCDate();
  const tomorrow = new Date(nowKst);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const isTomorrow =
    kst.getUTCFullYear() === tomorrow.getUTCFullYear() &&
    kst.getUTCMonth() === tomorrow.getUTCMonth() &&
    kst.getUTCDate() === tomorrow.getUTCDate();
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  if (sameDay) return `오늘 ${hh}:${mm}`;
  if (isTomorrow) return `내일 ${hh}:${mm}`;
  return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()} ${hh}:${mm}`;
}

export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return (
    kst.getUTCFullYear() === nowKst.getUTCFullYear() &&
    kst.getUTCMonth() === nowKst.getUTCMonth() &&
    kst.getUTCDate() === nowKst.getUTCDate()
  );
}

/**
 * Sort scheduled-column posts: scheduled (earliest first) → due_soon →
 * overdue → none (newest first).
 */
export function sortScheduledColumn<T extends Pick<KanbanPost, "status" | "published_at" | "updated_at">>(
  posts: T[],
  now: number = Date.now(),
): T[] {
  return [...posts].sort((a, b) => {
    const aT = a.published_at ? new Date(a.published_at).getTime() : null;
    const bT = b.published_at ? new Date(b.published_at).getTime() : null;
    // posts with a schedule come first
    if (aT && !bT) return -1;
    if (!aT && bT) return 1;
    if (aT && bT) return aT - bT; // earliest schedule first
    // both unscheduled — newest updated first
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export const SCHEDULE_BADGE: Record<
  ScheduleStatus,
  { label: string; className: string }
> = {
  none: {
    label: "예약 없음",
    className: "bg-muted text-muted-foreground",
  },
  scheduled: {
    label: "예약됨",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  due_soon: {
    label: "곧 발행",
    className: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  overdue: {
    label: "예약 지남",
    className: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  published: {
    label: "발행 완료",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
};
