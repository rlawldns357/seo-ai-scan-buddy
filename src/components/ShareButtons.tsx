import { useState, useCallback } from "react";
import { Share2, Twitter, Linkedin, MessageCircle, Download, Check, Copy } from "lucide-react";
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
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e293b");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 630);

    // Subtle grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 630); ctx.stroke();
    }
    for (let y = 0; y < 630; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1200, y); ctx.stroke();
    }

    // Title
    const domain = (() => {
      try { return new URL(url).hostname; } catch { return url; }
    })();

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "500 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SEO · AEO · GEO 분석 리포트", 600, 80);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(domain, 600, 125);

    // Score cards
    const scores = [
      { label: "SEO", score: result.seoScore, color: "#6366f1", desc: "검색 노출" },
      { label: "AEO", score: result.aeoScore, color: "#f59e0b", desc: "답변 채택" },
      { label: "GEO", score: result.geoScore, color: "#10b981", desc: "AI 인용" },
    ];

    const cardWidth = 300;
    const cardHeight = 320;
    const gap = 50;
    const startX = (1200 - (cardWidth * 3 + gap * 2)) / 2;
    const startY = 170;

    scores.forEach(({ label, score, color, desc }, i) => {
      const x = startX + i * (cardWidth + gap);
      const y = startY;

      // Card background
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, x, y, cardWidth, cardHeight, 20);
      ctx.fill();

      // Card border
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, cardWidth, cardHeight, 20);
      ctx.stroke();

      // Score circle
      const cx = x + cardWidth / 2;
      const cy = y + 130;
      const radius = 70;

      // Background circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 8;
      ctx.stroke();

      // Score arc
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * score) / 100;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.lineCap = "butt";

      // Score number
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${score}`, cx, cy + 16);

      // Label
      ctx.fillStyle = color;
      ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(label, cx, y + 240);

      // Description
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "400 16px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(desc, cx, y + 270);
    });

    // Footer branding
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "500 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SearchTune OS | searchtuneos.com", 600, 570);

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
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const shareText = buildShareText(result, url);
  const siteUrl = "https://searchtuneos.com";

  const handleTwitter = () => {
    trackEvent("share_click", { platform: "twitter" });
    const text = encodeURIComponent(shareText);
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank", "width=600,height=400");
  };

  const handleLinkedIn = () => {
    trackEvent("share_click", { platform: "linkedin" });
    const text = encodeURIComponent(shareText);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}&summary=${text}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const handleKakao = () => {
    trackEvent("share_click", { platform: "kakao" });
    const domain = (() => {
      try { return new URL(url).hostname; } catch { return url; }
    })();

    if (typeof window !== "undefined" && (window as any).Kakao?.Share) {
      (window as any).Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `${domain} SEO·AEO·GEO 분석 결과`,
          description: `SEO ${result.seoScore}점 | AEO ${result.aeoScore}점 | GEO ${result.geoScore}점`,
          imageUrl: "https://searchtuneos.com/og-image.png",
          link: { mobileWebUrl: siteUrl, webUrl: siteUrl },
        },
        buttons: [
          { title: "무료로 분석하기", link: { mobileWebUrl: siteUrl, webUrl: siteUrl } },
        ],
      });
    } else {
      // Fallback: copy text
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      setCardImage(dataUrl);

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
          onClick={handleTwitter}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0f1419] text-white hover:bg-[#1d2731] transition-colors"
        >
          <Twitter className="w-3.5 h-3.5" />
          X (Twitter)
        </button>

        <button
          onClick={handleLinkedIn}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0077b5] text-white hover:bg-[#006097] transition-colors"
        >
          <Linkedin className="w-3.5 h-3.5" />
          LinkedIn
        </button>

        <button
          onClick={handleKakao}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#FEE500] text-[#3C1E1E] hover:bg-[#F5DC00] transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          카카오톡
        </button>

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

      {/* Preview of generated card */}
      {cardImage && (
        <div className="mt-4 rounded-lg overflow-hidden border border-border">
          <img src={cardImage} alt="점수 카드" className="w-full" />
        </div>
      )}
    </div>
  );
}