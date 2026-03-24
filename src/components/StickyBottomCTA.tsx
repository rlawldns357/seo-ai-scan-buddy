import { ArrowRight } from "lucide-react";

interface StickyBottomCTAProps {
  onCtaClick?: () => void;
}

export default function StickyBottomCTA({ onCtaClick }: StickyBottomCTAProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm safe-bottom">
      <div className="container max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">놓치고 있는 검색 기회를 확인하세요</p>
          <p className="text-[11px] text-muted-foreground hidden sm:block">무료 요약 이상의 구체적인 개선 가이드를 받아보세요</p>
        </div>
        <button
          onClick={onCtaClick}
          className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          개선 과제 받기
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
