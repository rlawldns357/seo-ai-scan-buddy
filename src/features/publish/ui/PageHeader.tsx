import { LucideIcon } from "lucide-react";

type Tone = "primary" | "accent" | "warning" | "success" | "neutral";

const TONE: Record<Tone, { badge: string; icon: string }> = {
  primary: { badge: "bg-primary/10 text-primary ring-1 ring-primary/20", icon: "text-primary" },
  accent: { badge: "bg-accent/10 text-accent ring-1 ring-accent/20", icon: "text-accent" },
  warning: {
    badge: "bg-score-warning/10 text-score-warning ring-1 ring-score-warning/20",
    icon: "text-score-warning",
  },
  success: {
    badge: "bg-score-excellent/10 text-score-excellent ring-1 ring-score-excellent/20",
    icon: "text-score-excellent",
  },
  neutral: { badge: "bg-muted text-muted-foreground ring-1 ring-border", icon: "text-muted-foreground" },
};

interface Props {
  icon: LucideIcon;
  chip: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  right?: React.ReactNode;
}

/**
 * Standard page header for /dashboard/* sub-routes.
 * Replaces the old SectionShell that lived inside the OnePage scroll feed.
 */
export default function PageHeader({ icon: Icon, chip, title, subtitle, tone = "primary", right }: Props) {
  const t = TONE[tone];
  return (
    <header className="mb-5 flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${t.badge}`}
        >
          <Icon className={`h-3 w-3 ${t.icon}`} /> {chip}
        </span>
        <h1 className="text-[20px] sm:text-[24px] leading-tight font-bold tracking-tight text-foreground mt-2 break-keep">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] sm:text-sm leading-[20px] text-muted-foreground mt-1 break-keep max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
