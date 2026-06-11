import { AlertTriangle, Globe2 } from "lucide-react";
import { type PsiError } from "@/lib/psi";

interface PsiErrorBannerProps {
  error: PsiError;
  onRetry: () => void;
  /** 측정 대상 URL — 한국 도메인(.kr) + unreachable/timeout 이면 geo-block 가능성 안내로 전환 */
  url?: string;
  /** analyze-site가 KR proxy fallback으로 성공했음 → 외부 도구(Lighthouse 등)가 막힐 수 있다는 강한 신호 */
  geoFallbackApplied?: boolean;
}

const nextActionMap: Record<PsiError['type'], string> = {
  blocked: 'robots.txt를 확인한 뒤 다시 시도해 주세요.',
  timeout: '잠시 후 다시 시도하거나 다른 URL을 입력해 주세요.',
  quota: '잠시 후 다시 시도해 주세요.',
  unreachable: 'URL이 맞는지 확인하거나 다른 URL을 입력해 주세요.',
  unknown: '다시 시도하거나 다른 URL을 입력해 주세요.',
};

function isKoreanHost(url?: string): boolean {
  if (!url) return false;
  try {
    const h = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
    return /\.kr$/.test(h) || /\.kr\./.test(h);
  } catch {
    return false;
  }
}

export default function PsiErrorBanner({ error, onRetry, url, geoFallbackApplied }: PsiErrorBannerProps) {
  const geoLikely =
    (error.type === 'unreachable' || error.type === 'timeout') &&
    (geoFallbackApplied || isKoreanHost(url));

  if (geoLikely) {
    return (
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 animate-fade-up flex items-start gap-3" style={{ animationDelay: '0.15s' }}>
        <Globe2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-foreground font-semibold">
            🌏 해외에서 이 사이트에 접근할 수 없어요 (지역 차단 가능성)
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Google Lighthouse는 미국 리전에서 측정해서 막힌 것으로 보여요.{' '}
            <span className="font-medium text-foreground">SEO·AEO·GEO 분석은 정상적으로 끝났어요.</span>
            <br />
            방화벽/CDN에서 <span className="font-medium">Googlebot·해외 IP 허용</span>을 켜면 PageSpeed Insights·Search Console URL 검사 같은 글로벌 SEO 도구도 정상 동작해요.
          </p>
          <button
            onClick={onRetry}
            className="mt-2 text-xs text-primary hover:underline font-semibold"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

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
