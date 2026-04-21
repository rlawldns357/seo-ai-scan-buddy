import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Sparkles, Send, Plus, LogIn, Globe } from "lucide-react";

type Step = {
  label: string;
  hint?: string;
  state: "done" | "current" | "todo";
};

/**
 * Hero-style "next action" panel shown at the top of /dashboard.
 *
 * Goal: after login, the user must see exactly ONE primary CTA and a clear
 * "where am I in the flow" indicator. Everything else is visually demoted.
 */
export default function OnboardingSteps({
  state,
  onPrimary,
  primaryLabel,
  onSecondary,
  secondaryLabel,
  queuedCount = 0,
  publishedCount = 0,
}: {
  state: "guest" | "no-site" | "has-site";
  onPrimary: () => void;
  primaryLabel: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
  queuedCount?: number;
  publishedCount?: number;
}) {
  const steps: Step[] =
    state === "guest"
      ? [
          { label: "로그인", hint: "30초", state: "current" },
          { label: "페이지 만들기", hint: "URL 1개", state: "todo" },
          { label: "콘텐츠 발행", hint: "큐에서 선택", state: "todo" },
        ]
      : state === "no-site"
      ? [
          { label: "로그인", state: "done" },
          { label: "페이지 만들기", hint: "지금 할 일", state: "current" },
          { label: "콘텐츠 발행", hint: "생성 직후 자동 준비", state: "todo" },
        ]
      : [
          { label: "로그인", state: "done" },
          { label: "페이지 만들기", state: "done" },
          {
            label: publishedCount === 0 ? "첫 콘텐츠 발행" : "큐 검토 후 발행",
            hint:
              queuedCount > 0
                ? `대기 ${queuedCount}건`
                : publishedCount > 0
                ? "새 후보 추가"
                : "후보 만들기",
            state: "current",
          },
        ];

  // Headline tightly couples to the single next action.
  const eyebrow =
    state === "guest"
      ? "1단계 / 3"
      : state === "no-site"
      ? "2단계 / 3"
      : "3단계 / 3";

  const headline =
    state === "guest"
      ? "검색엔진과 AI 답변에 인용되는 콘텐츠를 발행하세요"
      : state === "no-site"
      ? "내 콘텐츠 페이지를 만들고 검색·AI 인용을 시작하세요"
      : queuedCount > 0
      ? `검색·AI 인용을 위한 대기 콘텐츠 ${queuedCount}건`
      : publishedCount === 0
      ? "첫 콘텐츠를 발행해 검색·AI 인용을 시작하세요"
      : "검색·AI 인용을 늘릴 다음 콘텐츠를 추가하세요";

  const sub =
    state === "guest"
      ? "Google·Naver 검색은 물론, ChatGPT·Perplexity 같은 AI 답변 엔진이 더 잘 이해하고 인용할 수 있도록 SEO·AEO·GEO 3개 축으로 콘텐츠를 자동 설계합니다."
      : state === "no-site"
      ? "페이지를 만들면 SEO·AEO·GEO 축으로 시작용 콘텐츠 3개가 자동으로 준비됩니다. 검색엔진과 AI 답변 엔진이 우리 브랜드를 더 정확히 인용하도록 돕는 첫 단계예요."
      : queuedCount > 0
      ? "검색·답변 인용 가능성이 높은 후보들이 대기 중입니다. 검토하고 발행하세요."
      : "큐가 비었어요. 검색엔진과 AI 답변 엔진이 인용할 다음 콘텐츠를 추가하세요.";

  const PrimaryIcon =
    state === "guest" ? LogIn : state === "no-site" ? Globe : queuedCount > 0 ? Send : Plus;

  return (
    <Card className="relative overflow-hidden p-5 md:p-7 rounded-3xl border-primary/30 bg-gradient-to-br from-primary/[0.07] via-background to-background shadow-card">
      {/* Decorative glow — purely additive, ignored by AT */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            지금 할 일 · {eyebrow}
          </div>
          <h2 className="mt-2 text-lg md:text-2xl font-bold tracking-tight text-foreground break-keep">
            {headline}
          </h2>
          <p className="mt-1.5 text-xs md:text-sm text-muted-foreground max-w-xl break-keep">{sub}</p>
        </div>

        <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto md:shrink-0">
          <Button
            size="lg"
            onClick={onPrimary}
            className="rounded-full h-12 px-6 text-sm font-semibold shadow-lg shadow-primary/20 w-full md:w-auto justify-center"
          >
            <PrimaryIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">{primaryLabel}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Button>
          {onSecondary && secondaryLabel && (
            <button
              onClick={onSecondary}
              className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>

      {/* Progress chips — subdued, supports but does not compete with the CTA. */}
      <ol className="relative mt-5 grid grid-cols-3 gap-1.5">
        {steps.map((step, i) => {
          const tone =
            step.state === "done"
              ? "border-border/40 bg-background/60 text-muted-foreground"
              : step.state === "current"
              ? "border-primary/40 bg-background text-foreground"
              : "border-dashed border-border/50 bg-background/40 text-muted-foreground/80";
          return (
            <li
              key={i}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] min-w-0 ${tone}`}
            >
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
                <span className="block font-medium text-foreground truncate text-[11px]">
                  {step.label}
                </span>
                {step.hint && (
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {step.hint}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
