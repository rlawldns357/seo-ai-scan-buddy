import { type PsiResult, type PsiError } from "@/lib/psi";
import { Globe, ImageOff } from "lucide-react";

interface PageThumbnailProps {
  psi: PsiResult | null;
  psiError: PsiError | null;
  url: string;
}

export default function PageThumbnail({ psi, psiError, url }: PageThumbnailProps) {
  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <div className="bg-card rounded-xl shadow-card p-5 animate-fade-up flex items-center gap-4" style={{ animationDelay: '0.05s' }}>
      <div className="shrink-0 w-[160px] h-[100px] rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
        {psi?.screenshot ? (
          <img
            src={psi.screenshot}
            alt={`${domain} 페이지 스크린샷`}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            {psiError ? (
              <ImageOff className="w-6 h-6" />
            ) : (
              <img src={faviconUrl} alt="" className="w-8 h-8" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }} />
            )}
            <span className="text-[10px]">{psiError ? '스크린샷 불가' : domain}</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">최종 URL</span>
        </div>
        <p className="text-sm font-medium text-foreground truncate">
          {psi?.finalUrl || url}
        </p>
        {psiError && (
          <p className="text-xs text-score-warning mt-1.5">{psiError.message}</p>
        )}
      </div>
    </div>
  );
}
