import { type AxisAnalysis } from "@/data/demoResults";
import { Search, Bot, MapPin } from "lucide-react";

const axisIcons = {
  SEO: Search,
  AEO: Bot,
  GEO: MapPin,
};

const axisColors = {
  SEO: 'text-primary',
  AEO: 'text-accent',
  GEO: 'text-score-excellent',
};

interface AxisCardProps {
  axis: AxisAnalysis;
}

export default function AxisCard({ axis }: AxisCardProps) {
  const Icon = axisIcons[axis.label as keyof typeof axisIcons] || Search;
  const colorClass = axisColors[axis.label as keyof typeof axisColors] || 'text-primary';

  return (
    <div className="bg-card rounded-xl shadow-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${colorClass}`} />
        <h3 className="font-semibold text-foreground text-sm">{axis.label}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{axis.description}</p>

      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-foreground">진단 결과</span>
        <ul className="space-y-1">
          {axis.findings.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground/60 mt-0.5 shrink-0">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-border">
        <span className="text-[11px] font-medium text-primary">🔧 바로 고칠 것</span>
        <ul className="space-y-1">
          {axis.quickFixes.map((item, i) => (
            <li key={i} className="text-xs text-foreground leading-relaxed flex gap-2">
              <span className="text-primary mt-0.5 shrink-0">{i + 1}.</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
