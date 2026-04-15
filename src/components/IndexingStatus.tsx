import { Globe, Search, ExternalLink, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { IndexingResult } from "@/lib/checkIndexing";

interface IndexingStatusProps {
  result: IndexingResult | null;
  loading: boolean;
  url: string;
}

const IndexingStatus = ({ result, loading, url }: IndexingStatusProps) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          검색 엔진 노출 상태 확인 중…
        </div>
      </div>
    );
  }

  if (!result) return null;

  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-wider">
        <Globe className="w-4 h-4 text-primary" />
        검색 엔진 노출 상태
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Google */}
        <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Google
            </span>
            {result.google.urlIndexed ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-score-excellent">
                <CheckCircle className="w-3.5 h-3.5" />
                노출 중
              </span>
            ) : result.google.domainIndexed ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-score-warning">
                <CheckCircle className="w-3.5 h-3.5" />
                도메인만
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-score-poor">
                <XCircle className="w-3.5 h-3.5" />
                미노출
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {result.google.domainIndexed
              ? `도메인에서 약 ${result.google.domainPages}개 이상의 페이지가 발견됨`
              : "구글에서 이 도메인의 페이지가 발견되지 않았습니다"}
          </p>
          <a
            href={`https://www.google.com/search?q=site:${encodeURIComponent(domain)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            직접 확인 <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Naver */}
        <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              네이버
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              수동 확인
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            네이버는 API 제한으로 자동 확인이 어렵습니다. 아래 링크에서 직접 확인해 주세요.
          </p>
          <a
            href={result.naver.checkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            네이버에서 확인 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Top indexed pages */}
      {result.google.topResults.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">구글에 노출된 페이지</p>
          <ul className="space-y-1">
            {result.google.topResults.map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground truncate">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {r.title || r.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default IndexingStatus;
