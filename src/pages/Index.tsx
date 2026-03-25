import { useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Navbar from "@/components/Navbar";
import ScoreDashboard from "@/components/ScoreDashboard";
import LoadingScreen from "@/components/LoadingScreen";
import LighthouseScores from "@/components/LighthouseScores";
import ResultHeader from "@/components/ResultHeader";
import VerificationLinks from "@/components/VerificationLinks";
import EmailForm from "@/components/EmailForm";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import PsiErrorBanner from "@/components/PsiErrorBanner";
import { type DemoResult } from "@/data/demoResults";
import { fetchPsi, type PsiResult, type PsiError } from "@/lib/psi";
import { analyzeSite } from "@/lib/analyze";
import { trackEvent } from "@/lib/analytics";

type Screen = "home" | "loading" | "result";

const Index = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("home");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState("");
  const [result, setResult] = useState<DemoResult | null>(null);
  
  const [psiMobile, setPsiMobile] = useState<PsiResult | null>(null);
  const [psiDesktop, setPsiDesktop] = useState<PsiResult | null>(null);
  const [psiError, setPsiError] = useState<PsiError | null>(null);

  const runAnalysis = async (finalUrl: string) => {
    setNormalizedUrl(finalUrl);
    setScreen("loading");
    setPsiMobile(null);
    setPsiDesktop(null);
    setPsiError(null);
    trackEvent("analysis_start", { url: finalUrl });

    const [mobileRes, desktopRes] = await Promise.all([
      fetchPsi(finalUrl, 'mobile'),
      fetchPsi(finalUrl, 'desktop'),
    ]);

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

    setResult(getDemoResult(finalUrl));
    setScreen("result");

    const end = Date.now() + 800;
    const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#34d399', '#fbbf24'];
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handleAnalyze = () => {
    setUrlError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError("URL을 입력해 주세요.");
      return;
    }
    let finalUrl = trimmed;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }
    try {
      new URL(finalUrl);
    } catch {
      setUrlError("URL 형식을 확인해 주세요. 예: https://example.com");
      return;
    }
    runAnalysis(finalUrl);
  };

  const handleRetryPsi = () => {
    if (normalizedUrl) {
      setPsiError(null);
      Promise.all([
        fetchPsi(normalizedUrl, 'mobile'),
        fetchPsi(normalizedUrl, 'desktop'),
      ]).then(([mobileRes, desktopRes]) => {
        if (mobileRes.data) setPsiMobile(mobileRes.data);
        if (desktopRes.data) setPsiDesktop(desktopRes.data);
        const err = mobileRes.error || desktopRes.error;
        if (err && !mobileRes.data && !desktopRes.data) setPsiError(err);
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {screen === "home" && (
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/8 text-accent text-sm font-semibold mb-8">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              무료 베타 서비스
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-[1.25] mb-5 tracking-tight">
              내 사이트, 검색엔진과 AI가<br className="hidden sm:block" /> 제대로 이해하고 있을까?
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-10 leading-relaxed">
              URL만 입력하면 SEO 기본 상태와 AI 검색 준비도를<br className="hidden sm:block" /> 빠르게 확인할 수 있어요.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="https://example.com"
                className="flex-1 h-14 px-5 rounded-2xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-base transition-all"
              />
              <button
                onClick={handleAnalyze}
                className="h-14 px-8 rounded-2xl gradient-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                무료로 분석하기
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 font-medium">모바일 + 데스크톱 동시 측정 · 10초 완료</p>
            {urlError && (
              <p className="mt-3 text-sm text-destructive font-medium">{urlError}</p>
            )}
            <button
              onClick={() => navigate("/design-test")}
              className="mt-8 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              🎨 디자인 테스트 모드
            </button>
          </div>
        </main>
      )}

      {screen === "loading" && <LoadingScreen />}

      {screen === "result" && result && (
        <main className="flex-1 py-8 sm:py-12 px-4 pb-24">
          <div className="container max-w-4xl mx-auto space-y-5">
            {/* Result header: URL, time, badge */}
            <ResultHeader
              psi={psiMobile || psiDesktop}
              psiError={psiError}
              url={normalizedUrl}
            />

            {/* PSI Error */}
            {psiError && <PsiErrorBanner error={psiError} onRetry={handleRetryPsi} />}

            {/* Lighthouse real scores */}
            {(psiMobile || psiDesktop) && <LighthouseScores mobile={psiMobile} desktop={psiDesktop} />}

            {/* Main: SEO/AEO/GEO gauge cards with inline insights */}
            <ScoreDashboard result={result} />

            {/* Verification Links */}
            <VerificationLinks url={normalizedUrl} />

            {/* Email Form */}
            <EmailForm onSubmitted={() => {}} />
          </div>

          <StickyBottomCTA />
        </main>
      )}
    </div>
  );
};

export default Index;
