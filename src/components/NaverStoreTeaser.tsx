import { ArrowUpRight } from "lucide-react";
import { SiNaver } from "@icons-pack/react-simple-icons";
import { trackEvent } from "@/lib/analytics";

interface Props {
  onActivate?: () => void;
}

export default function NaverStoreTeaser({ onActivate }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    trackEvent("naver_store_teaser_click", { source: "home_teaser" });
    onActivate?.();
    const input = document.querySelector<HTMLInputElement>('input[type="url"], input[name="url"]');
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus({ preventScroll: true });
    }
  };

  return (
    <section className="mt-3 max-w-2xl mx-auto" data-naver-teaser>
      <button
        type="button"
        onClick={handleClick}
        className="group relative block w-full text-left rounded-2xl border border-naver/30 bg-card hover:border-naver/60 hover:shadow-elevated transition-all duration-300"
      >
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-naver text-naver-foreground text-[10px] font-semibold tracking-wide shadow-sm">
          NEW · 2026
        </span>

        <div className="px-5 sm:px-6 py-4 flex items-center gap-4">
          <div className="flex items-center shrink-0">
            <span
              title="Naver"
              style={{ color: "#03C75A" }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-card border border-border shadow-sm"
            >
              <SiNaver className="w-3 h-3" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-[15px] font-bold tracking-tight text-foreground leading-tight">
              네이버 스토어 전용 진단
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
              스마트스토어 URL 자동 인식 · 별도 채점 라인
            </p>
          </div>

          <ArrowUpRight className="shrink-0 w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    </section>
  );
}
