import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Zap, Loader2, Search } from "lucide-react";

import Navbar from "@/components/Navbar";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import SubpageWarning from "@/components/SubpageWarning";
import NaverStoreDetectedBanner from "@/components/NaverStoreDetectedBanner";
import RateLimitBanner from "@/components/RateLimitBanner";
import { parseNaverStoreUrl } from "@/lib/naverStore";
import FaqSection, { faqs } from "@/components/FaqSection";
import AutoPublishTeaser from "@/components/AutoPublishTeaser";
import NaverStoreTeaser from "@/components/NaverStoreTeaser";


import { WebSiteJsonLd, FAQPageJsonLd } from "@/components/JsonLd";
import { type DemoResult } from "@/data/demoResults";
import type { ExtendedDemoResult } from "@/lib/analyze";
import { type PsiResult, type PsiError } from "@/lib/psi";
import { trackEvent } from "@/lib/analytics";
import { validateUrl } from "@/lib/urlValidation";
import { type RateLimitStatus } from "@/lib/rateLimit";
import type { AnalysisPhase } from "@/components/LoadingScreen";
import type { IndexingResult } from "@/lib/checkIndexing";

// Lazy-load heavy components only needed for loading/result screens
const ScoreDashboard = lazy(() => import("@/components/ScoreDashboard"));
const LoadingScreen = lazy(() => import("@/components/LoadingScreen"));
const LighthouseScores = lazy(() => import("@/components/LighthouseScores"));
const ResultHeader = lazy(() => import("@/components/ResultHeader"));
const VerificationLinks = lazy(() => import("@/components/VerificationLinks"));
const EmailForm = lazy(() => import("@/components/EmailForm"));
const FunnelCTAs = lazy(() => import("@/components/FunnelCTAs"));
const PsiErrorBanner = lazy(() => import("@/components/PsiErrorBanner"));
const ScoreComparison = lazy(() => import("@/components/ScoreComparison"));
const IndexingStatus = lazy(() => import("@/components/IndexingStatus"));
const NaverStoreInsights = lazy(() => import("@/components/NaverStoreInsights"));


type Screen = "home" | "loading" | "result";

/**
 * Map an unknown error to a user-friendly Korean message.
 * Keeps copy aligned with mem://ux/error-handling — explain cause + next step.
 */
const formatAnalyzeError = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const lower = raw.toLowerCase();

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "분석 시간이 초과됐어요. 사이트 응답이 느릴 수 있어요. 잠시 후 다시 시도해 주세요.";
  }
  if (lower.includes("robots") || lower.includes("blocked") || lower.includes("forbidden")) {
    return "이 사이트가 크롤러 접근을 차단하고 있어요. robots.txt 설정을 확인해 주세요.";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch")) {
    return "네트워크 오류로 분석에 실패했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.";
  }
  if (lower.includes("not found") || lower.includes("404")) {
    return "해당 URL을 찾을 수 없어요. 주소를 다시 확인해 주세요.";
  }
  if (raw) return `분석에 실패했어요: ${raw}`;
  return "분석 중 알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
};

// 예시 URL chip — 클릭 시 자동 입력 (다양성: 글로벌/한국/네이버 스토어/도메인 우세 브랜드)
const EXAMPLE_URLS: { label: string; url: string }[] = [
  { label: "토스", url: "toss.im" },
  { label: "무신사", url: "musinsa.com" },
  { label: "네이버 스토어", url: "brand.naver.com/lge" },
  { label: "올리브영", url: "oliveyoung.co.kr" },
];

// placeholder 로테이션 후보 — 사용자 시선을 끌 수 있는 다양한 형식 예시
const PLACEHOLDER_ROTATION = [
  "https://your-brand.com",
  "musinsa.com",
  "brand.naver.com/lge",
  "https://oliveyoung.co.kr",
];

