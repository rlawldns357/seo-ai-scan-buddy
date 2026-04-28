import { Store, AlertTriangle, ExternalLink } from "lucide-react";
import type { NaverStoreContext } from "@/lib/analyze";

interface NaverStoreInsightsProps {
  context: NaverStoreContext;
}

/**
 * 네이버 스토어 분석 결과에만 노출되는 전용 섹션.
 * 1) 권위 누수 도넛 — 검색 권위가 naver.com에 적립된 비율
 * 2) 외부 채널 점유율 바 — 5개 surface별 언급량
 * 3) 하드 블로커 배지 — robots.txt 차단 / 자체 도메인 부재 등
 *
 * mem://logic/naver-store-handling 의 3축 매핑을 보조하는 시각화 레이어.
 */
export default function NaverStoreInsights({ context }: NaverStoreInsightsProps) {
  const leakagePct = Math.round(context.authorityLeakageRatio * 100);
  const ownPct = Math.round(context.ownContentRatio * 100);

  // 도넛 (권위 누수율) — 60px radius, 376 stroke-dasharray
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (leakagePct / 100) * circumference;

  const surfaces = [
    { label: "쇼핑", count: context.externalSurfaces.shop, color: "bg-emerald-500" },
    { label: "블로그", count: context.externalSurfaces.blog, color: "bg-blue-500" },
    { label: "카페", count: context.externalSurfaces.cafe, color: "bg-violet-500" },
    { label: "지식인", count: context.externalSurfaces.kin, color: "bg-amber-500" },
    { label: "웹문서", count: context.externalSurfaces.webkr, color: "bg-rose-500" },
  ];
  const maxCount = Math.max(1, ...surfaces.map((s) => s.count));

  return (
    <div className="space-y-4">
      {/* 헤더 배지 */}
      <div className="flex items-center gap-2 px-1">
        <Store className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          네이버 스토어 진단
        </span>
        <a
          href={context.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          {context.slug}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* 권위 누수 도넛 + 요약 */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* 도넛 */}
          <div className="relative flex-shrink-0">
            <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
              <circle
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="14"
              />
              <circle
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-destructive leading-none">
                {leakagePct}%
              </span>
              <span className="text-[10px] text-muted-foreground mt-1 font-medium">
                권위 누수
              </span>
            </div>
          </div>

          {/* 설명 */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">
              검색 권위의 <span className="text-destructive">{leakagePct}%</span>가 naver.com에 적립돼요
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              브랜드명을 검색해도 자사 스토어가 결과에 노출되는 비율은{" "}
              <span className="font-semibold text-foreground">{ownPct}%</span> 뿐이에요.
              네이버 스토어는 자체 도메인이 없어 검색 권위가 모두 naver.com 도메인으로 귀속됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 외부 채널 점유율 바 */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h4 className="text-sm font-bold text-foreground mb-3">
          외부 채널별 브랜드 언급량
        </h4>
        <div className="space-y-2.5">
          {surfaces.map((s) => {
            const pct = (s.count / maxCount) * 100;
            return (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-12 text-xs font-medium text-muted-foreground flex-shrink-0">
                  {s.label}
                </span>
                <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${s.color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs font-semibold text-foreground tabular-nums flex-shrink-0">
                  {s.count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          AI 답변 엔진은 외부 채널의 정형화된 콘텐츠를 우선 인용해요. 자사가 통제 가능한 외부 콘텐츠가 없으면 AI는 제3자 정보로만 브랜드를 묘사합니다.
        </p>
      </div>

      {/* 하드 블로커 배지 */}
      <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" strokeWidth={2.5} />
        <div className="flex-1 text-sm">
          <p className="font-bold text-destructive mb-1">구조적 한계 (점수 상한 적용 중)</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside marker:text-destructive/60">
            <li>자체 도메인 부재 — Google·Bing 검색결과 노출 거의 없음</li>
            <li>robots.txt가 ChatGPT·Claude 등 AI 봇 크롤 차단</li>
            <li>스토어 템플릿으로 구조화 데이터 통제 불가</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
