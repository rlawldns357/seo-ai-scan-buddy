import { useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight, Wand2, Send, BarChart3, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
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

  const flow = [
    { icon: Wand2, label: "자동 생성" },
    { icon: Send, label: "자동 발행" },
    { icon: BarChart3, label: "자동 채점" },
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
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border-0 bg-card max-h-[92vh] overflow-y-auto">
        {/* Header — LIVE 모집 + 자동화 정체성 */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-primary/[0.07] via-primary/[0.03] to-transparent">
          {/* LIVE · 모집중 */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-extrabold tracking-[0.18em] uppercase ring-1 ring-destructive/20">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-75" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-destructive" />
              </span>
              Live
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold tracking-[0.18em] uppercase ring-1 ring-primary/20">
              <Sparkles className="w-2.5 h-2.5" />
              Closed Beta · 모집중
            </span>
          </div>

          {/* 제품 정체성 */}
          <p className="mt-3 text-[12px] font-bold tracking-wider uppercase text-muted-foreground">
            완전 자동화 블로그 운영 · Auto Blog
          </p>

          <h3 className="mt-1.5 text-[22px] font-extrabold leading-[1.22] tracking-tight text-foreground break-keep">
            지금 베타 신청하면<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              평생 50% 할인
            </span>
            <span className="text-foreground"> 쿠폰까지</span>
          </h3>

          {/* 자동화 플로우 */}
          <div className="mt-4 flex items-center gap-1.5">
            {flow.map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-1.5 flex-1">
                <div className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-background border border-border">
                  <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[11.5px] font-semibold text-foreground whitespace-nowrap">{label}</span>
                </div>
                {i < flow.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[12px] text-muted-foreground leading-relaxed break-keep">
            페이지 1개만 만들면 <span className="text-foreground font-semibold">SEO·AEO·GEO 3축</span>에 맞춰 글이 자동으로 쌓이고 발행돼요.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 pb-6 pt-4">
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
            <form onSubmit={handleSubmit} className="space-y-3">
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

              {/* 콘텐츠 설명 — 접힘 (details) */}
              <details className="group">
                <summary className="text-[11.5px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                  자동 발행하고 싶은 콘텐츠 알려주기 (선택)
                </summary>
                <textarea
                  id="beta-modal-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예) 패션 쇼핑몰 상품 가이드, B2B SaaS 도입 사례"
                  rows={2}
                  maxLength={1000}
                  className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </details>

              {/* Marketing consent — 라인형 */}
              <label
                htmlFor="beta-modal-consent"
                className="flex items-start gap-2 pt-1 cursor-pointer group"
              >
                <input
                  id="beta-modal-consent"
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 rounded border-input accent-primary cursor-pointer shrink-0"
                />
                <span className="text-[11.5px] text-muted-foreground leading-relaxed break-keep group-hover:text-foreground transition-colors">
                  <span className="font-semibold text-foreground">[선택]</span> 출시·업데이트 안내 및{" "}
                  <span className="font-bold text-primary">Pro 평생 50% 쿠폰</span> 이메일 수신 동의
                </span>
              </label>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full h-12 text-sm font-extrabold group mt-1"
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
                <span className="font-semibold text-foreground">신용카드 불필요</span> · 베타 기간 무료 · 언제든 자동 발행 정지 가능
              </p>

              {/* 이미 베타 가입한 사용자용 진입점 */}
              <div className="pt-3 mt-1 border-t border-border/60 text-center">
                <span className="text-[11.5px] text-muted-foreground">이미 베타 가입했나요? </span>
                <Link
                  to="/auth?next=%2Fdashboard"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:underline"
                >
                  <LogIn className="w-3 h-3" />
                  로그인하기
                </Link>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
