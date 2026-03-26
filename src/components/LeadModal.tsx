import { useState } from "react";
import { CheckCircle, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { downloadReportPdf } from "@/lib/generateReportPdf";
import { type DemoResult } from "@/data/demoResults";

interface LeadModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  result?: DemoResult | null;
  url?: string;
}

export default function LeadModal({ open, onClose, title = "맞춤 개선 리포트 받기", result, url }: LeadModalProps) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState("");
  const [status, setStatus] = useState<"" | "success" | "duplicate" | "error">("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setEmailError("");
    setAgreeError("");
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
        source: "cta_modal",
      });

      if (error) {
        if (error.code === "23505") {
          setStatus("duplicate");
          trackEvent("email_submit_duplicate", { email: trimmed });
        } else {
          setStatus("error");
          trackEvent("email_submit_fail", { email: trimmed, reason: error.message });
        }
      } else {
        setStatus("success");
        trackEvent("email_submit_success", { email: trimmed, source: "cta_modal" });
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "lead-confirmation",
            recipientEmail: trimmed,
            idempotencyKey: `lead-confirm-${trimmed}`,
          },
        });
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {status === "success" ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-score-excellent mx-auto mb-3" />
            <p className="text-foreground font-bold text-lg">등록 완료!</p>
            <p className="text-sm text-muted-foreground mt-1">맞춤 개선 리포트가 준비되면 이메일로 알려드릴게요.</p>
            <button
              onClick={onClose}
              className="mt-5 h-10 px-6 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              닫기
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-foreground mb-1">{title}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              내 사이트 맞춤 개선 우선순위를 이메일로 받아보세요.
            </p>
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); setStatus(""); }}
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
              {status === "duplicate" && (
                <p className="text-xs text-score-warning font-medium">이미 등록된 이메일이에요. 업데이트를 기다려 주세요.</p>
              )}
              {status === "error" && (
                <p className="text-xs text-destructive font-medium">일시적으로 저장에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "등록 중..." : "이메일로 받기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
