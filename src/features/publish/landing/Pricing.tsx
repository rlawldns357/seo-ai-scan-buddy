import { Check, Sparkles, Crown, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import BetaSignupModal from "@/components/BetaSignupModal";
import { useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";

type Tier = {
  id: "lite" | "pro" | "studio";
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  highlight?: boolean;
  badge?: string;
  icon: typeof Sparkles;
  features: string[];
  footnote?: string;
  /** 'paid' = Paddle checkout, 'soon' = "준비중" + waitlist */
  mode: "paid" | "soon";
  paddlePriceId?: string;
};

const TIERS: Tier[] = [
  {
    id: "lite",
    name: "Lite",
    price: "₩4,900",
    priceSuffix: "/월",
    tagline: "혼자 운영하는 1인 브랜드용",
    icon: Zap,
    mode: "paid",
    paddlePriceId: "autoblog_lite_monthly",
    features: [
      "블로그 허브 1개",
      "월 10편 발행",
      "재생성 20회 / 월",
      "글당 약 3,000자",
      "FAQ·내부링크 자동",
      "재생성 어드온 ₩2,900 / 30회",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₩49,000",
    priceSuffix: "/월",
    tagline: "쉬는 동안에도 점수가 쌓입니다",
    highlight: true,
    badge: "곧 출시",
    icon: Sparkles,
    mode: "soon",
    features: [
      "블로그 허브 3개",
      "월 60편 + 일 2편 자동 발행",
      "♾ 재생성 무제한 (Fair Use)",
      "글당 약 5,000자",
      "자동 백링크 · OG · IndexNow",
      "발행 후에도 자유 재생성",
    ],
    footnote: "Fair Use: 분당 10회 / 일 100회 권장",
  },
  {
    id: "studio",
    name: "Studio",
    price: "₩199,000",
    priceSuffix: "/월",
    tagline: "에이전시 · 파워 유저용 프리미엄",
    icon: Crown,
    mode: "soon",
    features: [
      "블로그 허브 10개",
      "월 200편 + 일 7편 자동 발행",
      "Gemini 2.5 Pro 프리미엄 모델",
      "글당 약 8,000자 장문",
      "♾ 진짜 무제한 재생성",
      "우선순위 큐 · 전담 지원",
    ],
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const { openCheckout, loading } = usePaddleCheckout();
  const [betaOpen, setBetaOpen] = useState(false);

  const handlePaid = async (t: Tier) => {
    if (!user) {
      // 비로그인 → 로그인 후 동일 위치로 복귀해 결제 재시도
      window.location.href = `/auth?next=${encodeURIComponent(`/autoblog#pricing&plan=${t.id}`)}`;
      return;
    }
    if (!t.paddlePriceId) return;
    await openCheckout({
      priceId: t.paddlePriceId,
      customerEmail: user.email ?? undefined,
      customData: { userId: user.id, tier: t.id },
      successUrl: `${window.location.origin}/dashboard?checkout=success&plan=${t.id}`,
    });
  };

  return (
    <section id="pricing" className="py-12 md:py-24 px-4 md:px-6 bg-muted/30 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-14 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-4">
            요금제
          </span>
          <h2 className="text-[24px] leading-[1.3] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground break-keep">
            지금은 <span className="text-primary">Lite만 결제 가능</span>
          </h2>
          <p className="text-[15px] leading-[1.7] md:text-base md:leading-relaxed text-muted-foreground mt-4 break-keep">
            Pro·Studio는 베타 종료 후 정식 오픈 예정이에요. 베타 신청자에게는
            출시 시 <span className="text-foreground font-semibold">Pro 평생 50% 쿠폰</span>이 자동 발급됩니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-3 md:gap-4">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const isComingSoon = t.mode === "soon";
            return (
              <div
                key={t.name}
                className={`relative p-5 md:p-6 rounded-2xl border bg-card flex flex-col transition-opacity ${
                  t.highlight
                    ? "border-primary/60 shadow-lg ring-1 ring-primary/20"
                    : "border-border/50"
                } ${isComingSoon ? "opacity-90" : ""}`}
              >
                {t.badge && (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                      isComingSoon
                        ? "bg-muted text-muted-foreground border border-border"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {t.badge}
                  </span>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      t.highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <h3 className="text-lg font-bold text-foreground">{t.name}</h3>
                </div>

                <p className="text-[13px] text-muted-foreground mb-4 break-keep min-h-[2.5em]">
                  {t.tagline}
                </p>

                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    {t.price}
                  </span>
                  {t.priceSuffix && (
                    <span className="text-sm text-muted-foreground">{t.priceSuffix}</span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[14px] leading-[1.55] text-foreground/85 break-keep">
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          t.highlight ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {t.footnote && (
                  <p className="text-[11px] text-muted-foreground mb-3 break-keep">{t.footnote}</p>
                )}

                {isComingSoon ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full h-11 w-full justify-center gap-1.5"
                    onClick={() => setBetaOpen(true)}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    출시 알림 + 50% 쿠폰
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="rounded-full h-11 w-full justify-center"
                    onClick={() => handlePaid(t)}
                    disabled={loading}
                  >
                    {loading ? "결제창 여는 중…" : `${t.name} 결제하기`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-[12px] text-muted-foreground mt-8 break-keep">
          Lite 외 플랜은 베타 종료 후 순차 오픈됩니다. 베타 기간 중에는 초대받은 사용자에게 무료 액세스가 제공됩니다.
        </p>
      </div>

      <BetaSignupModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </section>
  );
}
