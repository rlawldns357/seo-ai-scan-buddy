import { useCallback, useState } from "react";
import { Share2, Twitter, Linkedin, MessageCircle, Copy, Check, Link as LinkIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trackEvent } from "@/lib/analytics";

const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share?: { sendDefault: (opts: Record<string, unknown>) => void };
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

interface BlogShareButtonProps {
  title: string;
  excerpt?: string;
  url: string;       // canonical share URL (absolute)
  imageUrl?: string; // OG image (absolute https URL)
  category?: string;
}

export default function BlogShareButton({ title, excerpt, url, imageUrl, category }: BlogShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [busyKakao, setBusyKakao] = useState(false);

  const desc = excerpt || `${category ? `[${category}] ` : ""}서치튠OS 블로그`;
  const shareText = `${title}\n${desc}\n${url}`;

  const handleCopyLink = async () => {
    trackEvent("share_click", { platform: "copy_link", url });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const handleCopyText = async () => {
    trackEvent("share_click", { platform: "copy_text", url });
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  const handleTwitter = () => {
    trackEvent("share_click", { platform: "twitter", url });
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const handleLinkedIn = () => {
    trackEvent("share_click", { platform: "linkedin", url });
    const intent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleThreads = () => {
    trackEvent("share_click", { platform: "threads", url });
    const intent = `https://www.threads.net/intent/post?text=${encodeURIComponent(`${title}\n${url}`)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  const handleKakao = useCallback(async () => {
    if (busyKakao) return;
    trackEvent("share_click", { platform: "kakao", url });

    if (!KAKAO_JS_KEY) {
      try { await navigator.clipboard.writeText(shareText); } catch { /* noop */ }
      alert("링크가 복사되었어요. 카카오톡에 붙여넣어 주세요.");
      return;
    }

    setBusyKakao(true);
    try {
      const ready = ensureKakaoInit();
      if (!ready) throw new Error("Kakao SDK not ready");

      window.Kakao!.Share!.sendDefault({
        objectType: "feed",
        content: {
          title,
          description: desc,
          imageUrl: imageUrl || "",
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [
          { title: "글 읽으러 가기", link: { mobileWebUrl: url, webUrl: url } },
        ],
      });
    } catch (e) {
      console.warn("[kakao] blog share failed", e);
      try { await navigator.clipboard.writeText(shareText); } catch { /* noop */ }
      alert("카카오 공유에 실패했어요. 링크를 복사했으니 직접 붙여넣어 주세요.");
    } finally {
      setBusyKakao(false);
    }
  }, [busyKakao, title, desc, imageUrl, url, shareText]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="이 글 공유"
          title="이 글 공유"
          className="group relative inline-flex items-center gap-1.5 pl-2.5 pr-3 h-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 border border-primary/20 hover:border-primary/40 text-primary shadow-sm hover:shadow-md transition-all duration-200"
        >
          <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 group-hover:bg-primary/25 transition-colors">
            <Share2 className="w-3 h-3" />
          </span>
          <span className="text-[11px] font-semibold tracking-tight">공유</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">이 글 공유하기</span>
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
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
              {copied ? "복사됨" : "링크 복사"}
            </button>
            <button
              onClick={handleCopyText}
              className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium bg-muted hover:bg-muted/70 text-foreground transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              텍스트 복사
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
