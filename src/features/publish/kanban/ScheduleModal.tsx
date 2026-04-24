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
import { Calendar } from "@/components/ui/calendar";
import { CalendarClock, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  initialIso: string | null;
  onClose: () => void;
  onSave: (iso: string) => Promise<void> | void;
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function combineDateTime(date: Date | undefined, time: string): Date | null {
  if (!date || !time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatPreview(d: Date): string {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${WEEKDAY[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())} KST`;
}

function formatRelative(d: Date, now: number): string {
  const diff = d.getTime() - now;
  if (diff <= 0) return "이미 지난 시각";
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `약 ${mins}분 후`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `약 ${hours}시간 후`;
  const days = Math.round(hours / 24);
  return `약 ${days}일 후`;
}

/** 빠른 프리셋: 지금 기준 상대 시각 */
function buildPresets(now: Date) {
  const inOneHour = new Date(now);
  inOneHour.setMinutes(0, 0, 0);
  inOneHour.setHours(inOneHour.getHours() + 1);

  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);
  if (tonight.getTime() <= now.getTime()) tonight.setDate(tonight.getDate() + 1);

  const tomorrow9 = new Date(now);
  tomorrow9.setDate(tomorrow9.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);

  const nextMonday9 = new Date(now);
  const day = nextMonday9.getDay(); // 0=일
  const add = ((1 - day + 7) % 7) || 7;
  nextMonday9.setDate(nextMonday9.getDate() + add);
  nextMonday9.setHours(9, 0, 0, 0);

  return [
    { label: "1시간 후", date: inOneHour },
    { label: "오늘 저녁 8시", date: tonight },
    { label: "내일 오전 9시", date: tomorrow9 },
    { label: "다음 주 월요일 9시", date: nextMonday9 },
  ];
}

const TIME_PRESETS = ["09:00", "12:00", "15:00", "18:00", "20:00", "22:00"];

export default function ScheduleModal({ open, initialIso, onClose, onSave }: Props) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("09:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialIso) {
      const d = new Date(initialIso);
      if (!Number.isNaN(d.getTime())) {
        setDate(d);
        setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
        return;
      }
    }
    // 기본값: 내일 오전 9시
    const def = new Date();
    def.setDate(def.getDate() + 1);
    def.setHours(9, 0, 0, 0);
    setDate(def);
    setTime("09:00");
  }, [open, initialIso]);

  const now = Date.now();
  const presets = useMemo(() => buildPresets(new Date()), [open]);
  const combined = combineDateTime(date, time);
  const isPast = combined ? combined.getTime() <= now : false;
  const canSave = !!combined && !isPast && !saving;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4 text-primary" />
            예약 발행 설정
          </DialogTitle>
          <DialogDescription className="text-xs">
            지정한 시각이 되면 자동으로 발행됩니다. 기본 시간대: KST
          </DialogDescription>
        </DialogHeader>

        {/* 빠른 선택 */}
        <div className="px-5 pt-4">
          <div className="text-[11px] font-semibold text-muted-foreground mb-2">빠른 선택</div>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((p) => {
              const active =
                combined &&
                Math.abs(combined.getTime() - p.date.getTime()) < 60_000;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setDate(p.date);
                    setTime(`${pad(p.date.getHours())}:${pad(p.date.getMinutes())}`);
                  }}
                  className={cn(
                    "h-9 px-3 rounded-full text-xs border transition-colors text-left",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border/60 text-foreground"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 달력 + 시간 */}
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < today}
              initialFocus
            />
          </div>

          <div>
            <div className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> 시간
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {TIME_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={cn(
                    "h-9 rounded-md text-xs border transition-colors",
                    time === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border/60"
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
            <p className="text-[11px] text-muted-foreground mt-2">
              직접 입력도 가능해요
            </p>
          </div>
        </div>

        {/* 미리보기 */}
        <div className="px-5 pb-4">
          <div
            className={cn(
              "rounded-lg border p-3 text-sm",
              isPast
                ? "border-destructive/40 bg-destructive/5"
                : combined
                ? "border-primary/30 bg-primary/5"
                : "border-border/60 bg-muted/20"
            )}
          >
            {combined ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {formatPreview(combined)}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      isPast
                        ? "bg-destructive/15 text-destructive"
                        : "bg-primary/15 text-primary"
                    )}
                  >
                    {formatRelative(combined, now)}
                  </span>
                </div>
                {isPast && (
                  <p className="text-[11px] text-destructive mt-1">
                    현재보다 이후 시간만 선택할 수 있어요
                  </p>
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-xs">
                날짜와 시간을 선택해주세요
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/20 flex-row justify-end gap-2 sm:gap-2">
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
