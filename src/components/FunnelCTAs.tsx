import { useState } from "react";
import { FileText, MessageSquare, Bell, CheckCircle, X } from "lucide-react";
import ConsultationModal from "@/components/ConsultationModal";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { type DemoResult } from "@/data/demoResults";

interface FunnelCTAsProps {
  result?: DemoResult | null;
  url?: string;
}

export default function FunnelCTAs({ result, url }: FunnelCTAsProps) {
  const [step, setStep] = useState<"idle" | "email" | "email-done" | "consult">("idle");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"" | "duplicate" | "error">("");

  const handleEmailSubmit = async () => {
    setEmailError("");
    setAgreeError("");
    setEmailStatus("");
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("이메일 형식을 확인해 주세요.");
      return;
    }
    if (!agreed) {
      setAgreeError("동의가 필요해요.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("email_leads").insert({
        email: trimmed,
        source: "funnel_step1",
      });

      if (error) {
        if (error.code === "23505") {
          setEmailStatus("duplicate");
          trackEvent("email_submit_duplicate", { email: trimmed });
          // Even if duplicate, proceed to step 2
          setTimeout(() => setStep("email-done"), 1500);
        } else {
          setEmailStatus("error");
          trackEvent("email_submit_fail", { email: trimmed, reason: error.message });
        }
      } else {
        trackEvent("email_submit_success", { email: trimmed, source: "funnel_step1" });
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "lead-confirmation",
            recipientEmail: trimmed,
            idempotencyKey: `lead-confirm-${trimmed}`,
          },
        });
        setStep("email-done");
      }
    } catch {
      setEmailStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. 무료 상담 신청 - 2-Step Funnel */}
        <button
          onClick={() => setStep("email")}
          className="group relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent hover:border-primary/40 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl gradient-primary">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xs font-bold text-primary">추천</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">무료 상담 신청</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              현재 상태를 진단하고<br />맞춤 솔루션을 제안받으세요
            </p>
          </div>
          <span className="text-xs font-semibold text-primary group-hover:underline">
            전문가 상담 신청 →
          </span>
        </button>

        {/* 2. 자동 SEO 리포트 - Coming Soon */}
        <div className="relative flex flex-col items-start gap-3 p-5 rounded-2xl border border-border bg-card/50 opacity-75">
          <div className="absolute top-3 right-3">
            <span className="px-2 py-0.5 rounded-full bg-score-warning/10 text-score-warning text-[10px] font-bold">
              출시예정
            </span>
          </div>
          <div className="p-2 rounded-xl bg-muted">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">자동 SEO 리포트</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              분석 결과를 상세 보고서로<br />자동 생성해 이메일로 전달
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground/60">
            곧 출시됩니다
          </span>
        </div>

        {/* 3. 출시 알림 */}
        <button
          onClick={() => setStep("email")}
          className="group flex flex-col items-start gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary/20 hover:shadow-md transition-all text-left"
        >
          <div className="p-2 rounded-xl bg-accent/10">
            <Bell className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">출시 알림 받기</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              정식 출시 소식을 가장 먼저<br />이메일로 받아보세요
            </p>
          </div>
          <span className="text-xs font-semibold text-accent group-hover:underline">
            알림 신청하기 →
          </span>
        </button>
      </div>

      {/* Step 1: Email Registration Modal */}
      {step === "email" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setStep("idle")} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-fade-up">
            <button
              onClick={() => setStep("idle")}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Step 1</span>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">📬 출시 알림 등록</h2>
            <p className="text-sm text-muted-foreground mb-6">
              이메일을 등록하면 정식 출시 소식을 가장 먼저 받아보실 수 있어요.
            </p>

            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); setEmailStatus(""); }}
                  placeholder="you@company.com"
                  className="w-full h-12 px-4 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                />
                {emailError && <p className="mt-1.5 text-xs text-destructive font-medium">{emailError}</p>}
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => { setAgreed(e.target.checked); setAgreeError(""); }}
                  className="mt-0.5 accent-primary w-4 h-4"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  개인정보 수집 및 마케팅 수신에 동의합니다.
                </span>
              </label>
              {agreeError && <p className="text-xs text-destructive font-medium -mt-2">{agreeError}</p>}
              {emailStatus === "duplicate" && (
                <p className="text-xs text-score-warning font-medium">이미 등록된 이메일이에요. 상담 신청으로 넘어갈게요!</p>
              )}
              {emailStatus === "error" && (
                <p className="text-xs text-destructive font-medium">일시적으로 저장에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
              )}
              <button
                onClick={handleEmailSubmit}
                disabled={loading}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "등록 중..." : "이메일 등록하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Transition to Consultation */}
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
              정식 출시 소식을 이메일로 보내드릴게요.
            </p>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-4">
              <div className="flex items-center gap-2 mb-1 justify-center">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Step 2</span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-2">
                전문가 무료 상담도 받아보시겠어요?
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                현재 상태를 진단하고 맞춤 솔루션을 제안해 드려요.
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
                상담 신청하기 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2b: Consultation Modal */}
      <ConsultationModal open={step === "consult"} onClose={() => setStep("idle")} />
    </>
  );
}
