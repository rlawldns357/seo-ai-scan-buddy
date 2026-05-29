import { TrendingUp, ArrowRight } from "lucide-react";

interface Props {
  dailyLoss?: number;
  monthlyLoss?: number;
  onDetailClick?: () => void;
}

export default function OpportunityCostBanner({
  dailyLoss = 1800,
  monthlyLoss = 54000,
  onDetailClick,
}: Props) {
  return (
    <section
      className="rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/8 via-accent/4 to-primary/5 shadow-card px-4 sm:px-6 py-4 sm:py-5 animate-fade-up"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center">
          <TrendingUp className="w-7 h-7 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-accent tracking-tight">기회 비용 / 예상 손실</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            AI 검색/추천 채널에서의 노출 부족으로 놓칠 수 있는 잠재 고객
          </p>
          <p className="mt-1.5 text-[18px] sm:text-[20px] font-black text-foreground tracking-tight">
            하루 약 <span className="text-accent">{dailyLoss.toLocaleString()}명</span> · 월 최대 <span className="text-accent">{monthlyLoss.toLocaleString()}명</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">추정치이며 실제 데이터와 다를 수 있습니다.</p>
        </div>
        <button
          type="button"
          onClick={onDetailClick}
          className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-accent/30 bg-card hover:bg-accent/5 text-accent text-[12px] font-bold transition-colors"
        >
          상세 분석 보기
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
}
