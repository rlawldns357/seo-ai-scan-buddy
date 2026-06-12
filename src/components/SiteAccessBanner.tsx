import { Globe2, AlertTriangle } from "lucide-react";
import { type PsiError } from "@/lib/psi";

interface SiteAccessBannerProps {
  url?: string;
  /** analyze-site 실패 메시지 (있으면 우선) */
  analyzeError?: string | null;
  /** PSI 실패 정보 */
  psiError?: PsiError | null;
  /** analyze-site가 KR proxy fallback으로 성공했음 → 외부 도구가 막힐 수 있다는 강한 신호 */
  geoFallbackApplied?: boolean;
  onRetry: () => void;
}

function isKoreanHost(url?: string): boolean {
  if (!url) return false;
  try {
    const h = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
    return /\.kr$/.test(h) || /\.kr\./.test(h);
  } catch {
    return false;
  }
}

const psiNextAction: Record<PsiError['type'], string> = {
  blocked: 'robots.txt를 확인한 뒤 다시 시도해 주세요.',
  timeout: '잠시 후 다시 시도하거나 다른 URL을 입력해 주세요.',
  quota: '잠시 후 다시 시도해 주세요.',
  unreachable: 'URL이 맞는지 확인하거나 다른 URL을 입력해 주세요.',
  unknown: '다시 시도하거나 다른 URL을 입력해 주세요.',
};

/**
 * 통합 "사이트 접근 불가" 배너.
 * - analyzeError + psiError가 동시에 발생해도 1개만 노출
 * - 한국 호스트(.kr) 또는 geoFallbackApplied가 켜졌으면 "지역 차단 가능성" 톤으로 전환
 * - 그 외엔 일반적인 측정 실패 톤
 */
export default function SiteAccessBanner({
  url,
  analyzeError,
  psiError,
  geoFallbackApplied,
  onRetry,
}: SiteAccessBannerProps) {
  const psiAccessLike =
    psiError && (psiError.type === 'unreachable' || psiError.type === 'timeout' || psiError.type === 'blocked');
  // analyzeError가 있다는 건 본 분석 자체가 막혔다는 뜻 → 접근/차단 카테고리로 본다
  const accessLike = !!analyzeError || psiAccessLike;

  const geoLikely = accessLike && (geoFallbackApplied || isKoreanHost(url));

  if (geoLikely) {
    const failedAnalyze = !!analyzeError;
    return (
      <div
        className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 animate-fade-up flex items-start gap-3"
        style={{ animationDelay: '0.15s' }}
      >
        <Globe2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-foreground font-semibold">
            🌏 외부에서 이 사이트에 접근하지 못했어요 (지역 차단 가능성)
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {failedAnalyze ? (
              <>
                저희 분석 서버(해외 리전)와 Google Lighthouse(미국 리전) 모두 사이트 응답을 받지 못했어요.{' '}
                <span className="font-medium text-foreground">
                  서버가 해외 IP·봇 트래픽을 차단하고 있을 가능성이 높아요.
                </span>
              </>
            ) : (
              <>
                SEO·AEO·GEO 분석은 정상적으로 끝났지만, Google Lighthouse(미국 리전)에서는 사이트에 접근하지 못했어요.
              </>
            )}
            <br />
            방화벽/CDN에서 <span className="font-medium">Googlebot · 해외 IP 허용</span>을 켜면 PageSpeed Insights · Search Console URL 검사 같은 글로벌 SEO 도구도 정상 동작해요.
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

  // 일반 측정 실패: analyzeError 우선, 그다음 psiError
  const title = analyzeError ? '분석 실패' : 'Lighthouse 측정 실패';
  const message = analyzeError || psiError?.message || '';
  const nextAction = analyzeError
    ? '잠시 후 다시 시도하거나 다른 URL을 입력해 주세요.'
    : psiError
      ? psiNextAction[psiError.type]
      : '';

  return (
    <div
      className="bg-score-warning/5 border border-score-warning/20 rounded-xl p-4 animate-fade-up flex items-start gap-3"
      style={{ animationDelay: '0.15s' }}
    >
      <AlertTriangle className="w-5 h-5 text-score-warning shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm text-foreground font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {nextAction}{' '}
          <button onClick={onRetry} className="text-primary hover:underline font-medium">
            다시 시도
          </button>
        </p>
      </div>
    </div>
  );
}