const Index = () => {

  const [screen, setScreen] = useState<Screen>("home");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState("");
  const [result, setResult] = useState<ExtendedDemoResult | null>(null);

  // Hero 입력창 placeholder 로테이션 (3.5초 간격, 빈 입력일 때만)
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    if (url) return;
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_ROTATION.length);
    }, 3500);
    return () => clearInterval(id);
  }, [url]);
  const rotatingPlaceholder = PLACEHOLDER_ROTATION[placeholderIdx];

  const [psiMobile, setPsiMobile] = useState<PsiResult | null>(null);
  const [psiDesktop, setPsiDesktop] = useState<PsiResult | null>(null);
  const [psiError, setPsiError] = useState<PsiError | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Skip Lighthouse toggle
  const [skipLighthouse, setSkipLighthouse] = useState(false);
  const [psiLazyLoading, setPsiLazyLoading] = useState(false);
  const [psiRetryError, setPsiRetryError] = useState<string | null>(null);
  const [lighthouseSkipped, setLighthouseSkipped] = useState(false);

  // Subpage warning state
  const [subpageWarning, setSubpageWarning] = useState<{ inputUrl: string; rootUrl: string } | null>(null);

  // Loading phases
  const [completedPhases, setCompletedPhases] = useState<Set<AnalysisPhase>>(new Set());

  // Rate limit state
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [indexingResult, setIndexingResult] = useState<IndexingResult | null>(null);
  const [indexingLoading, setIndexingLoading] = useState(false);
  const isAdmin = sessionStorage.getItem("admin_pw") !== null;

  // requestId guard — only the most recent runAnalysis call may write to state.
  // This prevents a stale (older) request from overwriting a newer result.
  const requestIdRef = useRef(0);
  // Synchronous re-entry lock. setIsAnalyzing(true) is async (state update),
  // so rapid clicks/Enter presses can slip past it. A ref flips immediately.
  const analyzingRef = useRef(false);

  // /naver-store 등에서 redirect로 들어올 때 ?url=...&autorun=1 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingUrl = params.get("url");
    const autorun = params.get("autorun");
    if (incomingUrl && autorun === "1" && !analyzingRef.current) {
      setUrl(incomingUrl);
      // url state 반영 후 다음 tick에 분석 실행
      setTimeout(() => {
        runAnalysis(incomingUrl);
        // URL 쿼리스트링 정리 (back 버튼 영향 방지)
        window.history.replaceState({}, "", "/");
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = async (finalUrl: string) => {
    // Synchronous guard — blocks duplicate entry in the same tick.
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    setIsAnalyzing(true);

    // Bump requestId for this run; capture locally for stale-check.
    const myRequestId = ++requestIdRef.current;
    const isLatest = () => requestIdRef.current === myRequestId;

    try {
      // Dynamic imports for heavy analysis modules
      const [{ incrementUsage }, { fetchPsi }, { analyzeSite }, { isNaverStoreUrl }] = await Promise.all([
        import("@/lib/rateLimit"),
        import("@/lib/psi"),
        import("@/lib/analyze"),
        import("@/lib/naverStore"),
      ]);

      // 네이버 스토어 URL은 PSI 측정이 의미 없음(스토어 자체가 네이버 인프라).
      // PSI를 강제로 스킵해서 측정 시간을 단축하고 Lighthouse UI가 안 뜨도록 함.
      const isStoreUrl = isNaverStoreUrl(finalUrl);
      const effectiveSkipLighthouse = skipLighthouse || isStoreUrl;

      if (!isAdmin) {
        const usage = await incrementUsage();
        if (!usage.allowed) {
          if (isLatest()) setRateLimit(usage);
          return;
        }
        if (isLatest()) setRateLimit(usage);
      }

      if (!isLatest()) return;

      setNormalizedUrl(finalUrl);
      setScreen("loading");
      setResult(null);
      setPsiMobile(null);
      setPsiDesktop(null);
      setPsiError(null);
      setAnalyzeError(null);
      setPsiRetryError(null);
      setCompletedPhases(new Set());
      setLighthouseSkipped(effectiveSkipLighthouse);
      setIndexingResult(null);
      setIndexingLoading(true);
      trackEvent("analysis_start", { skipLighthouse: effectiveSkipLighthouse, isNaverStore: isStoreUrl }, finalUrl);

      const addPhase = (phase: AnalysisPhase) => {
        if (!isLatest()) return;
        setCompletedPhases((prev) => new Set([...prev, phase]));
      };

      // Run PSI and Firecrawl+AI analysis in parallel
      const psiPromise = effectiveSkipLighthouse
        ? Promise.resolve([{ data: null, error: undefined }, { data: null, error: undefined }] as const)
        : Promise.all([
            fetchPsi(finalUrl, "mobile"),
            fetchPsi(finalUrl, "desktop"),
          ]).then((res) => {
            addPhase("psi-measuring");
            return res;
          });

      // 네이버 스토어 전용: querystring의 ownDomain을 함께 전달
      const ownDomainParam = isStoreUrl
        ? new URLSearchParams(window.location.search).get("ownDomain") ?? undefined
        : undefined;
      const analyzePromise = analyzeSite(finalUrl, ownDomainParam ? { ownDomain: ownDomainParam } : undefined).then((res) => {
        addPhase("crawling");
        addPhase("ai-analyzing");
        return res;
      });

      // Check indexing status in parallel (fire-and-forget, but guarded by requestId).
      // Check indexing status in parallel (fire-and-forget). 네이버 스토어는 검색엔진 인덱싱 자체가 차단돼 있어 의미 없음 → 스킵.
      if (isStoreUrl) {
        setIndexingLoading(false);
      } else {
        import("@/lib/checkIndexing")
          .then(({ checkIndexing }) =>
            checkIndexing(finalUrl)
              .then((r) => {
                if (!isLatest()) return; // stale — newer request superseded us
                setIndexingResult(r);
                setIndexingLoading(false);
              })
              .catch(() => {
                if (!isLatest()) return;
                setIndexingLoading(false);
              }),
          )
          .catch(() => {
            if (!isLatest()) return;
            setIndexingLoading(false);
          });
      }

      const [psiResults, analyzeRes] = await Promise.all([psiPromise, analyzePromise]);

      // Stale check before applying any results.
      if (!isLatest()) return;

      const [mobileRes, desktopRes] = psiResults;

      if (mobileRes.data) setPsiMobile(mobileRes.data);
      if (desktopRes.data) setPsiDesktop(desktopRes.data);

      if (mobileRes.data || desktopRes.data) {
        trackEvent("analysis_complete", { url: finalUrl });
      } else {
        const err = mobileRes.error || desktopRes.error;
        if (err) {
          setPsiError(err);
          trackEvent("analysis_fail", { url: finalUrl, error: err.type });
        }
      }

      if (analyzeRes.data) {
        setResult(analyzeRes.data);
        // Save to history (fire-and-forget)
        import("@/components/ScoreComparison").then(({ saveAnalysisHistory }) => {
          saveAnalysisHistory(finalUrl, analyzeRes.data!);
        });
      } else {
        // Preserve raw debugging info in console while showing a friendly message to the user.
        console.warn("[runAnalysis] analyze failed:", analyzeRes.error);
        setAnalyzeError(formatAnalyzeError(analyzeRes.error?.message));
        trackEvent("analyze_fail", { url: finalUrl, error: analyzeRes.error?.message });
      }

      setScreen("result");

      if (analyzeRes.data) {
        import("canvas-confetti").then(({ default: confetti }) => {
          const end = Date.now() + 800;
          const colors = ["#6366f1", "#8b5cf6", "#a78bfa", "#34d399", "#fbbf24"];
          const frame = () => {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
            if (Date.now() < end) requestAnimationFrame(frame);
          };
          frame();
        });
      }
    } catch (err) {
      // Catch any throw from dynamic imports / fetchPsi / analyzeSite / Promise.all.
      // Make sure the user is never stranded on the loading screen.
      console.error("[runAnalysis] unexpected error:", err);
      if (isLatest()) {
        setAnalyzeError(formatAnalyzeError(err));
        setScreen("result");
        trackEvent("analyze_fail", { url: finalUrl, error: (err as Error)?.message ?? "unknown" });
      }
    } finally {
      // Always release the synchronous re-entry lock.
      analyzingRef.current = false;
      // Only the latest request may flip the visible analyzing state back off.
      if (isLatest()) setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    setUrlError("");
    setSubpageWarning(null);

    const validation = validateUrl(url);

    if (!validation.isValid) {
      setUrlError(validation.errorMessage || "URL 형식을 확인해 주세요. 예: https://example.com");
      return;
    }

    // Check rate limit before proceeding (skip for admin)
    if (!isAdmin) {
      const { checkRateLimit } = await import("@/lib/rateLimit");
      const usage = await checkRateLimit();
      if (!usage.allowed) {
        setRateLimit(usage);
        return;
      }
    }

    // 네이버 스토어는 슬러그 자체가 스토어 루트라 상/하위 페이지 분기 무의미 → 바로 분석
    const isStore = !!parseNaverStoreUrl(validation.finalUrl);

    if (validation.isSubpage && !isStore) {
      setSubpageWarning({ inputUrl: validation.finalUrl, rootUrl: validation.rootUrl });
      return;
    }

    runAnalysis(validation.finalUrl);
  };

  const handleRetryPsi = async () => {
    if (!normalizedUrl || psiLazyLoading) return;

    // Capture the URL + requestId at click time so a concurrent new analysis
    // (different URL or new run) can't be overwritten by this retry's response.
    const retryUrl = normalizedUrl;
    const myRequestId = requestIdRef.current;
    const isStillRelevant = () =>
      requestIdRef.current === myRequestId && normalizedUrl === retryUrl;

    setPsiError(null);
    setPsiRetryError(null);
    setPsiLazyLoading(true);

    try {
      const { fetchPsi } = await import("@/lib/psi");
      const [mobileRes, desktopRes] = await Promise.all([
        fetchPsi(retryUrl, "mobile"),
        fetchPsi(retryUrl, "desktop"),
      ]);

      if (!isStillRelevant()) return;

      const gotData = Boolean(mobileRes.data || desktopRes.data);

      if (mobileRes.data) setPsiMobile(mobileRes.data);
      if (desktopRes.data) setPsiDesktop(desktopRes.data);

      if (gotData) {
        // Only flip the "skipped" flag when we actually have fresh data,
        // so the retry button stays available on failure.
        setLighthouseSkipped(false);
      } else {
        const err = mobileRes.error || desktopRes.error;
        if (err) setPsiError(err);
        setPsiRetryError("Lighthouse 측정에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
    } catch (err) {
      console.error("[handleRetryPsi] error:", err);
      if (isStillRelevant()) {
        setPsiRetryError("Lighthouse 측정 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      if (isStillRelevant()) setPsiLazyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <WebSiteJsonLd />
      <FAQPageJsonLd faqs={faqs} />
      <Navbar />

      {screen === "home" && (
        <main className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="max-w-2xl w-full text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/8 text-accent text-sm font-semibold mb-8">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              무료 베타 서비스
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl text-foreground leading-[1.15] sm:leading-[1.1] mb-6 tracking-tight">
              <span className="block font-light text-muted-foreground text-2xl sm:text-3xl md:text-4xl mb-3">
                내 사이트,
              </span>
              <span className="block font-extrabold">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  검색엔진과 AI
                </span>
                <span>가</span>
              </span>
              <span className="block font-extrabold mt-1">
                제대로 이해<span className="font-light text-muted-foreground">하고 있을까?</span>
              </span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-14 sm:mb-16 leading-relaxed">
              URL만 입력하면 SEO 기본 상태와 AI 검색 준비도를<br className="hidden sm:block" /> 빠르게 확인할 수 있어요.
            </p>
            <div className="relative max-w-xl mx-auto group">
              {/* Soft glow halo — focus 시 강화 */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 sm:-inset-8 -z-10 opacity-60 group-focus-within:opacity-100 transition-opacity duration-500"
              >
                <div className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-primary/30 blur-3xl group-focus-within:bg-primary/50 transition-colors duration-500" />
                <div className="absolute right-1/4 top-1/2 translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-accent/25 blur-3xl group-focus-within:bg-accent/40 transition-colors duration-500" />
              </div>

              <div className="relative flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="relative w-full sm:flex-1">
                  <Search
                    className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none transition-colors group-focus-within:text-primary"
                    strokeWidth={2.5}
                  />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder={url ? "" : rotatingPlaceholder}
                    className="w-full h-16 sm:h-14 pl-12 sm:pl-13 pr-4 sm:pr-5 rounded-2xl border border-input bg-card/80 backdrop-blur text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-base sm:text-lg shadow-sm focus:shadow-lg transition-all"
                    style={{ paddingLeft: "3rem" }}
                  />
                </div>
                <button
                  onClick={handleAnalyze}
                  className="h-16 sm:h-14 px-6 sm:px-8 rounded-2xl gradient-primary text-primary-foreground font-bold text-base sm:text-lg whitespace-nowrap shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:brightness-105 active:scale-[0.97] active:shadow-sm active:brightness-95 transition-all duration-150 ease-out will-change-transform select-none"
                >
                  무료로 분석하기
                </button>
              </div>
              {!url && (
                <div className="relative flex flex-wrap items-center justify-center gap-1.5 mt-3.5 animate-fade-in">
                  <span className="text-[11px] text-muted-foreground/70 mr-0.5">예시</span>
                  {EXAMPLE_URLS.map((ex) => (
                    <button
                      key={ex.url}
                      type="button"
                      onClick={() => { setUrl(ex.url); setUrlError(""); }}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-border/70 bg-card hover:bg-muted hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(() => {
              const trimmed = url.trim();
              const storeInfoForCheckbox = trimmed
                ? parseNaverStoreUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
                : null;
              const forced = !!storeInfoForCheckbox;
              const effectiveChecked = forced || skipLighthouse;
              return (
                <>
                  <label
                    className={`flex items-center gap-2 justify-center mt-3 select-none group ${
                      forced ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                    }`}
                    title={forced ? "네이버 스토어는 Lighthouse 측정이 의미 없어 자동으로 건너뜁니다" : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={effectiveChecked}
                      disabled={forced}
                      onChange={(e) => setSkipLighthouse(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-muted-foreground/30 peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center transition-colors">
                      {effectiveChecked && <Zap className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      ⚡ 빠른 분석 <span className="text-muted-foreground/60">(Lighthouse 건너뛰기)</span>
                      {forced && <span className="ml-1 text-primary font-medium">· 네이버 자동 적용</span>}
                    </span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-2 font-medium">
                    {forced
                      ? "네이버 스토어 전용 진단 · 약 10초"
                      : effectiveChecked
                      ? "AI 분석만 실행 · 30초 이내"
                      : "모바일 + 데스크톱 동시 측정 · 평균 10~30초"}
                  </p>
                </>
              );
            })()}
            {urlError && (
              <p className="mt-3 text-sm text-destructive font-medium">{urlError}</p>
            )}
            {!subpageWarning && !urlError && url.trim() && (() => {
              const storeInfo = parseNaverStoreUrl(
                /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
              );
              return storeInfo ? (
                <div className="mt-8 sm:mt-10">
                  <NaverStoreDetectedBanner info={storeInfo} />
                </div>
              ) : null;
            })()}
            {subpageWarning && (
              <div className="mt-8 sm:mt-10">
                <SubpageWarning
                  inputUrl={subpageWarning.inputUrl}
                  rootUrl={subpageWarning.rootUrl}
                  onAnalyzeRoot={() => {
                    setSubpageWarning(null);
                    runAnalysis(subpageWarning.rootUrl);
                  }}
                  onAnalyzeCurrent={() => {
                    setSubpageWarning(null);
                    runAnalysis(subpageWarning.inputUrl);
                  }}
                />
              </div>
            )}
            {rateLimit && !rateLimit.allowed && (
              <div className="mt-8 sm:mt-10">
                <RateLimitBanner
                  remaining={rateLimit.remaining}
                  emailUnlocked={rateLimit.emailUnlocked}
                  onUnlocked={async () => {
                    const { checkRateLimit } = await import("@/lib/rateLimit");
                    const updated = await checkRateLimit();
                    setRateLimit(updated);
                  }}
                />
              </div>
            )}
            <div className="mt-10 sm:mt-12">
              <NaverStoreTeaser />
            </div>
            <div className="mt-6 sm:mt-8">
              <AutoPublishTeaser />
            </div>
            <section className="mt-10 max-w-2xl mx-auto text-left">
              <h2 className="text-center mb-3 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                FAQ
              </h2>
              <FaqSection compact />
            </section>
          </div>
          <StickyBottomCTA />
        </main>
      )}



      <Suspense fallback={null}>
        {screen === "loading" && (
          <>
            <LoadingScreen completedPhases={completedPhases} skipLighthouse={lighthouseSkipped} />
            <StickyBottomCTA />
          </>
        )}

        {screen === "result" && (
          <main className="flex-1 py-8 sm:py-12 px-2 sm:px-4 pb-24">
            <div className="max-w-4xl mx-auto space-y-5">
              <ResultHeader
                psi={psiMobile || psiDesktop}
                psiError={psiError}
                url={normalizedUrl}
                result={result ?? undefined}
              />

              {psiError && !result?.storeContext && <PsiErrorBanner error={psiError} onRetry={handleRetryPsi} />}

              {result?.storeContext ? (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    네이버 스토어는 페이지 구조를 직접 수정할 수 없어요. Lighthouse(성능·접근성) 측정은 생략됐어요 — 아래 <span className="font-semibold text-foreground">스토어 전용 진단</span>을 확인해 주세요.
                  </p>
                </div>
              ) : (
                (psiMobile || psiDesktop) && <LighthouseScores mobile={psiMobile} desktop={psiDesktop} />
              )}
              {!result?.storeContext && lighthouseSkipped && !psiMobile && !psiDesktop && !psiError && (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleRetryPsi}
                    disabled={psiLazyLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-muted/50 transition-colors disabled:opacity-60"
                  >
                    {psiLazyLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Lighthouse 측정 중…
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Lighthouse 성능도 측정하기
                      </>
                    )}
                  </button>
                  {psiRetryError && (
                    <p className="text-xs text-destructive font-medium">{psiRetryError}</p>
                  )}
                </div>
              )}

              {analyzeError && (
                <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 text-center">
                  <p className="text-sm text-destructive font-medium">{analyzeError}</p>
                  <button
                    onClick={() => normalizedUrl && runAnalysis(normalizedUrl)}
                    className="mt-2 text-xs text-primary font-semibold hover:underline"
                  >
                    다시 분석하기
                  </button>
                </div>
              )}

              {/* 스토어 전용 인사이트: 권위 누수 도넛 + 외부 채널 점유율 + 하드 블로커 */}
              {result?.storeContext && (
                <NaverStoreInsights context={result.storeContext} />
              )}

              {result && (
                <ScoreDashboard
                  result={result}
                  url={normalizedUrl}
                  disabledMode={!!result.storeContext}
                  disabledReason={result.storeContext ? "네이버 스토어는 일반 사이트 기준의 SEO·AEO·GEO 점수가 적용되지 않아요. 위 스토어 전용 진단 근거를 참고해 주세요." : undefined}
                />
              )}

              {/* 일반 사이트 전용 섹션: 스토어 결과일 땐 의미 없으므로 숨김 */}
              {result && !result.storeContext && (
                <ScoreComparison url={normalizedUrl} currentResult={result} />
              )}

              {!result?.storeContext && (
                <IndexingStatus result={indexingResult} loading={indexingLoading} url={normalizedUrl} />
              )}

              {!result?.storeContext && <VerificationLinks url={normalizedUrl} />}

              <FunnelCTAs result={result} url={normalizedUrl} />

              <EmailForm onSubmitted={() => {}} />

              {/* 후속 퍼널: 분석 후 자연스러운 다음 단계로 AutoBlog 제안 */}
              <AutoPublishTeaser />

              <FaqSection expanded />
              <div className="h-24" />
            </div>

            <StickyBottomCTA />
          </main>
        )}
      </Suspense>
    </div>
  );
};

export default Index;
