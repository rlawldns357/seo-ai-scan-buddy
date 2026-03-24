import { useRef, useState } from "react";
import { CheckCircle, ArrowRight } from "lucide-react";
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
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
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
    const stored = JSON.parse(localStorage.getItem("demo_emails") || "[]") as string[];
    if (stored.includes(email.trim().toLowerCase())) {
      setEmailStatus("duplicate");
      trackEvent("email_submit_duplicate", { email: email.trim().toLowerCase() });
      return;
    }
    stored.push(email.trim().toLowerCase());
    localStorage.setItem("demo_emails", JSON.stringify(stored));
    setEmailStatus("success");
    trackEvent("email_submit_success", { email: email.trim().toLowerCase() });
    onSubmitted();
  };

  const scrollToForm = () => {
    trackEvent("cta_click", { cta: "search_os_news" });
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div ref={formRef} className="bg-card rounded-xl shadow-card p-6 sm:p-8 animate-fade-up" style={{ animationDelay: "0.4s" }}>
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
              onClick={handleSubmit}
              className="w-full h-11 rounded-lg gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              이메일로 받기
            </button>
          </div>
        )}
      </div>

      {emailStatus === "success" && (
        <div className="bg-card rounded-xl border border-primary/20 shadow-elevated p-6 text-center animate-fade-up">
          <p className="text-foreground font-medium mb-3">
            Search OS에서 더 깊게 개선안을 받아보세요 <span className="text-muted-foreground text-sm">(출시 준비 중)</span>
          </p>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-lg border border-primary text-primary font-medium text-sm hover:bg-primary/5 transition-colors"
          >
            Search OS 소식 받기
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
