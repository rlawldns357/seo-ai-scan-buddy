// 픽셀 아트 엔진 — 메이저 버전에 따라 진화
// v1: 작은 코어 / v2: + 안테나 / v3: + 팔 / v4: + 보조 위성 / v5+: + 오라
import { cn } from "@/lib/utils";

type Props = {
  major: number;
  minor: number;
  className?: string;
  size?: number;
};

const CELL = 8;
const GRID = 16;

function px(x: number, y: number, color: string, w = 1, h = 1) {
  return <rect key={`${x}-${y}-${color}`} x={x * CELL} y={y * CELL} width={w * CELL} height={h * CELL} fill={color} />;
}

export default function PixelEngine({ major, minor, className, size = 160 }: Props) {
  const stage = Math.min(major, 5);

  // 색상 팔레트 (HSL — 디자인 토큰과 어울리게 직접 hex 사용)
  const body = "#3b82f6";      // primary blue
  const bodyDk = "#1d4ed8";
  const eye = "#f8fafc";
  const eyeGlow = "#22d3ee";
  const antenna = "#a78bfa";
  const arm = "#475569";
  const aura = "#fcd34d";
  const sat = "#22c55e";

  const pixels: JSX.Element[] = [];

  // === 오라 (v5+) ===
  if (stage >= 5) {
    // 외곽 깜빡이는 오라 — 8 corners
    const auraCells = [
      [2, 5], [2, 10], [13, 5], [13, 10],
      [5, 2], [10, 2], [5, 13], [10, 13],
    ];
    auraCells.forEach(([x, y]) => pixels.push(px(x, y, aura)));
  }

  // === 보조 위성 (v4+) ===
  if (stage >= 4) {
    pixels.push(px(1, 7, sat));
    pixels.push(px(0, 8, sat));
    pixels.push(px(1, 8, sat));
    pixels.push(px(14, 7, sat));
    pixels.push(px(15, 8, sat));
    pixels.push(px(14, 8, sat));
  }

  // === 안테나 (v2+) ===
  if (stage >= 2) {
    pixels.push(px(7, 1, antenna));
    pixels.push(px(8, 1, antenna));
    pixels.push(px(7, 2, antenna));
    pixels.push(px(8, 2, antenna));
    // 안테나 빛
    pixels.push(px(7, 0, eyeGlow));
    pixels.push(px(8, 0, eyeGlow));
  }

  // === 본체 (모든 단계) — 6x6 코어 ===
  // top edge
  for (let x = 5; x <= 10; x++) pixels.push(px(x, 4, bodyDk));
  // body fill
  for (let y = 5; y <= 9; y++) {
    for (let x = 5; x <= 10; x++) {
      pixels.push(px(x, y, body));
    }
  }
  // bottom edge
  for (let x = 5; x <= 10; x++) pixels.push(px(x, 10, bodyDk));

  // === 눈 (모든 단계) ===
  pixels.push(px(6, 6, eye));
  pixels.push(px(9, 6, eye));
  // 눈동자
  pixels.push(px(6, 7, eyeGlow));
  pixels.push(px(9, 7, eyeGlow));

  // === 입 (v3+ 활기) ===
  if (stage >= 3) {
    pixels.push(px(7, 8, eyeGlow));
    pixels.push(px(8, 8, eyeGlow));
  } else {
    pixels.push(px(7, 8, bodyDk));
    pixels.push(px(8, 8, bodyDk));
  }

  // === 팔 (v3+) ===
  if (stage >= 3) {
    pixels.push(px(4, 6, arm));
    pixels.push(px(4, 7, arm));
    pixels.push(px(11, 6, arm));
    pixels.push(px(11, 7, arm));
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${GRID * CELL} ${GRID * CELL}`}
        shapeRendering="crispEdges"
        className="drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]"
      >
        {/* background dots grid for retro feel */}
        <rect width={GRID * CELL} height={GRID * CELL} fill="hsl(var(--muted))" rx="8" />
        {pixels}
      </svg>
      {/* level badge */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold shadow-md">
        v{major}.{minor}
      </div>
    </div>
  );
}
