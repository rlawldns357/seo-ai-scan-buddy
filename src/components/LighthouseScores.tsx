import { type PsiResult, type PsiStrategy } from "@/lib/psi";
import ScoreRing from "@/components/ScoreRing";

interface LighthouseScoresProps {
  psi: PsiResult;
  strategy: PsiStrategy;
}

export default function LighthouseScores({ psi }: LighthouseScoresProps) {
  const formatted = new Date(psi.fetchTime).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-card rounded-xl shadow-card p-6 sm:p-8 animate-fade-up" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-score-excellent/10 text-score-excellent border border-score-excellent/20">
          ✓ 실제 측정
        </span>
        <span className="text-[11px] text-muted-foreground">Google Lighthouse (모바일)</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-5">
        측정 시각: {formatted}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
        <ScoreRing score={psi.performance} label="성능" delay={200} size={100} />
        <ScoreRing score={psi.accessibility} label="접근성" delay={400} size={100} />
        <ScoreRing score={psi.bestPractices} label="권장사항" delay={600} size={100} />
        <ScoreRing score={psi.seo} label="SEO" delay={800} size={100} />
      </div>
    </div>
  );
}
