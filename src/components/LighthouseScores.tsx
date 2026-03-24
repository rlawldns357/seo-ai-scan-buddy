import { type PsiResult } from "@/lib/psi";
import { Smartphone, Monitor } from "lucide-react";

interface LighthouseScoresProps {
  mobile: PsiResult | null;
  desktop: PsiResult | null;
}

const getBarColor = (score: number) => {
  if (score >= 75) return "bg-score-excellent";
  if (score >= 60) return "bg-score-good";
  if (score >= 40) return "bg-score-warning";
  return "bg-score-poor";
};

const getTextColor = (score: number) => {
  if (score >= 75) return "text-score-excellent";
  if (score >= 60) return "text-score-good";
  if (score >= 40) return "text-score-warning";
  return "text-score-poor";
};

function MiniScore({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground w-[52px] shrink-0">{label}</span>
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${getBarColor(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[11px] font-semibold tabular-nums w-5 text-right ${getTextColor(score)}`}>{score}</span>
    </div>
  );
}

function DeviceRow({ psi, icon, label }: { psi: PsiResult; icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 shrink-0 w-[72px]">
        {icon}
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <MiniScore score={psi.performance} label="성능" />
        <MiniScore score={psi.accessibility} label="접근성" />
        <MiniScore score={psi.bestPractices} label="권장사항" />
        <MiniScore score={psi.seo} label="SEO" />
      </div>
    </div>
  );
}

function avgScore(psi: PsiResult) {
  return Math.round((psi.performance + psi.accessibility + psi.bestPractices + psi.seo) / 4);
}

function AvgRing({ score }: { score: number }) {
  const size = 56;
  const sw = 5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`hsl(${getBarColorVar(score)})`} strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${getTextColor(score)}`}>{score}</span>
      </div>
    </div>
  );
}

export default function LighthouseScores({ mobile, desktop }: LighthouseScoresProps) {
  const single = mobile || desktop;
  if (!single) return null;

  const scores: number[] = [];
  if (mobile) scores.push(avgScore(mobile));
  if (desktop) scores.push(avgScore(desktop));
  const totalAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return (
    <div className="bg-card rounded-xl shadow-card px-5 py-3 animate-fade-up" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center gap-4">
        {/* Left: labels + bars */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Lighthouse</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-score-excellent/10 text-score-excellent border border-score-excellent/20">
              실측
            </span>
          </div>
          <div className="space-y-1.5">
            {mobile && (
              <DeviceRow psi={mobile} icon={<Smartphone className="w-3.5 h-3.5 text-muted-foreground" />} label="모바일" />
            )}
            {desktop && (
              <DeviceRow psi={desktop} icon={<Monitor className="w-3.5 h-3.5 text-muted-foreground" />} label="데스크톱" />
            )}
          </div>
        </div>

        {/* Right: average ring */}
        <AvgRing score={totalAvg} />
      </div>
    </div>
  );
}
