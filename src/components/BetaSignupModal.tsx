import { useState } from "react";
import { Sparkles, CheckCircle2, X, ArrowRight, Wand2, Send, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

interface BetaSignupModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Beta application modal — restyled to match the /autoblog Hero language:
 * pill badge, large display heading, check-pill bullets, rounded primary CTA.
 * Marketing consent is an explicit opt-in (default OFF) and required to
 * receive the post-launch Pro 50% lifetime coupon.
 */
export default function BetaSignupModal({ open, onClose }: BetaSignupModalProps) {
  const [email, setEmail] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [reason, setReason] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email || !email.includes("@")) {
      toast({ title: "이메일을 다시 확인해 주세요", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("beta_waitlist").insert({
        email: email.trim(),
        site_url: siteUrl.trim() || null,
        reason: reason.trim() || null,
        marketing_consent: marketingConsent,
        marketing_consent_at: marketingConsent ? new Date().toISOString() : null,
      });
      if (error && error.code !== "23505") throw error;

      trackEvent("autoblog_beta_signup", {
        source: "home_teaser",
        marketing_consent: marketingConsent,
      });
      setDone(true);
    } catch (err) {
      toast({
        title: "신청에 실패했어요",
        description: err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setEmail("");
    setSiteUrl("");
    setReason("");
    setMarketingConsent(false);
    setDone(false);
  };

  const bullets = [
    "초대받은 사용자만 베타 무료 이용",
    "SEO·AEO·GEO 3축 자동 설계",
    "전용 블로그 허브 즉시 생성",
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setTimeout(reset, 200);
        }
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 border-0 bg-card">
        {/* Header — matches /autoblog Hero tone */}
        <div className="relative px-6 pt-7 pb-5 bg-gradient-to-b from-primary/5 to-transparent">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 w-8 h-8 rounded-full bg-foreground/5 hover:bg-foreground/10 inline-flex items-center justify-center transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold tracking-[0.18em] uppercase ring-1 ring-primary/20">
            <Sparkles className="w-3 h-3" /> Closed Beta · AutoBlog
          </div>

          <h3 className="mt-3 text-[22px] sm:text-[26px] font-extrabold leading-[1.2] tracking-tight text-foreground break-keep">
            지금 베타 신청하면<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              평생 50% 할인
            </span>
            <span className="text-foreground"> 쿠폰까지</span>
          </h3>

          <p className="mt-2.5 text-[13px] text-muted-foreground leading-relaxed break-keep">
            초대장은 신청 즉시 검토 후 이메일로 발송돼요. 정식 출시 시점엔 Pro 평생 50% 쿠폰이 자동 발급됩니다.
          </p>

          {/* check-pills */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {bullets.map((text) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full bg-background border border-border text-[11.5px] font-medium text-foreground"
              >
                <CheckCircle2 className="w-3 h-3 text-primary" />
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="px-6 pb-6 pt-2">
          {done ? (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">
                신청이 접수됐어요
              </h4>
              <p className="text-sm text-muted-foreground break-keep">
                초대장이 준비되면 이메일로 알려드릴게요.
                {marketingConsent && (
                  <>
                    <br />
                    정식 출시 시 <span className="font-bold text-primary">Pro 50% 평생 쿠폰</span>도 자동 발송됩니다.
                  </>
                )}
              </p>
              <Button
                onClick={onClose}
                variant="outline"
                className="mt-5 rounded-full"
              >
                닫기
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="beta-modal-email" className="text-xs font-semibold">
                  이메일 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="beta-modal-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@brand.com"
                  maxLength={255}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="beta-modal-site" className="text-xs font-semibold">
                  운영 중인 사이트 URL
                  <span className="text-muted-foreground font-normal ml-1">(선택)</span>
                </Label>
                <Input
                  id="beta-modal-site"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://brand.com"
                  maxLength={2000}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="beta-modal-reason" className="text-xs font-semibold">
                  어떤 콘텐츠를 자동 발행하고 싶으세요?
                  <span className="text-muted-foreground font-normal ml-1">(선택)</span>
                </Label>
                <textarea
                  id="beta-modal-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예) 패션 쇼핑몰 상품 가이드, B2B SaaS 도입 사례"
                  rows={2}
                  maxLength={1000}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              {/* Marketing consent — explicit opt-in, required for coupon */}
              <label
                htmlFor="beta-modal-consent"
                className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input
                  id="beta-modal-consent"
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-input accent-primary cursor-pointer shrink-0"
                />
                <span className="text-[12px] text-foreground leading-relaxed break-keep">
                  <span className="font-semibold">[선택]</span> 마케팅 정보 수신 동의 — 출시·업데이트 안내 및{" "}
                  <span className="font-bold text-primary">Pro 평생 50% 쿠폰</span>을 이메일로 받아볼게요.
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    동의하지 않으면 베타 초대 안내만 발송되며, 쿠폰은 발급되지 않습니다.
                  </span>
                </span>
              </label>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full h-12 text-sm font-extrabold group"
              >
                {submitting ? (
                  "신청 중..."
                ) : (
                  <>
                    베타 신청하기
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center break-keep">
                개인정보는 베타 초대 안내 외 용도로 사용되지 않습니다.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
