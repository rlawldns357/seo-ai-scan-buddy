import { useState } from "react";
import { CheckCircle, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  "w-full h-11 px-4 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all";

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"" | "loading" | "success" | "error">("");

  if (!open) return null;

  const clearError = (key: string) => setErrors((p) => ({ ...p, [key]: "" }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "이름을 입력해 주세요.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "이메일 형식을 확인해 주세요.";
    if (!message.trim()) e.message = "문의 내용을 입력해 주세요.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStatus("loading");

    try {
      const { error } = await supabase.from("consultation_requests").insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        concerns: message.trim(),
        interests: ["business_inquiry"],
        budget: null,
        site_url: null,
      });

      if (error) {
        setStatus("error");
        trackEvent("consultation_submit_fail", { error: error.message });
      } else {
        setStatus("success");
        trackEvent("consultation_submit_success", {
          email: email.trim().toLowerCase(),
          interests: ["business_inquiry"],
        });
      }
    } catch {
      setStatus("error");
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
            <p className="text-foreground font-bold text-lg">문의가 접수되었습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              확인 후 빠르게 회신 드리겠습니다.
            </p>
            <button
              onClick={onClose}
              className="mt-4 h-10 px-6 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              닫기
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-foreground mb-1">
              비즈니스 문의
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              제휴, 협업, 서비스 관련 문의를 남겨 주세요.
            </p>

            <div className="space-y-4">
              {/* Name & Company */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    담당자명 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearError("name"); }}
                    placeholder="김서치"
                    className={inputClass}
                  />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    회사명
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="(주)서치튠"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  이메일 <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                  placeholder="contact@company.com"
                  className={inputClass}
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  문의 내용 <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); clearError("message"); }}
                  placeholder="문의하실 내용을 작성해 주세요."
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all resize-none"
                />
                {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
              </div>

              {status === "error" && (
                <p className="text-xs text-destructive font-medium">
                  전송에 실패했습니다. 잠시 후 다시 시도해 주세요.
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === "loading"}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  "전송 중..."
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    문의 보내기
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
