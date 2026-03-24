import { useRef, useState } from "react";
import { CheckCircle } from "lucide-react";
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

  return (
    <div ref={formRef} className="bg-card rounded-2xl shadow-card p-6 sm:p-8 animate-fade-up" style={{ animationDelay: "0.4s" }}>
      <h2 className="text-lg font-bold text-foreground mb-1">업데이트/리포트 받기</h2>
      <p className="text-sm text-muted-foreground mb-6">
        추가로 출시되는 상품과 리포트 업데이트를 이메일로 보내드릴게요.
      </p>
      {emailStatus === "success" ? (
        <div className="text-center py-6">
          <CheckCircle className="w-10 h-10 text-score-excellent mx-auto mb-3" />
          <p className="text-foreground font-bold text-lg">등록 완료!</p>
          <p className="text-sm text-muted-foreground mt-1">업데이트가 준비되면 이메일로 알려드릴게요.</p>
        </div>
      ) : (
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
            <p className="text-xs text-score-warning font-medium">이미 등록된 이메일이에요. 업데이트를 기다려 주세요.</p>
          )}
          {emailStatus === "error" && (
            <p className="text-xs text-destructive font-medium">일시적으로 저장에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
          )}
          <button
            onClick={handleSubmit}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            이메일로 받기
          </button>
        </div>
      )}
    </div>
  );
}
