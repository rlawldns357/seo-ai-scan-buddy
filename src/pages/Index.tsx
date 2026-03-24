import { useState } from "react";
import Navbar from "@/components/Navbar";
import ScoreRing from "@/components/ScoreRing";
import LoadingScreen from "@/components/LoadingScreen";
import LighthouseScores from "@/components/LighthouseScores";
import PageThumbnail from "@/components/PageThumbnail";
import AxisCard from "@/components/AxisCard";
import VerificationLinks from "@/components/VerificationLinks";
import EmailForm from "@/components/EmailForm";
import PsiErrorBanner from "@/components/PsiErrorBanner";
import { getDemoResult, type DemoResult } from "@/data/demoResults";
import { fetchPsi, type PsiResult, type PsiError } from "@/lib/psi";
import { trackEvent } from "@/lib/analytics";
import { AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";

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

  const runAnalysis = async (finalUrl: string) => {
    setNormalizedUrl(finalUrl);
    setScreen("loading");
    setPsiMobile(null);
    setPsiDesktop(null);
    setPsiError(null);
    trackEvent("analysis_start", { url: finalUrl });

    const texts = [
      "페이지 구조 확인 중…",
      "기술 SEO 신호 점검 중…",
      "모바일 Lighthouse 측정 중…",
      "데스크톱 Lighthouse 측정 중…",
      "AI 준비도 요약 생성 중…",
    ];
    let i = 0;
    setLoadingText(texts[0]);
    const interval = setInterval(() => {
      i++;
      if (i < texts.length) setLoadingText(texts[i]);
    }, 800);

    const [mobileRes, desktopRes] = await Promise.all([
      fetchPsi(finalUrl, 'mobile'),
      fetchPsi(finalUrl, 'desktop'),
    ]);

    clearInterval(interval);

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
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
              내 사이트, 검색엔진과 AI가<br className="hidden sm:block" /> 제대로 이해하고 있을까?
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-10">
              URL만 입력하면 SEO 기본 상태와 AI 검색 준비도를 빠르게 확인할 수 있어요.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="https://example.com"
                className="flex-1 h-12 px-4 rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base"
              />
              <button
                onClick={handleAnalyze}
                className="h-12 px-6 rounded-lg gradient-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                무료로 분석하기
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">모바일 + 데스크톱 동시 측정</p>
            {urlError && (
              <p className="mt-3 text-sm text-destructive">{urlError}</p>
            )}
          </div>
        </main>
      )}

      {screen === "loading" && <LoadingScreen />}

      {screen === "result" && result && (
        <main className="flex-1 py-8 sm:py-12 px-4">
          <div className="container max-w-3xl mx-auto space-y-6">
            {/* Header badge */}
            <div className="animate-fade-up text-center space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium gradient-subtle text-primary border border-primary/20">
                데모 결과(샘플)
              </span>
            </div>

            {/* Page thumbnail + URL */}
            <PageThumbnail psi={psiMobile || psiDesktop} psiError={psiError} url={normalizedUrl} />

            {/* PSI Error */}
            {psiError && <PsiErrorBanner error={psiError} onRetry={handleRetryPsi} />}

            {/* Lighthouse real scores */}
            {(psiMobile || psiDesktop) && <LighthouseScores mobile={psiMobile} desktop={psiDesktop} />}

            {/* Demo scores */}
            <div className="bg-card rounded-xl shadow-card p-6 sm:p-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center">
                <ScoreRing score={result.overall} label="전체 점수" delay={200} />
                <ScoreRing score={result.techSeo} label="기술 SEO" delay={400} />
                <ScoreRing score={result.contentClarity} label="콘텐츠 명확성" delay={600} />
                <ScoreRing score={result.aiReadiness} label="AI 검색 준비도" delay={800} />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-6">
                점수는 핵심 신호를 요약한 값이며, 개선하면 검색/AI 노출에 도움이 될 수 있어요.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3 animate-fade-up" style={{ animationDelay: "0.25s" }}>
              <SummaryCard
                icon={<AlertTriangle className="w-5 h-5 text-score-warning" />}
                title="핵심 이슈"
                items={result.issues}
              />
              <SummaryCard
                icon={<CheckCircle className="w-5 h-5 text-score-excellent" />}
                title="강점"
                items={result.strengths}
              />
              <SummaryCard
                icon={<Lightbulb className="w-5 h-5 text-primary" />}
                title="권장 개선 방향"
                items={result.recommendations}
              />
            </div>

            {/* SEO / AEO / GEO Axis Cards */}
            <div className="grid gap-4 sm:grid-cols-3 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <AxisCard axis={result.seoAxis} />
              <AxisCard axis={result.aeoAxis} />
              <AxisCard axis={result.geoAxis} />
            </div>

            {/* Verification Links */}
            <VerificationLinks url={normalizedUrl} />

            {/* Email Form */}
            <EmailForm onSubmitted={() => {}} />
          </div>
        </main>
      )}
    </div>
  );
};

function SummaryCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="bg-card rounded-xl shadow-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
            <span className="text-primary mt-0.5 shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Index;
