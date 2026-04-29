import { useState, useCallback, useRef } from "react";
import { Share2, Download, Check, Copy, Twitter, Linkedin, MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { type DemoResult } from "@/data/demoResults";

interface ShareButtonsProps {
  result: DemoResult;
  url: string;
}

const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
const SHARE_LANDING = "https://searchtuneos.com";

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
    SHARE_LANDING,
  ].join("\n");
}

function buildShortShareText(result: DemoResult, url: string) {
  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();
  return `${domain} SEO ${result.seoScore} · AEO ${result.aeoScore} · GEO ${result.geoScore} | SearchTune OS`;
}

function generateScoreCardCanvas(result: DemoResult, url: string): Promise<Blob> {
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

      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, x, y, cardW, cardH, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, cardW, cardH, 24);
      ctx.stroke();

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

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${score}`, cx, cy + 22);

      const textX = x + 360;
      ctx.textAlign = "left";
      ctx.fillStyle = color;
      ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(label, textX, cy - 10);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "400 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(desc, textX, cy + 30);
    });

    // Watermarks
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

    canvas.toBlob((blob) => {
      resolve(blob!);
    }, "image/png");
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

async function uploadCardToStorage(blob: Blob): Promise<string> {
  const filename = `${crypto.randomUUID()}.png`;
  const { error } = await supabase.storage
    .from("og-images")
    .upload(filename, blob, { contentType: "image/png", cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from("og-images").getPublicUrl(filename);
  return data.publicUrl;
}

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share?: {
        sendDefault: (opts: Record<string, unknown>) => void;
      };
    };
  }
}

function ensureKakaoInit(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.Kakao || !KAKAO_JS_KEY) return false;
  if (!window.Kakao.isInitialized()) {
    try { window.Kakao.init(KAKAO_JS_KEY); } catch { return false; }
  }
  return !!window.Kakao.Share;
}

export default function ShareButtons({ result, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busyKakao, setBusyKakao] = useState(false);
  const cardUrlCache = useRef<string | null>(null);

  const shareText = buildShareText(result, url);
  const shortText = buildShortShareText(result, url);
  const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();

  const getOrUploadCard = useCallback(async (): Promise<string> => {
    if (cardUrlCache.current) return cardUrlCache.current;
    const blob = await generateScoreCardCanvas(result, url);
    const publicUrl = await uploadCardToStorage(blob);
    cardUrlCache.current = publicUrl;
    return publicUrl;
  }, [result, url]);

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
      const blob = await generateScoreCardCanvas(result, url);
      const objUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `searchtune-${domain}.png`;
      link.href = objUrl;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
    } finally {
      setGenerating(false);
    }
  }, [result, url, generating, domain]);

  const handleTwitter = () => {
    trackEvent("share_click", { platform: "twitter" });
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}&url=${encodeURIComponent(SHARE_LANDING)}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const handleLinkedIn = () => {
    trackEvent("share_click", { platform: "linkedin" });
    const intent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_LANDING)}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleThreads = () => {
    trackEvent("share_click", { platform: "threads" });
    const intent = `https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  const handleKakao = useCallback(async () => {
    if (busyKakao) return;
    trackEvent("share_click", { platform: "kakao" });

    if (!KAKAO_JS_KEY) {
      // Kakao SDK 미설정: 폴백으로 텍스트 복사 + 다운로드 안내
      await navigator.clipboard.writeText(shareText);
      alert("점수 카드를 다운로드한 뒤 카카오톡에 붙여넣어 주세요.\n(공유 텍스트는 클립보드에 복사되었습니다)");
      await handleDownloadCard();
      return;
    }

    setBusyKakao(true);
    try {
      const ready = ensureKakaoInit();
      if (!ready) throw new Error("Kakao SDK not ready");

      const imageUrl = await getOrUploadCard();

      window.Kakao!.Share!.sendDefault({
        objectType: "feed",
        content: {
          title: `${domain} SEO·AEO·GEO 점수`,
          description: `SEO ${result.seoScore} · AEO ${result.aeoScore} · GEO ${result.geoScore}\nSearchTune OS로 무료 분석하기`,
          imageUrl,
          link: { mobileWebUrl: SHARE_LANDING, webUrl: SHARE_LANDING },
        },
        buttons: [
          {
            title: "내 사이트 분석하기",
            link: { mobileWebUrl: SHARE_LANDING, webUrl: SHARE_LANDING },
          },
        ],
      });
    } catch (e) {
      console.warn("[kakao] share failed", e);
      await navigator.clipboard.writeText(shareText);
      alert("카카오 공유에 실패했어요. 텍스트를 복사했으니 직접 붙여넣어 주세요.");
    } finally {
      setBusyKakao(false);
    }
  }, [busyKakao, shareText, getOrUploadCard, domain, result, handleDownloadCard]);

  return (
    <div className="bg-card rounded-xl shadow-card px-4 py-3 animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Share2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">점수 공유</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            워터마크 포함 점수 카드
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleKakao}
            disabled={busyKakao}
            aria-label="카카오톡 공유"
            title="카카오톡"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FEE500] text-[#3C1E1E] hover:brightness-95 transition-all disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
          </button>

          <button
            onClick={handleTwitter}
            aria-label="X (Twitter) 공유"
            title="X (Twitter)"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <Twitter className="w-4 h-4" />
          </button>

          <button
            onClick={handleLinkedIn}
            aria-label="LinkedIn 공유"
            title="LinkedIn"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0A66C2] text-white hover:brightness-110 transition-all"
          >
            <Linkedin className="w-4 h-4" />
          </button>

          <button
            onClick={handleThreads}
            aria-label="Threads 공유"
            title="Threads"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <span className="w-px h-5 bg-border mx-0.5" aria-hidden />

          <button
            onClick={handleCopyText}
            aria-label="텍스트 복사"
            title={copied ? "복사됨!" : "텍스트 복사"}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-score-excellent" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownloadCard}
            disabled={generating}
            aria-label="점수 카드 이미지 저장"
            title={generating ? "생성 중..." : "이미지 저장"}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
