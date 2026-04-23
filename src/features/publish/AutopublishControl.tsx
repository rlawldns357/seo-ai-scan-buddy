import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings2, Zap, ZapOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutopublishSettings } from "@/features/publish/useAutopublishSettings";
import { toast } from "@/hooks/use-toast";

const WEEKDAYS = [
  { v: 1, label: "월" },
  { v: 2, label: "화" },
  { v: 3, label: "수" },
  { v: 4, label: "목" },
  { v: 5, label: "금" },
  { v: 6, label: "토" },
  { v: 0, label: "일" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  siteId: string | null | undefined;
}

/**
 * Compact autopublish control surfaced in the workflow toolbar.
 * - Toggle ON/OFF
 * - Select weekdays + hours (KST)
 * - Daily publish cap (1~5)
 * - Auto topup toggle + min queue size
 */
export default function AutopublishControl({ siteId }: Props) {
  const { settings, loading, saving, save } = useAutopublishSettings(siteId);
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    if (!settings) return "";
    if (!settings.enabled) return "꺼짐";
    const days = settings.weekdays
      .map((d) => WEEKDAYS.find((w) => w.v === d)?.label)
      .filter(Boolean)
      .join("·");
    const hrs = settings.hours_kst.map((h) => `${h}시`).join("·");
    return `${days} ${hrs} · 하루 ${settings.daily_limit}편`;
  }, [settings]);

  const toggleDay = async (d: number) => {
    if (!settings) return;
    const has = settings.weekdays.includes(d);
    const next = has ? settings.weekdays.filter((x) => x !== d) : [...settings.weekdays, d];
    if (next.length === 0) return; // require at least one
    const err = await save({ weekdays: next });
    if (err) toast({ title: "저장 실패", description: err.message, variant: "destructive" });
  };

  const toggleHour = async (h: number) => {
    if (!settings) return;
    const has = settings.hours_kst.includes(h);
    const next = has ? settings.hours_kst.filter((x) => x !== h) : [...settings.hours_kst, h];
    if (next.length === 0) return;
    const err = await save({ hours_kst: next });
    if (err) toast({ title: "저장 실패", description: err.message, variant: "destructive" });
  };

  if (!siteId) return null;
  const enabled = settings?.enabled ?? false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={enabled ? "default" : "outline"}
          className="rounded-full h-8 text-xs gap-1.5"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : enabled ? (
            <Zap className="h-3 w-3" />
          ) : (
            <ZapOff className="h-3 w-3" />
          )}
          자동발행 {enabled ? "ON" : "OFF"}
          {enabled && summary && (
            <span className="hidden md:inline text-[10px] opacity-80 font-normal">
              · {summary}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-4" align="end">
        {!settings ? (
          <div className="text-xs text-muted-foreground py-4 text-center">불러오는 중…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" /> 자동 발행
                </Label>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  지정한 요일·시간(KST)에 큐의 콘텐츠가 자동으로 발행됩니다.
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={async (v) => {
                  const err = await save({ enabled: v });
                  if (err) toast({ title: "저장 실패", description: err.message, variant: "destructive" });
                  else toast({ title: v ? "자동 발행이 켜졌어요" : "자동 발행이 꺼졌어요" });
                }}
                disabled={saving}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-[11px] text-muted-foreground">발행 요일</Label>
              <div className="flex gap-1">
                {WEEKDAYS.map((w) => {
                  const on = settings.weekdays.includes(w.v);
                  return (
                    <button
                      key={w.v}
                      onClick={() => toggleDay(w.v)}
                      disabled={saving || !settings.enabled}
                      className={cn(
                        "h-7 w-7 rounded-full text-[11px] font-medium transition-colors",
                        on
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted",
                        (!settings.enabled || saving) && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] text-muted-foreground">
                발행 시각 (KST, 시 기준)
              </Label>
              <div className="grid grid-cols-12 gap-1">
                {HOURS.map((h) => {
                  const on = settings.hours_kst.includes(h);
                  return (
                    <button
                      key={h}
                      onClick={() => toggleHour(h)}
                      disabled={saving || !settings.enabled}
                      className={cn(
                        "h-6 rounded text-[10px] tabular-nums transition-colors",
                        on
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted",
                        (!settings.enabled || saving) && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] text-muted-foreground">하루 최대 발행 편수</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={async () => {
                      const err = await save({ daily_limit: n });
                      if (err) toast({ title: "저장 실패", description: err.message, variant: "destructive" });
                    }}
                    disabled={saving || !settings.enabled}
                    className={cn(
                      "flex-1 h-7 rounded-md text-[11px] font-medium transition-colors",
                      settings.daily_limit === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted",
                      (!settings.enabled || saving) && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {n}편
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">큐 자동 보충</Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    큐가 부족하면 추천 아이디어로 채워요
                  </p>
                </div>
                <Switch
                  checked={settings.auto_topup}
                  onCheckedChange={async (v) => {
                    const err = await save({ auto_topup: v });
                    if (err) toast({ title: "저장 실패", description: err.message, variant: "destructive" });
                  }}
                  disabled={saving}
                />
              </div>
              {settings.auto_topup && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground shrink-0">최소 유지</span>
                  {[3, 5, 10, 20].map((n) => (
                    <button
                      key={n}
                      onClick={async () => {
                        const err = await save({ min_queue: n });
                        if (err) toast({ title: "저장 실패", description: err.message, variant: "destructive" });
                      }}
                      disabled={saving}
                      className={cn(
                        "flex-1 h-6 rounded text-[10px] font-medium transition-colors",
                        settings.min_queue === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {n}편
                    </button>
                  ))}
                </div>
              )}
            </div>

            {settings.last_run_at && (
              <p className="text-[10px] text-muted-foreground">
                마지막 자동 발행: {new Date(settings.last_run_at).toLocaleString("ko-KR")}
              </p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
