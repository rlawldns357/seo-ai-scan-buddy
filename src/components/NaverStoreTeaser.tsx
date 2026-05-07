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
        className={`group relative block w-full text-left rounded-2xl border bg-card hover:shadow-elevated transition-all duration-300 ${
          active ? "border-naver/60 shadow-elevated" : "border-naver/30 hover:border-naver/60"
        }`}
      >
        {/* Launch ribbon */}
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-naver text-naver-foreground text-[9px] font-bold tracking-[0.14em] uppercase shadow-sm">
          <span className="w-1 h-1 rounded-full bg-naver-foreground" />
          New · 2026 출시
        </span>

        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center gap-4 sm:gap-5">
          {/* meta label */}
          <div className="flex flex-col items-start shrink-0 border-r border-border pr-4 sm:pr-5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] uppercase text-naver leading-none">
              <span className="relative flex w-1.5 h-1.5 items-center justify-center">
                <span className="absolute inline-flex w-full h-full rounded-full bg-naver animate-live-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-naver animate-live-pulse" />
              </span>
              Naver Store
            </span>
            <span className="mt-1.5 text-[10px] font-medium tracking-wider uppercase text-muted-foreground/80 leading-none">
              신기능 안내
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
                네이버 스토어 전용으로 진단하기
              </h3>
            </div>
          </div>

          {/* subtle convenience hint — primary identity is announcement banner */}
          <div className="shrink-0 hidden sm:flex flex-col items-end gap-0.5 text-right">
            <span className={`text-[10px] font-medium ${active ? "text-naver" : "text-muted-foreground/70"}`}>
              {active ? "위 입력창에 적용됨" : "탭하면 위 입력창에 적용"}
            </span>
            <ArrowUpRight className={`w-3.5 h-3.5 ${active ? "text-naver" : "text-muted-foreground/60"}`} />
          </div>
        </div>
      </button>
    </section>
  );
}
