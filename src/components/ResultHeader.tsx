import { type PsiResult, type PsiError } from "@/lib/psi";
import { Globe, ImageOff, Clock, ShieldCheck } from "lucide-react";

interface ResultHeaderProps {
  psi: PsiResult | null;
  psiError: PsiError | null;
  url: string;
}

export default function ResultHeader({ psi, psiError, url }: ResultHeaderProps) {
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
      </div>
    </div>
  );
}
