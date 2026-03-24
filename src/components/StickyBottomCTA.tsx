import { Bell } from "lucide-react";

interface StickyBottomCTAProps {
  onCtaClick?: () => void;
}

export default function StickyBottomCTA({ onCtaClick }: StickyBottomCTAProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="container max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">Search OS 정식 출시 준비 중</p>
          <p className="text-[11px] text-muted-foreground">출시되면 가장 먼저 알려드릴게요</p>
        </div>
        <button
          onClick={onCtaClick}
          className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Bell className="w-4 h-4" />
          출시 알림 받기
        </button>
      </div>
    </div>
  );
}
