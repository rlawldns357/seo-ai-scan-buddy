import { useState, useCallback } from "react";
import { Share2, Download, Check, Copy } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { type DemoResult } from "@/data/demoResults";

interface ShareButtonsProps {
  result: DemoResult;
  url: string;
}

function getGradeEmoji(score: number) {
  if (score >= 80) return "🟢";
  if (score >= 60) return "🟡";
  return "🔴";
}

function buildShareText(result: DemoResult, url: string) {
  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return [
    `🔍 ${domain} SEO·AEO·GEO 분석 결과`,
    "",
    `${getGradeEmoji(result.seoScore)} SEO: ${result.seoScore}점`,
    `${getGradeEmoji(result.aeoScore)} AEO: ${result.aeoScore}점`,
    `${getGradeEmoji(result.geoScore)} GEO: ${result.geoScore}점`,
    "",
    "SearchTune OS로 무료 분석하기 👇",
    "https://searchtuneos.com",
  ].join("\n");
}

function generateScoreCardCanvas(result: DemoResult, url: string): Promise<string> {
  return new Promise((resolve) => {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e293b");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const domain = (() => {
      try { return new URL(url).hostname; } catch { return url; }
    })();

    // Top branding
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "500 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SearchTune OS", W / 2, 100);

    // Title
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 26px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("SEO · AEO · GEO 분석 리포트", W / 2, 180);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(domain, W / 2, 240);

    // Score cards - vertical layout
    const scores = [
      { label: "SEO", score: result.seoScore, color: "#6366f1", desc: "검색 노출 최적화" },
      { label: "AEO", score: result.aeoScore, color: "#f59e0b", desc: "AI 답변 채택률" },
      { label: "GEO", score: result.geoScore, color: "#10b981", desc: "생성형 AI 인용률" },
    ];

    const cardW = 800;
    const cardH = 340;
    const gap = 40;
    const startX = (W - cardW) / 2;
    const startY = 320;

    scores.forEach(({ label, score, color, desc }, i) => {
      const x = startX;
      const y = startY + i * (cardH + gap);

      // Card bg
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, x, y, cardW, cardH, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, cardW, cardH, 24);
      ctx.stroke();

      // Circle
      const cx = x + 170;
      const cy = y + cardH / 2;
      const radius = 100;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 12;
      ctx.stroke();

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * score) / 100;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.lineCap = "butt";

      // Score number
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${score}`, cx, cy + 22);

      // Label + desc on the right
      const textX = x + 360;
      ctx.textAlign = "left";
      ctx.fillStyle = color;
      ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(label, textX, cy - 10);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "400 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(desc, textX, cy + 30);
    });

    // Heavy watermarks
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 4; col++) {
        const wx = col * 320 + 100;
        const wy = row * 260 + 130;
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(-0.3);
        ctx.fillText("SearchTune OS", 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();

    // Bottom branding bar
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, H - 160, W, 160);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "600 30px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("searchtuneos.com", W / 2, H - 95);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "400 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("무료 AI 검색 최적화 분석 도구", W / 2, H - 55);

    resolve(canvas.toDataURL("image/png"));
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default function ShareButtons({ result, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const shareText = buildShareText(result, url);

  const handleCopyText = async () => {
    trackEvent("share_click", { platform: "copy" });
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCard = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    trackEvent("share_click", { platform: "score_card" });

    try {
      const dataUrl = await generateScoreCardCanvas(result, url);
      const link = document.createElement("a");
      link.download = "searchtune-score.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setGenerating(false);
    }
  }, [result, url, generating]);

  return (
    <div className="bg-card rounded-xl shadow-card p-5 animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">내 점수 공유하기</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCopyText}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-score-excellent" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "복사됨!" : "텍스트 복사"}
        </button>

        <button
          onClick={handleDownloadCard}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {generating ? "생성 중..." : "점수 카드 저장"}
        </button>
      </div>
    </div>
  );
}
