import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "accent" | "warning" | "success" | "neutral";

const DOT: Record<Tone, string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  warning: "bg-score-warning",
  success: "bg-score-excellent",
  neutral: "bg-muted-foreground/60",
};

/**
 * 대시보드 카드 공용 헤더 — 모든 섹션의 카드 헤더는 이 컴포넌트를 사용.
 * 패딩/보더/우측 메타 정렬을 한 곳에서 관리합니다.
 *
 * Layout: px-5 pt-4 pb-3, border-b border-border/60
 * Left  : tone dot + 타이틀(text-sm font-semibold)
 * Right : meta — 11px tabular-nums, gap-3
 */
export default function SectionCardHeader({
  title,
  tone = "neutral",
  meta,
  className,
}: {
  title: ReactNode;
  tone?: Tone;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/60",
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT[tone])} aria-hidden />
        <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
      </div>
      {meta && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums shrink-0">
          {meta}
        </div>
      )}
    </div>
  );
}
