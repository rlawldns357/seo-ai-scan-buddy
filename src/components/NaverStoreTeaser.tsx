import { ArrowUpRight } from "lucide-react";
import { SiNaver } from "@icons-pack/react-simple-icons";
import { trackEvent } from "@/lib/analytics";

/**
 * Naver Store 전용 진단 티저 — 클릭 시 메인 검색창에 그라데이션 초록 띠 활성화 + URL 입력 포커스.
 * 단독 페이지(/naver-store) 분리 BM 제거 후, 메인에서 토글 형태로 동작.
 */
interface Props {
  active?: boolean;
  onActivate?: () => void;
}

export default function NaverStoreTeaser({ active, onActivate }: Props) {
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
    <section className="mt-3 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        className={`group block w-full text-left rounded-2xl border bg-card hover:shadow-elevated transition-all duration-300 ${
          active ? "border-naver/60 shadow-naver" : "border-border hover:border-naver/40"
        }`}
      >
        <div className="px-5 sm:px-6 py-4 flex items-center gap-4 sm:gap-5">
          {/* meta label */}
          <div className="flex flex-col items-start shrink-0 border-r border-border pr-4 sm:pr-5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] uppercase text-naver leading-none">
              <span className="relative flex w-1.5 h-1.5 items-center justify-center">
                <span className="absolute inline-flex w-full h-full rounded-full bg-naver animate-live-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-naver animate-live-pulse" />
              </span>
              {active ? "On" : "New"}
            </span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase text-foreground/70 leading-none">
              Naver Store
            </span>
          </div>

          {/* headline */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                title="Naver"
                style={{ color: "#03C75A" }}
                className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-card border border-border shadow-sm"
              >
                <SiNaver className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </span>
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-tight">
                <span className="text-muted-foreground font-semibold">— </span>
                {active ? "네이버 스토어 모드 ON" : "네이버 스토어 전용으로 진단하기"}
              </h3>
            </div>
          </div>

          {/* arrow */}
          <div
            className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
              active
                ? "bg-naver border-naver text-naver-foreground"
                : "border-naver/40 bg-naver/5 text-naver group-hover:bg-naver group-hover:border-naver group-hover:text-naver-foreground"
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </button>
    </section>
  );
}
