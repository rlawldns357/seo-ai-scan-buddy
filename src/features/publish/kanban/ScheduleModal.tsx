import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

type ScheduleItem = { id: string; title: string; iso: string };

type Props = {
  open: boolean;
  initialIso: string | null;
  onClose: () => void;
  onSave: (iso: string) => Promise<void> | void;
  existingSchedules?: ScheduleItem[];
  currentPostId?: string;
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const TIME_PRESETS = ["09:00", "12:00", "15:00", "18:00", "20:00", "22:00"];

const pad = (n: number) => String(n).padStart(2, "0");

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function combine(dateStr: string, time: string): Date | null {
  if (!dateStr || !time) return null;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) return null;
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

function formatPreview(d: Date) {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAY[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())} KST`;
}

function formatRelative(d: Date, now: number) {
  const diff = d.getTime() - now;
  if (diff <= 0) return "이미 지난 시각";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}분 후`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}시간 후`;
  return `${Math.round(hours / 24)}일 후`;
}

export default function ScheduleModal({
  open,
  initialIso,
  onClose,
  onSave,
  existingSchedules = [],
  currentPostId,
}: Props) {
  const [dateStr, setDateStr] = useState("");
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialIso) {
      const d = new Date(initialIso);
      if (!Number.isNaN(d.getTime())) {
        setDateStr(toDateInputValue(d));
        setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
        return;
      }
    }
    const def = new Date();
    def.setDate(def.getDate() + 1);
    setDateStr(toDateInputValue(def));
    setTime("09:00");
  }, [open, initialIso]);

  const now = Date.now();
  const combined = combine(dateStr, time);
  const isPast = combined ? combined.getTime() <= now : false;
  const canSave = !!combined && !isPast && !saving;
  const minDate = toDateInputValue(new Date());

  // 같은 날 다른 예약 (충돌 안내용)
  const sameDayOthers = useMemo(() => {
    if (!dateStr) return [];
    return existingSchedules
      .filter((s) => s.id !== currentPostId)
      .filter((s) => {
        const d = new Date(s.iso);
        return !Number.isNaN(d.getTime()) && toDateInputValue(d) === dateStr;
      })
      .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
  }, [existingSchedules, currentPostId, dateStr]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4 text-primary" />
            예약 발행
          </DialogTitle>
          <DialogDescription className="text-xs">
            지정한 시각(KST)에 자동 발행됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 날짜 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">날짜</label>
            <input
              type="date"
              value={dateStr}
              min={minDate}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>

          {/* 시간 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">시간</label>
            <div className="grid grid-cols-6 gap-1.5">
              {TIME_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={cn(
                    "h-8 rounded-md text-xs border transition-colors",
                    time === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border/60",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>

          {/* 미리보기 */}
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-sm flex items-center justify-between gap-2",
              isPast
                ? "border-destructive/40 bg-destructive/5"
                : combined
                ? "border-border bg-muted/30"
                : "border-border/60 bg-muted/20",
            )}
          >
            {combined ? (
              <>
                <span className="font-medium text-foreground">{formatPreview(combined)}</span>
                <span
                  className={cn(
                    "text-[11px] whitespace-nowrap",
                    isPast ? "text-destructive font-medium" : "text-muted-foreground",
                  )}
                >
                  {formatRelative(combined, now)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground text-xs">날짜와 시간을 선택하세요</span>
            )}
          </div>

          {/* 같은 날 다른 예약 (있을 때만) */}
          {sameDayOthers.length > 0 && (
            <div className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">같은 날 예약 {sameDayOthers.length}건:</span>{" "}
              {sameDayOthers
                .map((s) => `${pad(new Date(s.iso).getHours())}:${pad(new Date(s.iso).getMinutes())}`)
                .join(", ")}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={saving}
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            disabled={!canSave}
            onClick={async () => {
              if (!combined) return;
              setSaving(true);
              try {
                await onSave(combined.toISOString());
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "저장 중..." : "예약 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
