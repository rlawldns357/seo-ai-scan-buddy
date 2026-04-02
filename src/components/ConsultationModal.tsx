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
  "월 50~200만원",
  "월 200~500만원",
  "월 500만원 이상",
];

const INTEREST_OPTIONS = [
  { id: "naver_search_ads", label: "네이버 검색광고" },
  { id: "google_ads", label: "Google Ads" },
  { id: "meta_ads", label: "Meta 광고" },
  { id: "seo", label: "SEO 검색 최적화" },
  { id: "aeo", label: "AEO AI 답변 최적화" },
  { id: "geo", label: "GEO 생성형 AI 노출" },
  { id: "content", label: "콘텐츠 마케팅" },
  { id: "analytics", label: "데이터 분석/GA" },
];

const inputClass =
  "w-full h-11 px-4 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm transition-all";

export default function ConsultationModal({ open, onClose }: ConsultationModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
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

  const clearError = (key: string) => setErrors((p) => ({ ...p, [key]: "" }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "이름을 입력해 주세요.";
    if (!phone.trim()) e.phone = "연락처를 입력해 주세요.";
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
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        company: company.trim() || null,
        job_title: jobTitle.trim() || null,
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
              담당 광고 전문가가 빠르게 연락드리겠습니다.
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
              현재 상태를 진단하고 맞춤 솔루션을 제안받으세요.
            </p>

            <div className="space-y-4">
              {/* Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    이름 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearError("name"); }}
                    placeholder="홍길동"
                    className={inputClass}
                  />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    연락처 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); clearError("phone"); }}
                    placeholder="010-1234-5678"
                    className={inputClass}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
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
                  placeholder="you@company.com"
                  className={inputClass}
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Company & Job Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    회사명
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="(주)마케팅컴퍼니"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    직함
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="마케팅 팀장"
                    className={inputClass}
                  />
                </div>
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
                  className={inputClass}
                />
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
                        clearError("interests");
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

              {/* Budget */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  월 광고 예산
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

              {/* Concerns */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  고민 사항
                </label>
                <textarea
                  value={concerns}
                  onChange={(e) => setConcerns(e.target.value)}
                  placeholder="현재 광고 ROAS가 낮아서 개선이 필요합니다..."
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
