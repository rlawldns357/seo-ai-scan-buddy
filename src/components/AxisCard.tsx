import { type AxisAnalysis } from "@/data/demoResults";
import { Search, Bot, Sparkles } from "lucide-react";

const axisIcons = {
  SEO: Search,
  AEO: Bot,
  GEO: Sparkles,
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
  const Icon = axisIcons[axis.label] || Search;
  const colorClass = axisColors[axis.label] || 'text-primary';

  return (
    <div className="bg-card rounded-xl shadow-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${colorClass}`} />
        <h3 className="font-semibold text-foreground text-sm">{axis.label}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{axis.description}</p>

      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-foreground">핵심 이슈</span>
        <ul className="space-y-1">
          {(axis.issues || []).map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {axis.priorityFix && (
        <div className="space-y-1.5 pt-1 border-t border-border">
          <span className="text-[11px] font-medium text-primary">⚡ 가장 먼저 할 개선</span>
          <p className="text-xs text-foreground leading-relaxed">
            {axis.priorityFix.label}
            <span className="ml-1 text-primary font-medium">{axis.priorityFix.pointRange}</span>
          </p>
        </div>
      )}
    </div>
  );
}
