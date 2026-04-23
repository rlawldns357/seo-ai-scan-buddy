import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function BetaWaitlist() {
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
      if (error) {
        if (error.code === "23505") {
          // Unique violation — treat as success
          setDone(true);
          return;
        }
        throw error;
      }
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

  return (
    <section
      id="beta"
      className="py-12 md:py-24 px-4 md:px-6 scroll-mt-20"
    >
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 md:mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-4">
            <Sparkles className="w-3 h-3" />
            클로즈드 베타
          </span>
          <h2 className="text-[24px] leading-[1.3] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground break-keep">
            먼저 써보고, <span className="text-primary">평생 50% 쿠폰</span>까지
          </h2>
          <p className="text-[15px] leading-[1.7] md:text-base md:leading-relaxed text-muted-foreground mt-4 break-keep">
            베타 기간 동안은 초대받은 사용자만 무료로 이용할 수 있습니다.
            출시 후에는 Pro 평생 50% 쿠폰이 자동으로 발급됩니다.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 md:p-7">
          {done ? (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                신청이 접수됐어요
              </h3>
              <p className="text-sm text-muted-foreground break-keep">
                초대장이 준비되면 이메일로 알려드릴게요. 보통 영업일 기준 2-3일 내에 답변드립니다.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="beta-email" className="text-xs font-medium">
                  이메일 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="beta-email"
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
                <Label htmlFor="beta-site" className="text-xs font-medium">
                  운영 중인 사이트 URL
                  <span className="text-muted-foreground font-normal ml-1">(선택)</span>
                </Label>
                <Input
                  id="beta-site"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://brand.com"
                  maxLength={2000}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="beta-reason" className="text-xs font-medium">
                  어떤 콘텐츠를 자동 발행하고 싶으세요?
                  <span className="text-muted-foreground font-normal ml-1">(선택)</span>
                </Label>
                <textarea
                  id="beta-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예) 패션 쇼핑몰 상품 가이드, B2B SaaS 도입 사례 등"
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full rounded-full h-12 justify-center"
              >
                {submitting ? "신청 중..." : "베타 신청하기"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center break-keep">
                개인정보는 베타 초대 안내 목적 외에 사용되지 않습니다.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
