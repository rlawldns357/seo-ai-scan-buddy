import { useState } from "react";
import { CheckCircle, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

interface ConsultationModalProps {
  open: boolean;
  onClose: () => void;
}

const BUDGET_OPTIONS = [
  "아직 미정",
  "월 50만원 이하",
  "월 50~100만원",
  "월 100~300만원",
  "월 300만원 이상",
];

const INTEREST_OPTIONS = [
  { id: "seo", label: "SEO 검색 최적화" },
  { id: "aeo", label: "AEO AI 답변 최적화" },
  { id: "geo", label: "GEO 생성형 AI 노출" },
  { id: "technical", label: "기술적 성능 개선" },
  { id: "content", label: "콘텐츠 전략" },
];

export default function ConsultationModal({ open, onClose }: ConsultationModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [concerns, setConcerns] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"" | "loading" | "success" | "error">("");

  if (!open) return null;

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "이름을 입력해 주세요.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "이메일 형식을 확인해 주세요.";
    if (interests.length === 0) e.interests = "관심 분야를 1개 이상 선택해 주세요.";
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
        site_url: siteUrl.trim() || null,
        budget: budget || null,
        interests,
        concerns: concerns.trim() || null,
      });

      if (error) {
        setStatus("error");
        trackEvent("consultation_submit_fail", { error: error.message });
      } else {
        setStatus("success");
        trackEvent("consultation_submit_success", {
          email: email.trim().toLowerCase(),
          interests,
        });
        // Send notification email (fire-and-forget)
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "lead-confirmation",
            recipientEmail: email.trim().toLowerCase(),
            idempotencyKey: `consultation-${Date.now()}`,
            templateData: { name: name.trim() },
          },
        });
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {status === "success" ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-score-excellent mx-auto mb-3" />
            <p className="text-foreground font-bold text-lg">상담 신청 완료!</p>
            <p className="text-sm text-muted-foreground mt-1">
              빠른 시일 내에 연락드리겠습니다.
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
              🎯 무료 상담 신청
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              전문가가 사이트를 직접 분석하고 맞춤 전략을 제안해 드려요.
            </p>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  이름 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
                  placeholder="홍길동"
                  className="w-full h-11 px-4 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  이메일 <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                  placeholder="you@company.com"
                  className="w-full h-11 px-4 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Site URL */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  사이트 URL
                </label>
                <input
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full h-11 px-4 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  월 예산
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setBudget(budget === opt ? "" : opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        budget === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  관심 분야 <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        toggleInterest(opt.id);
                        setErrors((p) => ({ ...p, interests: "" }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        interests.includes(opt.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {errors.interests && <p className="mt-1 text-xs text-destructive">{errors.interests}</p>}
              </div>

              {/* Concerns */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  고민 사항
                </label>
                <textarea
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  placeholder="현재 검색 노출이 잘 안 되고 있어서..."
                  rows={3}
                  maxLength={1000}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all resize-none"
                />
              </div>

              {status === "error" && (
                <p className="text-xs text-destructive font-medium">
                  일시적으로 저장에 실패했어요. 잠시 후 다시 시도해 주세요.
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === "loading"}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  "신청 중..."
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    무료 상담 신청하기
                  </>
                )}
              </button>

              <p className="text-[10px] text-muted-foreground/60 text-center">
                개인정보는 상담 목적으로만 활용되며 제3자에게 제공되지 않습니다.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
