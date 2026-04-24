import { useState } from "react";
import { Sparkles, CheckCircle2, X, Tag, Gift, Lock } from "lucide-react";
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
 * Beta application modal triggered from the AutoBlog teaser.
 * Inserts into `beta_waitlist` and surfaces the Pro 50% lifetime promo.
 */
export default function BetaSignupModal({ open, onClose }: BetaSignupModalProps) {
  const [email, setEmail] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [reason, setReason] = useState("");
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
      });
      if (error && error.code !== "23505") throw error;

      trackEvent("autoblog_beta_signup", { source: "home_teaser" });
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
    setDone(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          // delay reset to avoid flash
          setTimeout(reset, 200);
        }
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 border-0">
        {/* Promo header */}
        <div className="relative bg-[hsl(232_47%_14%)] text-white px-6 py-7">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center transition-colors"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-extrabold tracking-[0.18em] uppercase ring-1 ring-white/15 mb-3">
            <Sparkles className="w-3 h-3" /> Closed Beta · AutoBlog
          </div>
          <h3 className="text-xl font-extrabold leading-snug tracking-tight">
            베타 신청하면<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              평생 50% 할인
            </span>
            <span className="text-white"> 쿠폰까지</span>
          </h3>

          <ul className="mt-4 space-y-1.5">
            {[
              { icon: Lock, text: "초대받은 사용자만 베타 무료 이용" },
              { icon: Tag, text: "정식 출시 시 Pro 평생 50% 자동 발급" },
              { icon: Gift, text: "오픈 알림 + 사용 가이드 우선 제공" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-[13px] text-white/80">
                <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div className="px-6 py-6 bg-card">
          {done ? (
            <div className="text-center py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-base font-bold text-foreground mb-1">
                신청이 접수됐어요
              </h4>
              <p className="text-sm text-muted-foreground break-keep">
                초대장이 준비되면 이메일로 알려드릴게요.<br />
                정식 출시 시 <span className="font-bold text-primary">Pro 50% 평생 쿠폰</span>도 자동 적용됩니다.
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
              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full h-12 text-sm font-extrabold"
              >
                {submitting ? "신청 중..." : "베타 신청하고 50% 쿠폰 받기"}
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
