import { ArrowUpRight } from "lucide-react";
import { SiClaude, SiGooglegemini, SiPerplexity, SiNaver } from "@icons-pack/react-simple-icons";
import { trackEvent } from "@/lib/analytics";

interface Props {
  active?: boolean;
  onActivate?: () => void;
}

const OpenAIMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const BRAND_LOGOS: { name: string; Logo: React.ComponentType<{ className?: string }>; color: string }[] = [
  { name: "ChatGPT",    Logo: OpenAIMark,     color: "#000000" },
  { name: "Claude",     Logo: SiClaude,       color: "#D97757" },
  { name: "Gemini",     Logo: SiGooglegemini, color: "#1C69FF" },
  { name: "Perplexity", Logo: SiPerplexity,   color: "#20808D" },
  { name: "Naver",      Logo: SiNaver,        color: "#03C75A" },
];

export default function AskAITeaser({ active, onActivate }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (active) return;
    trackEvent("ask_ai_teaser_click", { source: "home_teaser", active: true });
    onActivate?.();
    const input = document.querySelector<HTMLInputElement>('input[type="url"], input[name="url"]');
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus({ preventScroll: true });
    }
  };

  return (
    <section className="mt-3 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-disabled={active}
        tabIndex={active ? -1 : 0}
        className={`group relative block w-full text-left rounded-2xl border bg-card transition-all duration-300 ${
          active
            ? "border-askai/60 shadow-elevated cursor-default"
            : "border-askai/30 hover:border-askai/60 hover:shadow-elevated"
        }`}
      >
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-askai text-askai-foreground text-[10px] font-semibold tracking-wide shadow-sm">
          NEW · 2026
        </span>

        <div className="px-5 sm:px-6 py-4 flex items-center gap-4">
          <div className="flex items-center -space-x-1.5 shrink-0">
            {BRAND_LOGOS.map(({ name, Logo, color }) => {
              const isNaver = name === "Naver";
              return (
                <span
                  key={name}
                  title={name}
                  style={{ color }}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-card border border-border shadow-sm"
                >
                  <Logo className={isNaver ? "w-3 h-3" : "w-4 h-4"} />
                </span>
              );
            })}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-[15px] font-bold tracking-tight text-foreground leading-tight">
              AI에게 직접 물어보기
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
              ChatGPT·Claude·Gemini·Perplexity 동시 질의
            </p>
          </div>

          <div className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium ${active ? "text-askai" : "text-muted-foreground"}`}>
            <span className="hidden sm:inline">{active ? "켜짐" : "켜기"}</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </button>
    </section>
  );
}
