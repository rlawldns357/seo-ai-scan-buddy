import { type PsiResult, type PsiError } from "@/lib/psi";
import { Globe, ImageOff, Clock, ShieldCheck, Download, Check, Copy, Share2 } from "lucide-react";
import { useState, useCallback } from "react";
import { trackEvent } from "@/lib/analytics";
import { type DemoResult } from "@/data/demoResults";

interface ResultHeaderProps {
  psi: PsiResult | null;
  psiError: PsiError | null;
  url: string;
  result?: DemoResult;
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

function generateScoreCardCanvas(result: DemoResult, url: string): Promise<string> {
  return new Promise((resolve) => {
    const W = 1200;
    const H = 630;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e293b");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid
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

    // Title
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SEO · AEO · GEO 분석 리포트", W / 2, 70);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(domain, W / 2, 115);

    // Score cards
    const scores = [
      { label: "SEO", score: result.seoScore, color: "#6366f1", desc: "검색 노출" },
      { label: "AEO", score: result.aeoScore, color: "#f59e0b", desc: "답변 채택" },
      { label: "GEO", score: result.geoScore, color: "#10b981", desc: "AI 인용" },
    ];

    const cardWidth = 300;
    const cardHeight = 320;
    const gap = 50;
    const startX = (W - (cardWidth * 3 + gap * 2)) / 2;
    const startY = 155;

    scores.forEach(({ label, score, color, desc }, i) => {
      const x = startX + i * (cardWidth + gap);
      const y = startY;

      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, x, y, cardWidth, cardHeight, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, cardWidth, cardHeight, 20);
      ctx.stroke();

      const cx = x + cardWidth / 2;
      const cy = y + 120;
      const radius = 70;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 8;
      ctx.stroke();

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * score) / 100;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.lineCap = "butt";

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${score}`, cx, cy + 16);

      ctx.fillStyle = color;
      ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(label, cx, y + 230);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "400 16px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(desc, cx, y + 260);
    });

    // Heavy watermarks
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const wx = col * 240 + 80;
        const wy = row * 150 + 60;
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(-0.3);
        ctx.fillText("SearchTune OS", 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();

    // Footer branding
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, H - 80, W, 80);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SearchTune OS  |  searchtuneos.com  |  무료 AI 검색 최적화 분석", W / 2, H - 35);

    resolve(canvas.toDataURL("image/png"));
  });
}

export default function ResultHeader({ psi, psiError, url, result }: ResultHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  const fetchTime = psi?.fetchTime
    ? new Date(psi.fetchTime).toLocaleString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

  const handleCopyText = async () => {
    if (!result) return;
    trackEvent("share_click", { platform: "copy" });
    await navigator.clipboard.writeText(buildShareText(result, url));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (!result) return;
    trackEvent("share_click", { platform: "native" });
    const text = buildShareText(result, url);
    try {
      await navigator.share({ title: `${domain} SEO·AEO·GEO 분석 결과`, text, url: "https://searchtuneos.com" });
    } catch {
      // user cancelled or not supported — fallback to copy
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCard = useCallback(async () => {
    if (!result || generating) return;
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
    <div className="bg-card rounded-xl shadow-card p-5 animate-fade-up" style={{ animationDelay: '0.05s' }}>
      <div className="flex items-start gap-4">
        {/* Thumbnail / favicon */}
        <div className="shrink-0 w-[120px] h-[75px] rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
          {psi?.screenshot ? (
            <img
              src={psi.screenshot}
              alt={`${domain} 스크린샷`}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              {psiError ? (
                <ImageOff className="w-5 h-5" />
              ) : (
                <img src={faviconUrl} alt="" className="w-6 h-6" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }} />
              )}
              <span className="text-[9px]">{psiError ? '스크린샷 불가' : domain}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground">분석 URL</span>
            </div>
            <p className="text-sm font-medium text-foreground truncate">
              {psi?.finalUrl || url}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {fetchTime}
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-score-excellent/8 text-score-excellent border border-score-excellent/15">
              <ShieldCheck className="w-3 h-3" />
              분석 완료
            </span>
          </div>
        </div>

        {/* Share buttons - top right */}
        {result && (
          <div className="shrink-0 flex items-center gap-1.5">
            <button
              onClick={handleNativeShare}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              title="공유하기"
            >
              <Share2 className="w-3 h-3" />
              공유
            </button>
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
              title="텍스트 복사"
            >
              {copied ? <Check className="w-3 h-3 text-score-excellent" /> : <Copy className="w-3 h-3" />}
              {copied ? "복사됨" : "복사"}
            </button>
            <button
              onClick={handleDownloadCard}
              disabled={generating}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
              title="점수 카드 저장"
            >
              <Download className="w-3 h-3" />
              {generating ? "생성중" : "카드저장"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
