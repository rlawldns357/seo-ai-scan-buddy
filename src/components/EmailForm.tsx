import { useRef, useState } from "react";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

interface EmailFormProps {
  onSubmitted: () => void;
}

export default function EmailForm({ onSubmitted }: EmailFormProps) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState("");
  const [emailStatus, setEmailStatus] = useState<"" | "success" | "duplicate" | "error">("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    setEmailError("");
    setAgreeError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmed = email.trim().toLowerCase();
    if (!emailRegex.test(trimmed)) {
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
        source: "result_form",
      });

      if (error) {
        if (error.code === "23505") {
          setEmailStatus("duplicate");
          trackEvent("email_submit_duplicate", { email: trimmed });
        } else {
          setEmailStatus("error");
          trackEvent("email_submit_fail", { email: trimmed, reason: error.message });
        }
      } else {
        setEmailStatus("success");
        trackEvent("email_submit_success", { email: trimmed });
        // Send confirmation email (fire-and-forget)
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "lead-confirmation",
            recipientEmail: trimmed,
            idempotencyKey: `lead-confirm-${trimmed}`,
          },
        });
        onSubmitted();
      }
    } catch {
      setEmailStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="email-form-section" ref={formRef} className="bg-primary/[0.03] rounded-2xl shadow-card border border-border px-5 py-7 sm:p-8 animate-fade-up" style={{ animationDelay: "0.4s" }}>
      <h2 className="text-lg font-bold text-foreground mb-1">맞춤 개선 리포트 받기</h2>
      <p className="text-sm text-muted-foreground mb-6">
        내 사이트 맞춤 개선 우선순위를 이메일로 받아보세요.
      </p>
      {emailStatus === "success" ? (
        <div className="text-center py-6">
          <CheckCircle className="w-10 h-10 text-score-excellent mx-auto mb-3" />
          <p className="text-foreground font-bold text-lg">등록 완료!</p>
          <p className="text-sm text-muted-foreground mt-1">업데이트가 준비되면 이메일로 알려드릴게요.</p>
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-4">
          <div className="pt-1">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); setEmailStatus(""); }}
              placeholder="you@company.com"
              className="w-full h-14 sm:h-12 px-4 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-base sm:text-sm transition-all border-border"
            />
            {emailError && <p className="mt-2 text-xs text-destructive font-medium">{emailError}</p>}
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
            <p className="text-xs text-score-warning font-medium">이미 등록된 이메일이에요. 업데이트를 기다려 주세요.</p>
          )}
          {emailStatus === "error" && (
            <p className="text-xs text-destructive font-medium">일시적으로 저장에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-14 sm:h-12 mt-1 rounded-xl bg-primary text-primary-foreground font-bold text-base sm:text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "등록 중..." : "이메일로 받기"}
          </button>
        </div>
      )}
    </div>
  );
}
