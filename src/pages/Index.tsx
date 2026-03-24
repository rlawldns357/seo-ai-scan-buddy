import { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import ScoreRing from "@/components/ScoreRing";
import { getDemoResult, type DemoResult } from "@/data/demoResults";
import { AlertTriangle, CheckCircle, Lightbulb, Loader2, ArrowRight } from "lucide-react";

type Screen = "home" | "loading" | "result";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("home");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState("");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [loadingText, setLoadingText] = useState("");

  // Email state
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"" | "success" | "duplicate" | "error">("");
  const emailFormRef = useRef<HTMLDivElement>(null);

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

    setNormalizedUrl(finalUrl);
    setScreen("loading");

    const texts = [
      "페이지 구조 확인 중…",
      "기술 SEO 신호 점검 중…",
      "AI 준비도 요약 생성 중…",
    ];
    let i = 0;
    setLoadingText(texts[0]);
    const interval = setInterval(() => {
      i++;
      if (i < texts.length) {
        setLoadingText(texts[i]);
      }
    }, 800);

    setTimeout(() => {
      clearInterval(interval);
      setResult(getDemoResult(finalUrl));
      setScreen("result");
    }, 2500);
  };

  const handleEmailSubmit = () => {
    setEmailError("");
    setAgreeError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("이메일 형식을 확인해 주세요.");
      return;
    }
    if (!agreed) {
      setAgreeError("동의가 필요해요.");
      return;
    }
    // Demo: simulate success (use localStorage to detect "duplicate")
    const stored = JSON.parse(localStorage.getItem("demo_emails") || "[]") as string[];
    if (stored.includes(email.trim().toLowerCase())) {
      setEmailStatus("duplicate");
      return;
    }
    stored.push(email.trim().toLowerCase());
    localStorage.setItem("demo_emails", JSON.stringify(stored));
    setEmailStatus("success");
    setEmailSubmitted(true);
  };

  const scrollToEmailForm = () => {
    emailFormRef.current?.scrollIntoView({ behavior: "smooth" });
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
            {urlError && (
              <p className="mt-3 text-sm text-destructive">{urlError}</p>
            )}
          </div>
        </main>
      )}

      {screen === "loading" && (
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center animate-fade-up">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin-slow mb-6" />
            <p className="text-lg text-foreground font-medium">{loadingText}</p>
          </div>
        </main>
      )}

      {screen === "result" && result && (
        <main className="flex-1 py-8 sm:py-12 px-4">
          <div className="container max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="animate-fade-up text-center space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium gradient-subtle text-primary border border-primary/20">
                데모 결과(샘플)
              </span>
              <p className="text-sm text-muted-foreground">
                분석 대상: <span className="font-medium text-foreground">{normalizedUrl}</span>
              </p>
            </div>

            {/* Scores */}
            <div className="bg-card rounded-xl shadow-card p-6 sm:p-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
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
            <div className="grid gap-4 sm:grid-cols-3 animate-fade-up" style={{ animationDelay: "0.2s" }}>
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

            {/* Email Form */}
            <div ref={emailFormRef} className="bg-card rounded-xl shadow-card p-6 sm:p-8 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <h2 className="text-lg font-semibold text-foreground mb-1">업데이트/리포트 받기</h2>
              <p className="text-sm text-muted-foreground mb-5">
                추가로 출시되는 상품과 리포트 업데이트를 이메일로 보내드릴게요.
              </p>

              {emailStatus === "success" ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-score-excellent mx-auto mb-2" />
                  <p className="text-foreground font-medium">등록 완료!</p>
                  <p className="text-sm text-muted-foreground">업데이트가 준비되면 이메일로 알려드릴게요.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); setEmailStatus(""); }}
                      placeholder="you@company.com"
                      className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                    {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => { setAgreed(e.target.checked); setAgreeError(""); }}
                      className="mt-0.5 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      개인정보 수집 및 마케팅 수신에 동의합니다.
                    </span>
                  </label>
                  {agreeError && <p className="text-xs text-destructive -mt-2">{agreeError}</p>}
                  {emailStatus === "duplicate" && (
                    <p className="text-xs text-score-warning">이미 등록된 이메일이에요. 업데이트를 기다려 주세요.</p>
                  )}
                  {emailStatus === "error" && (
                    <p className="text-xs text-destructive">일시적으로 저장에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
                  )}
                  <button
                    onClick={handleEmailSubmit}
                    className="w-full h-11 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                  >
                    이메일로 받기
                  </button>
                </div>
              )}
            </div>

            {/* CTA after email submit */}
            {emailSubmitted && (
              <div className="bg-card rounded-xl border border-primary/20 shadow-elevated p-6 text-center animate-fade-up">
                <p className="text-foreground font-medium mb-3">
                  Search OS에서 더 깊게 개선안을 받아보세요 <span className="text-muted-foreground text-sm">(출시 준비 중)</span>
                </p>
                <button
                  onClick={scrollToEmailForm}
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-lg border border-primary text-primary font-medium text-sm hover:bg-primary/5 transition-colors"
                >
                  Search OS 소식 받기
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
