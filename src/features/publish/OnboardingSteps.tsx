import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

type Step = {
  label: string;
  hint?: string;
  state: "done" | "current" | "todo";
};

/**
 * Compact, additive onboarding/next-action guide shown at the top of /dashboard.
 *
 * Renders the same 3-step skeleton for every state (guest / no-site / has-site)
 * so users always know exactly where they are and what to do next.
 */
export default function OnboardingSteps({
  state,
  onPrimary,
  primaryLabel,
  queuedCount = 0,
  publishedCount = 0,
}: {
  state: "guest" | "no-site" | "has-site";
  onPrimary: () => void;
  primaryLabel: string;
  queuedCount?: number;
  publishedCount?: number;
}) {
  const steps: Step[] =
    state === "guest"
      ? [
          { label: "로그인", hint: "30초 안에 시작", state: "current" },
          { label: "사이트 연결", hint: "URL 1개만 입력", state: "todo" },
          { label: "콘텐츠 발행", hint: "준비된 큐에서 선택", state: "todo" },
        ]
      : state === "no-site"
      ? [
          { label: "로그인", state: "done" },
          { label: "사이트 연결", hint: "지금 할 일", state: "current" },
          { label: "콘텐츠 발행", hint: "연결 직후 자동 준비", state: "todo" },
        ]
      : [
          { label: "로그인", state: "done" },
          { label: "사이트 연결", state: "done" },
          {
            label: publishedCount === 0 ? "첫 콘텐츠 발행" : "큐 검토 후 발행",
            hint:
              queuedCount > 0
                ? `발행 대기 ${queuedCount}건`
                : publishedCount > 0
                ? "새 후보 추가"
                : "후보 만들기",
            state: "current",
          },
        ];

  const headline =
    state === "guest"
      ? "지금 시작해보세요"
      : state === "no-site"
      ? "사이트 1개만 연결하면 자동 발행이 시작돼요"
      : queuedCount > 0
      ? "오늘 할 일: 대기 중인 콘텐츠 검토"
      : publishedCount === 0
      ? "오늘 할 일: 첫 콘텐츠 발행"
      : "오늘 할 일: 새 후보 추가";

  const sub =
    state === "guest"
      ? "로그인 후 사이트 1개를 연결하면, AI가 시작용 콘텐츠 3개를 자동으로 준비합니다."
      : state === "no-site"
      ? "연결 즉시 SEO·AEO·GEO 축으로 시작용 콘텐츠 3개가 큐에 채워집니다."
      : queuedCount > 0
      ? "준비된 후보를 살펴보고, 마음에 드는 글을 선택해 발행하세요."
      : "큐가 비었다면 새 후보를 만들어 다음 발행을 이어가세요.";

  return (
    <Card className="p-5 md:p-6 rounded-3xl border-border/50 shadow-card">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-semibold text-foreground">{headline}</h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">{sub}</p>
        </div>
        <Button onClick={onPrimary} className="rounded-full shrink-0 self-start md:self-auto">
          {primaryLabel} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {steps.map((step, i) => {
          const base =
            "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-xs min-w-0";
          const tone =
            step.state === "done"
              ? "border-border/50 bg-muted/40 text-muted-foreground"
              : step.state === "current"
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "border-dashed border-border/60 bg-background text-muted-foreground";
          return (
            <li key={i} className={`${base} ${tone}`}>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  step.state === "done"
                    ? "bg-primary/15 text-primary"
                    : step.state === "current"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.state === "done" ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground truncate">{step.label}</span>
                {step.hint && (
                  <span className="block text-[10px] text-muted-foreground truncate">{step.hint}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
