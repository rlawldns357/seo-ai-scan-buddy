import { Globe, RotateCw, Clock } from "lucide-react";
import { type PsiResult } from "@/lib/psi";

interface HeroHeaderProps {
  url: string;
  psi: PsiResult | null;
  onRescan?: () => void;
}

export default function HeroHeader({ url, psi, onRescan }: HeroHeaderProps) {
  const fetchTime = psi?.fetchTime
    ? new Date(psi.fetchTime).toLocaleString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      })
    : new Date().toLocaleString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 lg:gap-6 items-center animate-fade-up">
      {/* LEFT — copy */}
      <div className="space-y-2">
        <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground tracking-tight">
          AI 시대, 검색에서 답으로.
        </p>
        <h1 className="text-[26px] sm:text-[34px] leading-[1.15] font-black tracking-tight text-foreground">
          보이지 않으면 선택되지 않습니다.
        </h1>
        <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed max-w-md">
          SEO·AEO·GEO 3축 진단으로<br className="hidden sm:block" />
          AI 검색과 추천에서의 가시성을 높이세요.
        </p>
      </div>

      {/* RIGHT — URL card */}
      <div className="rounded-2xl bg-card border border-border shadow-card px-4 sm:px-5 py-4 flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-muted/60 border border-border flex items-center justify-center">
          <Globe className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] sm:text-[15px] font-bold text-foreground truncate">
            {(() => { try { return new URL(url).hostname + new URL(url).pathname.replace(/\/$/, ""); } catch { return url; } })()}
          </p>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            마지막 분석: {fetchTime}
          </div>
        </div>
        <button
          type="button"
          onClick={onRescan}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-[12px] font-bold transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          새로 스캔
        </button>
      </div>
    </section>
  );
}
