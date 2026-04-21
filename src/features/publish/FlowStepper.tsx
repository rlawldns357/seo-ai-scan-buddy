import { Check } from "lucide-react";

/**
 * Tiny additive stepper showing the canonical Autoblog flow:
 * 로그인 → 대시보드 → 페이지 만들기 → 추천/초안 → 편집 → 발행/큐
 *
 * Used as a thin breadcrumb-like header on each /dashboard/* page so users
 * always see where they are in the end-to-end journey.
 */
const STEPS = [
  { key: "auth", label: "로그인" },
  { key: "dashboard", label: "대시보드" },
  { key: "site", label: "페이지 만들기" },
  { key: "draft", label: "추천 · 초안" },
  { key: "edit", label: "편집" },
  { key: "publish", label: "발행 · 큐" },
] as const;

export type FlowStepKey = (typeof STEPS)[number]["key"];

export default function FlowStepper({
  current,
  completed = [],
}: {
  current: FlowStepKey;
  /** Step keys to mark as completed regardless of position. */
  completed?: FlowStepKey[];
}) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <nav
      aria-label="작업 흐름"
      className="mb-4 -mx-1 overflow-x-auto"
    >
      <ol className="flex items-center gap-1.5 px-1 min-w-max">
        {STEPS.map((step, i) => {
          const isCurrent = i === currentIdx;
          const isDone = i < currentIdx || completed.includes(step.key);
          const tone = isCurrent
            ? "bg-primary/10 text-primary border-primary/30"
            : isDone
            ? "bg-muted/40 text-muted-foreground border-border/50"
            : "bg-background text-muted-foreground/70 border-dashed border-border/60";
          return (
            <li key={step.key} className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isDone
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="w-2.5 h-2.5" /> : i + 1}
                </span>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="text-muted-foreground/50 text-[10px]">›</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
