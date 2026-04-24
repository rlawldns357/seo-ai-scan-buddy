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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock } from "lucide-react";

type Props = {
  open: boolean;
  initialIso: string | null;
  onClose: () => void;
  onSave: (iso: string) => Promise<void> | void;
};

/** ISO → "YYYY-MM-DD" / "HH:mm" in viewer local time. */
function splitLocal(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export default function ScheduleModal({ open, initialIso, onClose, onSave }: Props) {
  const init = useMemo(() => splitLocal(initialIso), [initialIso]);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const next = splitLocal(initialIso);
      setDate(next.date);
      setTime(next.time);
    }
  }, [open, initialIso]);

  const combined = date && time ? new Date(`${date}T${time}`) : null;
  const isPast = combined ? combined.getTime() <= Date.now() : false;
  const canSave = !!combined && !isPast && !saving;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-4 h-4 text-primary" />
            예약 발행 설정
          </DialogTitle>
          <DialogDescription className="text-xs">
            지정한 시각이 되면 자동으로 발행됩니다. 기본 시간대: KST
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="sched-date" className="text-xs">날짜</Label>
              <Input
                id="sched-date"
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sched-time" className="text-xs">시간</Label>
              <Input
                id="sched-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 mt-1"
              />
            </div>
          </div>
          {isPast && (
            <p className="text-[11px] text-destructive">
              현재보다 이후 시간만 선택할 수 있어요
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">기본 시간대: KST</p>
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
