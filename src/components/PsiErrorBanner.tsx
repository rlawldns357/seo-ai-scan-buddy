import { AlertTriangle } from "lucide-react";
import { type PsiError } from "@/lib/psi";

interface PsiErrorBannerProps {
  error: PsiError;
  onRetry: () => void;
}

const nextActionMap: Record<PsiError['type'], string> = {
  blocked: 'robots.txt를 확인한 뒤 다시 시도해 주세요.',
  timeout: '잠시 후 다시 시도하거나 다른 URL을 입력해 주세요.',
  quota: '잠시 후 다시 시도해 주세요.',
  unreachable: 'URL이 맞는지 확인하거나 다른 URL을 입력해 주세요.',
  unknown: '다시 시도하거나 다른 URL을 입력해 주세요.',
};

export default function PsiErrorBanner({ error, onRetry }: PsiErrorBannerProps) {
  return (
    <div className="bg-score-warning/5 border border-score-warning/20 rounded-xl p-4 animate-fade-up flex items-start gap-3" style={{ animationDelay: '0.15s' }}>
      <AlertTriangle className="w-5 h-5 text-score-warning shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm text-foreground font-medium">Lighthouse 측정 실패</p>
        <p className="text-xs text-muted-foreground mt-0.5">{error.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {nextActionMap[error.type]}{' '}
          <button onClick={onRetry} className="text-primary hover:underline font-medium">다시 시도</button>
        </p>
      </div>
    </div>
  );
}
