import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import Navbar from "@/components/Navbar";
import ScoreDashboard from "@/components/ScoreDashboard";
import LoadingScreen, { type AnalysisPhase } from "@/components/LoadingScreen";
import LighthouseScores from "@/components/LighthouseScores";
import ResultHeader from "@/components/ResultHeader";
import VerificationLinks from "@/components/VerificationLinks";
import EmailForm from "@/components/EmailForm";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import PsiErrorBanner from "@/components/PsiErrorBanner";
import SubpageWarning from "@/components/SubpageWarning";
import RateLimitBanner from "@/components/RateLimitBanner";
import FaqSection, { faqs } from "@/components/FaqSection";
import { WebSiteJsonLd, FAQPageJsonLd } from "@/components/JsonLd";
import { type DemoResult } from "@/data/demoResults";
import { fetchPsi, type PsiResult, type PsiError } from "@/lib/psi";
import { analyzeSite } from "@/lib/analyze";
import { trackEvent } from "@/lib/analytics";
import { validateUrl } from "@/lib/urlValidation";
import { checkRateLimit, incrementUsage, type RateLimitStatus } from "@/lib/rateLimit";

type Screen = "home" | "loading" | "result";

const Index = () => {
  
  const [screen, setScreen] = useState<Screen>("home");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState("");
  const [result, setResult] = useState<DemoResult | null>(null);
  
  const [psiMobile, setPsiMobile] = useState<PsiResult | null>(null);
  const [psiDesktop, setPsiDesktop] = useState<PsiResult | null>(null);
  const [psiError, setPsiError] = useState<PsiError | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Skip Lighthouse toggle
  const [skipLighthouse, setSkipLighthouse] = useState(false);
  const [psiLazyLoading, setPsiLazyLoading] = useState(false);
  const [lighthouseSkipped, setLighthouseSkipped] = useState(false);

  // Subpage warning state
  const [subpageWarning, setSubpageWarning] = useState<{ inputUrl: string; rootUrl: string } | null>(null);

  // Loading phases
  const [completedPhases, setCompletedPhases] = useState<Set<AnalysisPhase>>(new Set());

  // Rate limit state
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAdmin = sessionStorage.getItem("admin_pw") !== null;

  const runAnalysis = async (finalUrl: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    if (!isAdmin) {
      // Increment usage before running (skip for admin)
      const usage = await incrementUsage();
      if (!usage.allowed) {
        setRateLimit(usage);
        setIsAnalyzing(false);
        return;
      }
      setRateLimit(usage);
    }

    setNormalizedUrl(finalUrl);
    setScreen("loading");
    setPsiMobile(null);
    setPsiDesktop(null);
    setPsiError(null);
    setAnalyzeError(null);
    setCompletedPhases(new Set());
    setLighthouseSkipped(skipLighthouse);
    trackEvent("analysis_start", { skipLighthouse }, finalUrl);

    const addPhase = (phase: AnalysisPhase) =>
      setCompletedPhases((prev) => new Set([...prev, phase]));

    // Run PSI and Firecrawl+AI analysis in parallel
    const psiPromise = skipLighthouse
      ? Promise.resolve([{ data: null, error: undefined }, { data: null, error: undefined }] as const)
      : Promise.all([
          fetchPsi(finalUrl, 'mobile'),
          fetchPsi(finalUrl, 'desktop'),
        ]).then((res) => {
          addPhase("psi-measuring");
          return res;
        });

    const analyzePromise = analyzeSite(finalUrl).then((res) => {
      addPhase("crawling");
      addPhase("ai-analyzing");
      return res;
    });

    const [psiResults, analyzeRes] = await Promise.all([psiPromise, analyzePromise]);
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
    } else {
      setAnalyzeError(analyzeRes.error?.message || "분석에 실패했어요.");
      trackEvent("analyze_fail", { url: finalUrl, error: analyzeRes.error?.message });
    }

    setScreen("result");

    if (analyzeRes.data) {
      const end = Date.now() + 800;
      const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#34d399', '#fbbf24'];
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
    setIsAnalyzing(false);
  };

  const handleAnalyze = async () => {
    setUrlError("");
    setSubpageWarning(null);

    const validation = validateUrl(url);

    if (!validation.isValid) {
      setUrlError(validation.errorMessage || "URL을 확인해 주세요.");
      return;
    }

    // Check rate limit before proceeding (skip for admin)
    if (!isAdmin) {
      const usage = await checkRateLimit();
      if (!usage.allowed) {
        setRateLimit(usage);
        return;
      }
    }

    if (validation.isSubpage) {
      setSubpageWarning({ inputUrl: validation.finalUrl, rootUrl: validation.rootUrl });
      return;
    }

    runAnalysis(validation.finalUrl);
  };

  const handleRetryPsi = () => {
    if (normalizedUrl) {
      setPsiError(null);
      setPsiLazyLoading(true);
      Promise.all([
        fetchPsi(normalizedUrl, 'mobile'),
        fetchPsi(normalizedUrl, 'desktop'),
      ]).then(([mobileRes, desktopRes]) => {
        if (mobileRes.data) setPsiMobile(mobileRes.data);
        if (desktopRes.data) setPsiDesktop(desktopRes.data);
        const err = mobileRes.error || desktopRes.error;
        if (err && !mobileRes.data && !desktopRes.data) setPsiError(err);
        setPsiLazyLoading(false);
        setLighthouseSkipped(false);
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl text-foreground leading-snug sm:leading-[1.45] mb-6 tracking-tight">
              <span className="font-light">내 사이트,</span><br className="hidden sm:block" />
              <span className="font-extrabold">검색엔진과 AI</span>가<br />
              <span className="font-extrabold">제대로 이해</span><span className="font-light">하고 있을까?</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-10 leading-relaxed">
              URL만 입력하면 SEO 기본 상태와 AI 검색 준비도를<br className="hidden sm:block" /> 빠르게 확인할 수 있어요.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-lg mx-auto">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="https://example.com"
                className="w-full sm:flex-1 h-14 sm:h-12 px-4 sm:px-5 rounded-xl sm:rounded-2xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-base sm:text-base transition-all"
              />
              <button
                onClick={handleAnalyze}
                className="h-14 sm:h-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl gradient-primary text-primary-foreground font-semibold text-base sm:text-base hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                무료로 분석하기
              </button>
            </div>
            <label className="flex items-center gap-2 justify-center mt-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={skipLighthouse}
                onChange={(e) => setSkipLighthouse(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-4 h-4 rounded border border-muted-foreground/30 peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center transition-colors">
                {skipLighthouse && <Zap className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                ⚡ 빠른 분석 <span className="text-muted-foreground/60">(Lighthouse 건너뛰기)</span>
              </span>
            </label>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {skipLighthouse ? "AI 분석만 실행 · 약 10초 완료" : "모바일 + 데스크톱 동시 측정 · 약 30초 소요"}
            </p>
            {urlError && (
              <p className="mt-3 text-sm text-destructive font-medium">{urlError}</p>
            )}
            {subpageWarning && (
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
            )}
            {rateLimit && !rateLimit.allowed && (
              <RateLimitBanner
                remaining={rateLimit.remaining}
                emailUnlocked={rateLimit.emailUnlocked}
                onUnlocked={async () => {
                  const updated = await checkRateLimit();
                  setRateLimit(updated);
                }}
              />
            )}
            <div className="mt-14 max-w-lg mx-auto text-left">
              <FaqSection compact />
            </div>
          </div>
          <StickyBottomCTA />
        </main>
      )}

      {screen === "loading" && (
        <>
          <LoadingScreen completedPhases={completedPhases} skipLighthouse={lighthouseSkipped} />
          <StickyBottomCTA />
        </>
      )}

      {screen === "result" && (
        <main className="flex-1 py-8 sm:py-12 px-2 sm:px-4 pb-24">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Result header: URL, time, badge */}
            <ResultHeader
              psi={psiMobile || psiDesktop}
              psiError={psiError}
              url={normalizedUrl}
            />

            {/* PSI Error */}
            {psiError && <PsiErrorBanner error={psiError} onRetry={handleRetryPsi} />}

            {/* Lighthouse real scores or lazy load button */}
            {(psiMobile || psiDesktop) && <LighthouseScores mobile={psiMobile} desktop={psiDesktop} />}
            {lighthouseSkipped && !psiMobile && !psiDesktop && !psiError && (
              <div className="flex justify-center">
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
              </div>
            )}

            {/* Analyze Error */}
            {analyzeError && (
              <div className="rounded-2xl bg-score-poor/5 border border-score-poor/20 p-4 text-center">
                <p className="text-sm text-score-poor font-medium">{analyzeError}</p>
                <button
                  onClick={() => normalizedUrl && runAnalysis(normalizedUrl)}
                  className="mt-2 text-xs text-primary font-semibold hover:underline"
                >
                  다시 분석하기
                </button>
              </div>
            )}

            {/* Main: SEO/AEO/GEO gauge cards with inline insights */}
            {result && <ScoreDashboard result={result} url={normalizedUrl} />}

            {/* Verification Links */}
            <VerificationLinks url={normalizedUrl} />

            {/* Email Form */}
            <EmailForm onSubmitted={() => {}} />

            {/* FAQ */}
            <FaqSection expanded />
            <div className="h-24" />
          </div>

          <StickyBottomCTA />
        </main>
      )}
    </div>
  );
};

export default Index;
