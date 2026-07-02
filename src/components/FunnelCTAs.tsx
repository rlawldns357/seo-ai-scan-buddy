import { useState } from "react";
import { CheckCircle, Sparkles, ShieldCheck, Clock, X, FileText, Users, BarChart3 } from "lucide-react";
import ConsultationModal from "@/components/ConsultationModal";
import { trackEvent } from "@/lib/analytics";
import { enrollSoapFunnel } from "@/lib/soapFunnel";
import { type DemoResult } from "@/data/demoResults";

interface FunnelCTAsProps {
  result?: DemoResult | null;
  url?: string;
}

/**
 * Grand Slam Offer card (Hormozi $100M Offers + StoryBrand SB7 flow).
 * Single focused CTA: give email → get customized PDF + gain access to strategy call + updates.
 * Secondary CTA: consult button. Tertiary: just-notify fallback.
 */
export default function FunnelCTAs({ result, url }: FunnelCTAsProps) {
  const [step, setStep] = useState<"idle" | "email-done" | "consult">("idle");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("이메일 형식을 확인해 주세요.");
      return;
    }
    if (!agreed) {
      setError("개인정보 수집·마케팅 수신 동의가 필요합니다.");
      return;
    }
    setLoading(true);
    try {
      const r = await enrollSoapFunnel(trimmed, "grand_slam_offer", {
        url,
        seo: result?.seoScore,
        aeo: result?.aeoScore,
        geo: result?.geoScore,
      });
      if (r.error) {
        setError("일시적 오류입니다. 잠시 후 다시 시도해 주세요.");
        trackEvent("email_submit_fail", { email: trimmed, reason: r.error });
      } else {
        trackEvent("email_submit_success", { email: trimmed, source: "grand_slam_offer", duplicate: r.duplicate });
        setStep("email-done");
      }
    } catch {
      setError("일시적 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const worstAxis = result
    ? ([
        { k: "SEO", v: result.seoScore ?? 100 },
        { k: "AEO", v: result.aeoScore ?? 100 },
        { k: "GEO", v: result.geoScore ?? 100 },
      ].sort((a, b) => a.v - b.v)[0])
    : null;

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent p-6 sm:p-8 shadow-lg">
        {/* Ribbon */}
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wide">
            LIMITED · 무료 진단 리포트
          </div>
        </div>

        {/* Headline (StoryBrand: problem → guide → plan) */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {worstAxis
              ? `${worstAxis.k} ${worstAxis.v}점 — 지금 조치 필요`
              : "2026 AI 검색 대응 진단"}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
            이 진단 결과, <span className="text-primary">실행 리포트</span>로 받아보세요
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            ChatGPT · Perplexity · Google AI가 당신의 사이트를 인용하도록<br className="hidden sm:block" />
            {" "}맞춤 실행 순서까지 담긴 무료 PDF를 이메일로 보내드립니다.
          </p>
        </div>

        {/* Value stack (Hormozi Grand Slam Offer) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
          <ValueRow icon={FileText} title="맞춤 SEO/AEO/GEO 진단 PDF" note="당신 사이트 기반 15+ 실행안" />
          <ValueRow icon={BarChart3} title="경쟁사 대비 벤치마크" note="같은 업계 평균과 차이" />
          <ValueRow icon={Users} title="30분 무료 전략 상담" note="원하는 리드만 별도 예약" />
          <ValueRow icon={ShieldCheck} title="5일 실행 가이드 시리즈" note="Day별 액션, 언제든 해지" />
        </div>

        {/* Form */}
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="you@company.com"
            className="w-full h-12 px-4 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
          />
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); setError(""); }}
              className="mt-0.5 accent-primary w-4 h-4"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              개인정보 수집 및 마케팅 수신에 동의합니다. (언제든 1클릭 해지)
            </span>
          </label>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full h-13 py-3.5 rounded-xl gradient-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
          >
            {loading ? "전송 중..." : "무료 리포트 받기 →"}
          </button>

          {/* Risk reversal */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />3분 안 도착</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" />스팸 없음</span>
            <span className="inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" />1클릭 해지</span>
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            지금 바로 전문가와 이야기하고 싶다면?
          </p>
          <button
            onClick={() => setStep("consult")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            무료 30분 상담 신청 →
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {step === "email-done" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setStep("idle")} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-fade-up text-center">
            <button
              onClick={() => setStep("idle")}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <CheckCircle className="w-12 h-12 text-score-excellent mx-auto mb-3" />
            <p className="text-foreground font-bold text-lg">등록 완료!</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              첫 리포트를 몇 분 내로 이메일로 보내드릴게요.
            </p>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-4 text-left">
              <p className="text-sm font-semibold text-foreground">전문가 무료 상담도 받아보시겠어요?</p>
              <p className="text-xs text-muted-foreground mt-1">
                진단 결과를 바탕으로 이번 분기 실행 순서를 함께 짜드립니다. (30분)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("idle")}
                className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                다음에 할게요
              </button>
              <button
                onClick={() => setStep("consult")}
                className="flex-1 h-11 rounded-xl gradient-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
              >
                상담 신청 →
              </button>
            </div>
          </div>
        </div>
      )}

      <ConsultationModal open={step === "consult"} onClose={() => setStep("idle")} />
    </>
  );
}

function ValueRow({
  icon: Icon,
  title,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note: string;
}) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card/60 border border-border/60">
      <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground leading-tight">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{note}</p>
      </div>
    </div>
  );
}
