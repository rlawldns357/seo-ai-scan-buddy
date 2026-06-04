import { type PsiResult, type PsiError } from "@/lib/psi";
import { Globe, ImageOff, Clock, ShieldCheck, Download, Check, Copy, Share2, Cpu, Twitter, Linkedin, MessageCircle } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { type DemoResult } from "@/data/demoResults";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatEngineVersion } from "@/lib/engineVersion";

interface ResultHeaderProps {
  psi: PsiResult | null;
  psiError: PsiError | null;
  url: string;
  result?: DemoResult;
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

/** Generate watermarked 1080x1920 PNG card for sharing/download. */
function generateScoreCardCanvas(result: DemoResult, url: string): Promise<Blob> {
  return new Promise((resolve) => {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(0.5, "#1e293b");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

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

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "500 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SearchTune OS", W / 2, 100);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 26px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("SEO · AEO · GEO 분석 리포트", W / 2, 180);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(domain, W / 2, 240);

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

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, H - 160, W, 160);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "600 30px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("searchtuneos.com", W / 2, H - 95);

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "400 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("무료 AI 검색 최적화 분석 도구", W / 2, H - 55);

    canvas.toBlob((blob) => { resolve(blob!); }, "image/png");
  });
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
        uploadImage?: (opts: { file: File[] }) => Promise<{ infos?: { original?: { url?: string } } }>;
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

export default function ResultHeader({ psi, psiError, url, result }: ResultHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busyKakao, setBusyKakao] = useState(false);
  const [engineVersion, setEngineVersion] = useState<number | null>(null);
  const cardUrlCache = useRef<string | null>(null);

  useEffect(() => {
    supabase
      .rpc("get_engine_version", { _config_key: "analysis_prompt" })
      .then(({ data }) => {
        if (typeof data === "number") setEngineVersion(data);
      });
  }, []);


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

  const shareText = result ? buildShareText(result, url) : "";
  const shortText = result ? buildShortShareText(result, url) : "";

  const getOrUploadCard = useCallback(async (): Promise<string> => {
    if (!result) throw new Error("no result");
    if (cardUrlCache.current) return cardUrlCache.current;
    const blob = await generateScoreCardCanvas(result, url);
    const publicUrl = await uploadCardToStorage(blob);
    cardUrlCache.current = publicUrl;
    return publicUrl;
  }, [result, url]);

  const handleCopyText = async () => {
    if (!result) return;
    trackEvent("share_click", { platform: "copy" });
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCard = useCallback(async () => {
    if (!result || generating) return;
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
    if (!result || busyKakao) return;
    trackEvent("share_click", { platform: "kakao" });

    if (!KAKAO_JS_KEY) {
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
          { title: "내 사이트 분석하기", link: { mobileWebUrl: SHARE_LANDING, webUrl: SHARE_LANDING } },
        ],
      });
    } catch (e) {
      console.warn("[kakao] share failed", e);
      await navigator.clipboard.writeText(shareText);
      alert("카카오 공유에 실패했어요. 텍스트를 복사했으니 직접 붙여넣어 주세요.");
    } finally {
      setBusyKakao(false);
    }
  }, [result, busyKakao, shareText, getOrUploadCard, domain, handleDownloadCard]);

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
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-score-excellent/8 text-score-excellent border border-score-excellent/15 whitespace-nowrap">
              <ShieldCheck className="w-3 h-3" />
              분석 완료
            </span>
            {engineVersion !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/8 text-primary border border-primary/15 whitespace-nowrap">
                <Cpu className="w-3 h-3" />
                엔진 v{formatEngineVersion(engineVersion)}
              </span>
            )}
          </div>
        </div>

        {/* Share popover trigger - top right */}
        {result && (
          <div className="shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  aria-label="점수 공유"
                  title="점수 카드 공유"
                  className="group relative inline-flex items-center gap-1.5 pl-2.5 pr-3 h-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border border-primary/20 hover:border-primary/40 text-primary shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 group-hover:bg-primary/25 transition-colors">
                    <Share2 className="w-3 h-3" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-score-excellent ring-2 ring-card animate-pulse" />
                  </span>
                  <span className="text-[11px] font-semibold tracking-tight">공유</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-64 p-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">점수 카드 공유</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={handleKakao}
                      disabled={busyKakao}
                      aria-label="카카오톡 공유"
                      title="카카오톡"
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FEE500] text-[#3C1E1E]">
                        <MessageCircle className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] text-muted-foreground">카카오</span>
                    </button>
                    <button
                      onClick={handleTwitter}
                      aria-label="X 공유"
                      title="X (Twitter)"
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background">
                        <Twitter className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] text-muted-foreground">X</span>
                    </button>
                    <button
                      onClick={handleLinkedIn}
                      aria-label="LinkedIn 공유"
                      title="LinkedIn"
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0A66C2] text-white">
                        <Linkedin className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] text-muted-foreground">LinkedIn</span>
                    </button>
                    <button
                      onClick={handleThreads}
                      aria-label="Threads 공유"
                      title="Threads"
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted-foreground/20 text-foreground">
                        <Share2 className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] text-muted-foreground">Threads</span>
                    </button>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyText}
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium bg-muted hover:bg-muted/70 text-foreground transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-score-excellent" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "복사됨" : "텍스트 복사"}
                    </button>
                    <button
                      onClick={handleDownloadCard}
                      disabled={generating}
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {generating ? "생성중" : "이미지 저장"}
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
}
