import { useEffect, useState } from "react";

interface SemiCircleGaugeProps {
  score: number;
  size?: number;
  delay?: number;
}

const getScoreColor = (score: number) => {
  if (score >= 75) return "hsl(var(--score-excellent))";
  if (score >= 60) return "hsl(var(--score-good))";
  if (score >= 40) return "hsl(var(--score-warning))";
  return "hsl(var(--score-poor))";
};

const getScoreColorClass = (score: number) => {
  if (score >= 75) return "text-score-excellent";
  if (score >= 60) return "text-score-good";
  if (score >= 40) return "text-score-warning";
  return "text-score-poor";
};

const getTrackOpacity = (score: number) => {
  if (score >= 75) return "hsl(var(--score-excellent) / 0.12)";
  if (score >= 60) return "hsl(var(--score-good) / 0.12)";
  if (score >= 40) return "hsl(var(--score-warning) / 0.12)";
  return "hsl(var(--score-poor) / 0.12)";
};

export function getGradeLabel(score: number) {
  if (score >= 75) return "우수";
  if (score >= 60) return "좋음";
  if (score >= 40) return "보통";
  return "개선 필요";
}

export function getGradeColorClass(score: number) {
  return getScoreColorClass(score);
}

export default function SemiCircleGauge({ score, size = 140, delay = 0 }: SemiCircleGaugeProps) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const interval = setInterval(() => {
        current += 1;
        if (current >= score) {
          setAnimated(score);
          clearInterval(interval);
        } else {
          setAnimated(current);
        }
      }, 12);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const strokeWidth = 10;
  const viewBoxSize = size;
  const cx = viewBoxSize / 2;
  const cy = viewBoxSize / 2 + 8;
  const radius = (viewBoxSize - strokeWidth * 2) / 2 - 4;

  // Semi-circle: arc from 180° to 0° (bottom-left to bottom-right going clockwise over the top)
  const circumference = Math.PI * radius;
  const progress = (animated / 100) * circumference;
  const dashOffset = circumference - progress;

  const color = getScoreColor(animated);
  const trackColor = getTrackOpacity(animated);
  const colorClass = getScoreColorClass(animated);

  // Arc path: start at left, go to right via top
  const startX = cx - radius;
  const startY = cy;
  const endX = cx + radius;
  const endY = cy;

  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg
        width={size}
        height={size / 2 + 20}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize / 2 + 24}`}
      >
        {/* Track */}
        <path
          d={arcPath}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.4s ease-out" }}
        />
        {/* Score number */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className={`${colorClass} font-bold`}
          style={{ fontSize: size * 0.22, fill: color }}
        >
          {animated}
        </text>
      </svg>
    </div>
  );
}
