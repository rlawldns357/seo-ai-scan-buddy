import { type PsiResult } from "@/lib/psi";
import ScoreRing from "@/components/ScoreRing";
import { Smartphone, Monitor } from "lucide-react";

interface LighthouseScoresProps {
  mobile: PsiResult | null;
  desktop: PsiResult | null;
}

function formatTime(fetchTime: string) {
  return new Date(fetchTime).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ScoreColumn({ psi, icon, label }: { psi: PsiResult; icon: React.ReactNode; label: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 justify-center mb-4">
        {icon}
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 justify-items-center">
        <ScoreRing score={psi.performance} label="성능" delay={200} size={80} />
        <ScoreRing score={psi.accessibility} label="접근성" delay={400} size={80} />
        <ScoreRing score={psi.bestPractices} label="권장사항" delay={600} size={80} />
        <ScoreRing score={psi.seo} label="SEO" delay={800} size={80} />
      </div>
    </div>
  );
}

export default function LighthouseScores({ mobile, desktop }: LighthouseScoresProps) {
  const hasBoth = mobile && desktop;
  const single = mobile || desktop;

  if (!single) return null;

  const fetchTime = formatTime(single.fetchTime);

  return (
    <div className="bg-card rounded-xl shadow-card p-6 sm:p-8 animate-fade-up" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-score-excellent/10 text-score-excellent border border-score-excellent/20">
          ✓ 실제 측정
        </span>
        <span className="text-[11px] text-muted-foreground">Google Lighthouse</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-5">
        측정 시각: {fetchTime}
      </p>

      {hasBoth ? (
        <div className="flex gap-6">
          <ScoreColumn
            psi={mobile}
            icon={<Smartphone className="w-4 h-4 text-muted-foreground" />}
            label="모바일"
          />
          <div className="w-px bg-border shrink-0" />
          <ScoreColumn
            psi={desktop}
            icon={<Monitor className="w-4 h-4 text-muted-foreground" />}
            label="데스크톱"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
          <ScoreRing score={single.performance} label="성능" delay={200} size={100} />
          <ScoreRing score={single.accessibility} label="접근성" delay={400} size={100} />
          <ScoreRing score={single.bestPractices} label="권장사항" delay={600} size={100} />
          <ScoreRing score={single.seo} label="SEO" delay={800} size={100} />
        </div>
      )}
    </div>
  );
}
