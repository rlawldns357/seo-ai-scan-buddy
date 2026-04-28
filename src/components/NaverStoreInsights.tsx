import { useState } from "react";
import { Store, AlertTriangle, ExternalLink, Info, ChevronDown, Sparkles, Target, ArrowRight, Search } from "lucide-react";
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
 * 각 지표 옆 ⓘ 버튼으로 쉬운 용어 풀이 + 산출 기준 토글.
 */

/* ── 정보 토글 박스: 용어 풀이 + 산출 기준 ── */
function InfoToggle({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="w-3 h-3" />
        {title}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-lg bg-muted/40 border border-border/60 p-3 text-[11px] leading-relaxed text-muted-foreground space-y-1.5 animate-fade-up">
          {children}
        </div>
      )}
    </div>
  );
}

export default function NaverStoreInsights({ context }: NaverStoreInsightsProps) {
  const leakagePct = Math.round(context.authorityLeakageRatio * 100);
  const ownPct = Math.round(context.ownContentRatio * 100);

  // 도넛 (권위 누수율)
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (leakagePct / 100) * circumference;

  const surfaces = [
    { label: "쇼핑", key: "shop", count: context.externalSurfaces.shop, color: "bg-emerald-500", desc: "네이버 쇼핑 검색에 노출되는 상품·스토어 결과" },
    { label: "블로그", key: "blog", count: context.externalSurfaces.blog, color: "bg-blue-500", desc: "네이버 블로그에서 브랜드명을 언급한 글 수" },
    { label: "카페", key: "cafe", count: context.externalSurfaces.cafe, color: "bg-violet-500", desc: "네이버 카페 게시글·댓글에서의 브랜드 언급" },
    { label: "지식인", key: "kin", count: context.externalSurfaces.kin, color: "bg-amber-500", desc: "지식iN Q&A에서 브랜드가 등장한 답변 수" },
    { label: "웹문서", key: "webkr", count: context.externalSurfaces.webkr, color: "bg-rose-500", desc: "네이버 웹문서 색인에 잡힌 외부 사이트 언급" },
  ];
  const maxCount = Math.max(1, ...surfaces.map((s) => s.count));
  const totalMentions = surfaces.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-4">
      {/* 1) 브랜드 인식 카드 — "우리는 이 URL을 이렇게 봤어요" */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-emerald-500/0 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-500">
              URL 인식 결과
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              입력하신 주소를 다음과 같이 분석했어요
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg bg-background/60 border border-border/60 px-3 py-2">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">플랫폼</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {context.type === "brand" ? "브랜드스토어" : "스마트스토어"}
            </p>
          </div>
          <div className="rounded-lg bg-background/60 border border-border/60 px-3 py-2">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">스토어 식별자</p>
            <p className="text-sm font-bold text-foreground mt-0.5 font-mono truncate" title={context.slug}>
              {context.slug}
            </p>
          </div>
          <div className="rounded-lg bg-background/60 border border-border/60 px-3 py-2 col-span-2 sm:col-span-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">검색 키워드</p>
            <p className="text-sm font-bold text-foreground mt-0.5 truncate" title={context.slug}>
              "{context.slug}"
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            스토어 슬러그(<span className="font-mono font-semibold text-foreground">{context.slug}</span>)를
            브랜드명으로 간주하고 네이버 5개 채널에서 검색·집계했어요.
            슬러그가 실제 브랜드명과 다르거나 일반 단어와 겹칠 경우 결과가 부정확할 수 있어요.
          </p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
          <a
            href={context.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            {context.storeUrl.replace(/^https?:\/\//, "")}
          </a>
          <a
            href={`https://search.naver.com/search.naver?query=${encodeURIComponent(context.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-700 dark:text-emerald-500 hover:underline inline-flex items-center gap-1 font-semibold"
          >
            <Search className="w-3 h-3" />
            네이버에서 직접 확인
          </a>
        </div>
      </div>

      {/* 헤더 */}
      <div className="flex items-center gap-2 px-1 pt-2">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          📊 스토어 전용 진단 근거
        </span>
      </div>

      {/* 권위 누수 도넛 + 요약 */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* 도넛 */}
          <div className="relative flex-shrink-0">
            <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
              <circle cx="75" cy="75" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
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
              <span className="text-3xl font-extrabold text-destructive leading-none">{leakagePct}%</span>
              <span className="text-[10px] text-muted-foreground mt-1 font-medium">권위 누수</span>
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
            <InfoToggle title="권위 누수란? · 산출 기준 보기">
              <p>
                <span className="font-semibold text-foreground">쉬운 풀이:</span> '검색 권위(Authority)'는
                구글·네이버가 한 도메인에 쌓아두는 신뢰도 점수예요. 스토어처럼 자체 도메인이 없으면
                내가 콘텐츠를 잘 만들어도 그 점수가 전부 <code className="px-1 rounded bg-background">naver.com</code>으로 흘러갑니다.
              </p>
              <p>
                <span className="font-semibold text-foreground">산출 방법:</span> 브랜드명으로 네이버 검색 시
                상위 결과 중 스토어/자사 도메인 비율을 측정해 (1 − 자사비율) × 100 으로 계산했어요.
              </p>
              <p className="text-foreground">
                <span className="font-semibold">우리 기준:</span> 30% 이하 양호 · 30~60% 주의 · 60% 초과 위험
              </p>
            </InfoToggle>
          </div>
        </div>
      </div>

      {/* 외부 채널 점유율 바 */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-sm font-bold text-foreground">외부 채널별 브랜드 언급량</h4>
          <span className="text-[11px] text-muted-foreground tabular-nums">총 {totalMentions.toLocaleString()}건</span>
        </div>
        <div className="space-y-2.5">
          {surfaces.map((s) => {
            const pct = (s.count / maxCount) * 100;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-12 text-xs font-medium text-muted-foreground flex-shrink-0">{s.label}</span>
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
          AI 답변 엔진은 외부 채널의 정형화된 콘텐츠를 우선 인용해요. 자사가 통제 가능한 외부 콘텐츠가 없으면
          AI는 제3자 정보로만 브랜드를 묘사합니다.
        </p>
        <InfoToggle title="채널별 의미 · 산출 기준 보기">
          <ul className="space-y-1 list-disc list-inside marker:text-muted-foreground/40">
            {surfaces.map((s) => (
              <li key={s.key}>
                <span className="font-semibold text-foreground">{s.label}</span> — {s.desc}
              </li>
            ))}
          </ul>
          <p>
            <span className="font-semibold text-foreground">산출 방법:</span> 네이버 검색 API로 브랜드명 키워드를
            5개 채널(쇼핑·블로그·카페·지식인·웹문서)에 동시 질의해 각 채널의 결과 건수를 집계했어요.
          </p>
          <p className="text-foreground">
            <span className="font-semibold">우리 기준:</span> 합계 1,000건↑ 우수 · 200~1,000건 보통 · 200건 미만 노출 부족
          </p>
        </InfoToggle>
      </div>

      {/* 하드 블로커 배지 */}
      <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" strokeWidth={2.5} />
        <div className="flex-1 text-sm">
          <p className="font-bold text-destructive mb-1">구조적 한계 (점수 상한 적용 중)</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside marker:text-destructive/60">
            <li>
              <span className="font-semibold text-foreground">자체 도메인 부재</span> — Google·Bing 검색결과 노출 거의 없음
            </li>
            <li>
              <span className="font-semibold text-foreground">robots.txt 차단</span> — ChatGPT·Claude 등 AI 봇이 스토어 페이지를 못 읽어요
            </li>
            <li>
              <span className="font-semibold text-foreground">템플릿 고정</span> — 메타·구조화 데이터(JSON-LD) 등 SEO 요소를 통제할 수 없어요
            </li>
          </ul>
          <InfoToggle title="용어 풀이 · 점수 상한이란?">
            <p>
              <span className="font-semibold text-foreground">robots.txt:</span> 사이트가 검색·AI 봇에게 "어디까지 읽어가도 돼요"라고 알려주는 파일이에요.
              네이버 스토어는 외부 AI 봇 접근을 막아두고 있습니다.
            </p>
            <p>
              <span className="font-semibold text-foreground">JSON-LD / 구조화 데이터:</span> 페이지 내용을 검색엔진이 알아듣기 쉬운 형식으로 정리한 코드.
              템플릿이 고정이라 직접 추가·수정이 불가합니다.
            </p>
            <p>
              <span className="font-semibold text-foreground">점수 상한(Score Cap):</span> 위 한계가 구조적이라 노력으로 넘을 수 없는 상한선을 두어,
              실제 가능한 최대 점수를 반영했어요.
            </p>
            <p className="text-foreground">
              <span className="font-semibold">우리 기준 상한:</span> SEO ≤ 45 · AEO ≤ 50 · GEO ≤ 60
            </p>
          </InfoToggle>
        </div>
      </div>
    </div>
  );
}
