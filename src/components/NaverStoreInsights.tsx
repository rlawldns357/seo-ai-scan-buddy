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

      {/* 액션 플랜 — 데이터 기반 우선순위 개선안 */}
      <ActionPlan context={context} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
 * 액션 플랜: 진단 데이터를 우선순위 개선안으로 변환
 * ────────────────────────────────────────────────────────────────── */
function ActionPlan({ context }: { context: NaverStoreContext }) {
  const leakagePct = Math.round(context.authorityLeakageRatio * 100);
  const totalMentions =
    context.externalSurfaces.blog +
    context.externalSurfaces.cafe +
    context.externalSurfaces.kin +
    context.externalSurfaces.webkr;
  const hasReview = context.externalSurfaces.blog >= 50;
  const hasQA = context.externalSurfaces.kin >= 10;

  const actions: { rank: number; tag: string; title: string; why: string; how: string; impact: string; tone: "critical" | "warning" | "neutral" }[] = [];

  actions.push({
    rank: 1,
    tag: "권위 회수",
    title: "자체 도메인 + 콘텐츠 허브 구축",
    why: `검색 권위의 ${leakagePct}%가 naver.com에 적립되고 있어요. 자사 도메인 없이는 누적된 권위를 회수할 수 없어요.`,
    how: "Cafe24·Imweb·Shopify 등으로 자사몰을 두고, 블로그형 콘텐츠 허브에서 스토어로 트래픽을 흘려보내는 구조가 표준이에요.",
    impact: "Google·Bing 검색 노출 확보 + AI 봇 인용 가능 채널 확보",
    tone: "critical",
  });

  if (!hasReview) {
    actions.push({
      rank: 2,
      tag: "리뷰 신호",
      title: "블로그 리뷰 콘텐츠 시드 50건 확보",
      why: `브랜드 블로그 언급 ${context.externalSurfaces.blog.toLocaleString()}건 — AI 답변 엔진이 참고할 리뷰성 신호가 부족해요.`,
      how: "체험단·앰배서더·자체 운영 블로그로 리뷰 콘텐츠 50건을 우선 확보하세요. 질보다 다양성과 정형성이 핵심이에요.",
      impact: "AEO 리뷰 신호 점수 +15~25",
      tone: "warning",
    });
  } else if (!hasQA) {
    actions.push({
      rank: 2,
      tag: "Q&A 구조",
      title: "지식인·FAQ형 콘텐츠 보강",
      why: `지식인 Q&A 언급 ${context.externalSurfaces.kin.toLocaleString()}건 — 질문형 AI 답변에 채택될 채널이 약해요.`,
      how: "고객 자주 묻는 질문 10개를 추출해 자사 채널에 FAQ JSON-LD로 게시하고, 일부는 지식인에 답변자로 등록하세요.",
      impact: "AEO Q&A 구조 점수 +10~20",
      tone: "warning",
    });
  } else {
    actions.push({
      rank: 2,
      tag: "AI 인용 자산",
      title: "AI 인용 친화 가이드 콘텐츠 제작",
      why: `외부 언급 ${totalMentions.toLocaleString()}건은 충분 — 다만 AI가 인용할 정형화된 자사 콘텐츠가 부재해요.`,
      how: "제품 가이드·비교표·FAQ를 자사 도메인에 구조화 데이터(JSON-LD)와 함께 게시하세요. AutoBlog로 자동화 가능해요.",
      impact: "GEO 인용 가능성 점수 +15~25",
      tone: "neutral",
    });
  }

  actions.push({
    rank: 3,
    tag: "운영 자동화",
    title: "콘텐츠 발행 루프 자동화",
    why: "위 두 액션은 모두 '꾸준한 발행'이 전제 — 수동으로는 30편 이상 누적이 어려워요.",
    how: "AutoBlog로 자사 도메인에 블로그 허브를 두고 SEO/AEO/GEO 3축 최적화된 콘텐츠를 자동 발행하세요.",
    impact: "월 30편 발행 시 6개월 누적 180편 콘텐츠 자산",
    tone: "neutral",
  });

  const toneStyles = {
    critical: { ring: "ring-destructive/40", badge: "bg-destructive/10 text-destructive", num: "bg-destructive text-destructive-foreground" },
    warning: { ring: "ring-amber-500/40", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-500", num: "bg-amber-500 text-white" },
    neutral: { ring: "ring-border", badge: "bg-muted text-muted-foreground", num: "bg-foreground text-background" },
  } as const;

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-primary" strokeWidth={2.5} />
        <span className="text-[10px] font-bold tracking-wider uppercase text-primary">
          개선 우선순위
        </span>
      </div>
      <h3 className="text-base sm:text-lg font-extrabold text-foreground mb-1">
        지금 해야 할 일 — 우선순위 {actions.length}가지
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        진단 데이터를 기반으로 임팩트 순서대로 정리했어요.
      </p>

      <div className="space-y-3">
        {actions.map((a) => {
          const t = toneStyles[a.tone];
          return (
            <div
              key={a.rank}
              className={`rounded-xl bg-card border border-border/60 ring-1 ${t.ring} p-4`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full ${t.num} flex items-center justify-center text-xs font-extrabold flex-shrink-0`}>
                  {a.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${t.badge}`}>
                      {a.tag}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-2">{a.title}</h4>
                  <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                    <p>
                      <span className="font-semibold text-foreground">왜:</span> {a.why}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">어떻게:</span> {a.how}
                    </p>
                    <p className="inline-flex items-center gap-1 text-primary font-semibold">
                      <Sparkles className="w-3 h-3" />
                      예상 효과: {a.impact}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground text-center">
        세부 실행 가이드는 하단 무료 진단 리포트에서 받아보실 수 있어요
        <ArrowRight className="inline w-3 h-3 ml-1" />
      </p>
    </div>
  );
}
