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

  // 도넛 (권위 누수율) — 100%일 때 끝점 겹침 방지를 위해 cap=butt, 살짝 얇게
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const isFull = leakagePct >= 100;
  const offset = isFull ? 0 : circumference - (leakagePct / 100) * circumference;

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
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────
          L0: 식별 바 (얇은 메타) — 카드 아님, 단순 정보 띠
          ───────────────────────────────────────────── */}
      <div className="rounded-xl bg-muted/30 border border-border/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Store className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
            <span className="font-semibold text-foreground">
              {context.type === "brand" ? "브랜드스토어" : "스마트스토어"}
            </span>
          </div>
          <span className="h-3 w-px bg-border" />
          <div className="text-muted-foreground">
            인식한 브랜드 키워드 <span className="font-mono font-semibold text-foreground ml-1">{context.slug}</span>
          </div>
          <div className="flex-1" />
          <a
            href={`https://search.naver.com/search.naver?query=${encodeURIComponent(context.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <Search className="w-3 h-3" />
            네이버에서 확인
          </a>
          <a
            href={context.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            스토어 열기
          </a>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          L1 HERO: 가장 강한 인사이트 — 권위 누수
          ───────────────────────────────────────────── */}
      <section>
        <div className="rounded-2xl border-2 border-destructive/20 bg-gradient-to-br from-destructive/[0.04] to-transparent p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-block w-1 h-4 bg-destructive rounded-full" />
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-destructive">
              핵심 진단 · Critical
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
            {/* Donut — sized down, baseline aligned with headline */}
            <div className="relative flex-shrink-0 mx-auto sm:mx-0 w-[128px] h-[128px] sm:w-[140px] sm:h-[140px] sm:mt-1">
              <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                <circle
                  cx="64" cy="64" r={radius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                />
                <circle
                  cx="64" cy="64" r={radius}
                  fill="none"
                  stroke="hsl(var(--destructive))"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap={isFull ? "butt" : "round"}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[2rem] sm:text-[2.25rem] font-extrabold text-destructive leading-none tracking-tight tabular-nums">
                  {leakagePct}
                  <span className="text-base sm:text-lg align-top ml-0.5 font-bold">%</span>
                </span>
                <span className="text-[9px] text-muted-foreground mt-2 font-semibold uppercase tracking-[0.12em]">
                  권위 누수
                </span>
              </div>
            </div>

            {/* Headline + body */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h3 className="text-lg sm:text-2xl font-bold text-foreground mb-3 leading-snug tracking-tight">
                검색 권위의 <span className="text-destructive tabular-nums">{leakagePct}%</span>가{" "}
                <span className="whitespace-nowrap">naver.com</span>에 적립돼요
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                브랜드명 검색 시 자사 스토어 노출 비율은{" "}
                <span className="font-semibold text-foreground tabular-nums">{ownPct}%</span> 뿐.
                자체 도메인이 없어 모든 권위가 naver.com으로 귀속돼요.
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
      </section>

      {/* ─────────────────────────────────────────────
          L2 SUPPORT + L1 ACTION: 토글로 접기 (기본 접힘)
          ───────────────────────────────────────────── */}
      <DetailsToggleSection
        leftLabel="자세한 진단 데이터 + 액션 플랜 보기"
        rightLabel={`보조 지표 2 · 액션 ${3}`}
      >
        <section>
        <div className="flex items-baseline justify-between px-1 mb-2.5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            보조 진단 데이터
          </h2>
          <span className="text-[10px] text-muted-foreground/70">2 metrics</span>
        </div>

        <div className="space-y-3">
          {/* 외부 채널 점유율 바 */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">외부 채널별 브랜드 언급량</h4>
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
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
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

          {/* 하드 블로커 — 더 가벼운 인라인 스트립 */}
          <div className="rounded-xl border-l-2 border-l-destructive/50 border-y border-r border-border/60 bg-muted/20 px-4 py-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive/70" strokeWidth={2.5} />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                구조적 한계 · 점수 상한 적용
              </span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li className="flex gap-2">
                <span className="mt-[7px] w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                <span><span className="font-medium text-foreground/90">자체 도메인 부재</span> — Google·Bing 노출 거의 없음</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                <span><span className="font-medium text-foreground/90">robots.txt 차단</span> — ChatGPT·Claude 등 AI 봇 접근 불가</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                <span><span className="font-medium text-foreground/90">템플릿 고정</span> — 메타·구조화 데이터 통제 불가</span>
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
      </section>

      {/* ─────────────────────────────────────────────
          L1 ACTION: 액션 플랜 — Primary 강조
          ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between px-1 mb-2.5">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
            What to do next
          </h2>
          <span className="text-[10px] text-muted-foreground/70">우선순위 액션</span>
        </div>
        <ActionPlan context={context} />
      </section>
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
    critical: { num: "bg-destructive text-destructive-foreground", accent: "text-destructive" },
    warning: { num: "bg-amber-500 text-white", accent: "text-amber-600 dark:text-amber-500" },
    neutral: { num: "bg-foreground text-background", accent: "text-muted-foreground" },
  } as const;

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="inline-block w-1 h-4 bg-primary rounded-full" />
        <Target className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary">
          개선 우선순위 {actions.length}가지
        </span>
      </div>

      <ol className="space-y-4">
        {actions.map((a, idx) => {
          const t = toneStyles[a.tone];
          return (
            <li key={a.rank} className={idx > 0 ? "pt-4 border-t border-border/60" : ""}>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full ${t.num} flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5`}>
                  {a.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.accent}`}>
                      {a.tag}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 leading-snug">{a.title}</h4>
                  <dl className="space-y-1 text-xs text-muted-foreground leading-relaxed">
                    <div className="flex gap-2">
                      <dt className="font-medium text-foreground/80 flex-shrink-0 w-7">왜</dt>
                      <dd>{a.why}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium text-foreground/80 flex-shrink-0 w-7">방법</dt>
                      <dd>{a.how}</dd>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <dt className="font-medium text-foreground/80 flex-shrink-0 w-7">효과</dt>
                      <dd className="text-foreground font-medium inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        {a.impact}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 pt-4 border-t border-border/60 text-[11px] text-muted-foreground text-center">
        세부 실행 가이드는 하단 무료 진단 리포트에서 받아보실 수 있어요
        <ArrowRight className="inline w-3 h-3 ml-1" />
      </p>
    </div>
  );
}
