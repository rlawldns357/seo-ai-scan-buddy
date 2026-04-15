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
          {result.google.topResults.length > 0 && (
            <ul className="space-y-0.5">
              {result.google.topResults.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground truncate">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {r.title || r.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
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
            {result.naver.domainFound ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-score-excellent">
                <CheckCircle className="w-3.5 h-3.5" />
                노출 확인
              </span>
            ) : result.naver.resultCount === 0 && result.naver.topResults.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-score-poor">
                <XCircle className="w-3.5 h-3.5" />
                미노출
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                수동 확인
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {result.naver.domainFound
              ? `네이버에서 ${result.naver.resultCount}건의 관련 결과가 발견됨`
              : "네이버 검색에서 이 도메인의 페이지가 발견되지 않았습니다"}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            * 도메인명 키워드 검색 기반의 간접 확인 결과입니다
          </p>
          {result.naver.topResults.length > 0 && (
            <ul className="space-y-0.5">
              {result.naver.topResults.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground truncate">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {r.title || r.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
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
    </div>
  );
};

export default IndexingStatus;
