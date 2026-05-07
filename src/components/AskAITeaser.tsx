import { ArrowUpRight } from "lucide-react";
import { SiClaude, SiGooglegemini, SiPerplexity, SiNaver } from "@icons-pack/react-simple-icons";
import { trackEvent } from "@/lib/analytics";

/**
 * Premium minimal horizontal teaser — Ask AI 진단.
 * 클릭 시: Ask AI 토글 ON + URL 입력으로 스크롤/포커스.
 * 라인 컬러: askai (Violet #7C3AED). 하트비트 펄스로 라이브 신호.
 */

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
    trackEvent("ask_ai_teaser_click", { source: "home_teaser", active: !active });
    onActivate?.();
    if (!active) {
      const input = document.querySelector<HTMLInputElement>('input[type="url"], input[name="url"]');
      if (input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        input.focus({ preventScroll: true });
      }
    }
  };

  return (
    <section className="mt-3 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        className={`group relative block w-full text-left rounded-2xl border bg-card hover:shadow-elevated transition-all duration-300 ${
          active ? "border-askai/60 shadow-elevated animate-askai-heartbeat" : "border-askai/30 hover:border-askai/60"
        }`}
      >
        {/* Launch ribbon */}
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-askai text-askai-foreground text-[9px] font-bold tracking-[0.14em] uppercase shadow-sm">
          <span className="w-1 h-1 rounded-full bg-askai-foreground" />
          New · 2026 출시
        </span>

        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center gap-4 sm:gap-5">
          {/* meta label */}
          <div className="flex flex-col items-start shrink-0 border-r border-border pr-4 sm:pr-5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] uppercase text-askai leading-none">
              <span className="relative flex w-1.5 h-1.5 items-center justify-center">
                <span className="absolute inline-flex w-full h-full rounded-full bg-askai animate-live-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-askai animate-live-pulse" />
              </span>
              Ask AI
            </span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase text-foreground/70 leading-none">
              {active ? "활성화됨" : "눌러서 켜기"}
            </span>
          </div>

          {/* headline */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap" aria-label="ChatGPT, Claude, Gemini, Perplexity, Naver">
              <div className="flex items-center gap-1.5">
                {BRAND_LOGOS.map(({ name, Logo, color }) => {
                  const isNaver = name === "Naver";
                  return (
                    <span
                      key={name}
                      title={name}
                      style={{ color }}
                      className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-card border border-border shadow-sm"
                    >
                      <Logo className={isNaver ? "w-3 h-3 sm:w-3.5 sm:h-3.5" : "w-4 h-4 sm:w-[18px] sm:h-[18px]"} />
                    </span>
                  );
                })}
              </div>
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-tight">
                <span className="text-muted-foreground font-semibold">— </span>
                AI에게 직접 물어보기
              </h3>
            </div>
          </div>

          {/* arrow indicator — points up to the activated button above */}
          <div
            aria-hidden
            className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
              active
                ? "bg-askai/10 border-askai text-askai"
                : "bg-transparent border-border text-muted-foreground group-hover:border-askai/60 group-hover:text-askai"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </button>
    </section>
  );
}
