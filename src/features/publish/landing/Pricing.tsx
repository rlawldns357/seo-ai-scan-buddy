import { Check, Sparkles, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type Tier = {
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  cta: string;
  ctaHref: string;
  ctaVariant?: "default" | "outline";
  highlight?: boolean;
  badge?: string;
  icon: typeof Sparkles;
  features: string[];
  footnote?: string;
};

const TIERS: Tier[] = [
  {
    name: "Lite",
    price: "₩4,900",
    priceSuffix: "/월",
    tagline: "혼자 운영하는 1인 브랜드용",
    cta: "Lite 시작하기",
    ctaHref: "/auth?next=/dashboard&plan=lite",
    ctaVariant: "outline",
    icon: Zap,
    features: [
      "브랜드 페이지 1개",
      "월 10편 발행",
      "재생성 20회 / 월",
      "글당 약 3,000자",
      "FAQ·내부링크 자동",
      "재생성 어드온 ₩2,900 / 30회",
    ],
  },
  {
    name: "Pro",
    price: "₩49,000",
    priceSuffix: "/월",
    tagline: "쉬는 동안에도 점수가 쌓입니다",
    cta: "Pro 시작하기",
    ctaHref: "/auth?next=/dashboard&plan=pro",
    highlight: true,
    badge: "가장 인기",
    icon: Sparkles,
    features: [
      "브랜드 페이지 3개",
      "월 60편 + 일 2편 자동 발행",
      "♾ 재생성 무제한 (Fair Use)",
      "글당 약 5,000자",
      "자동 백링크 · OG · IndexNow",
      "발행 후에도 자유 재생성",
    ],
    footnote: "Fair Use: 분당 10회 / 일 100회 권장",
  },
  {
    name: "Studio",
    price: "₩199,000",
    priceSuffix: "/월",
    tagline: "에이전시 · 파워 유저용 프리미엄",
    cta: "Studio 문의",
    ctaHref: "/auth?next=/dashboard&plan=studio",
    ctaVariant: "outline",
    icon: Crown,
    features: [
      "브랜드 페이지 10개",
      "월 200편 + 일 7편 자동 발행",
      "Gemini 2.5 Pro 프리미엄 모델",
      "글당 약 8,000자 장문",
      "♾ 진짜 무제한 재생성",
      "우선순위 큐 · 전담 지원",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-12 md:py-24 px-4 md:px-6 bg-muted/30 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-14 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-4">
            요금제
          </span>
          <h2 className="text-[24px] leading-[1.3] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground break-keep">
            필요한 만큼만, <span className="text-primary">단순한 3단계</span>
          </h2>
          <p className="text-[15px] leading-[1.7] md:text-base md:leading-relaxed text-muted-foreground mt-4 break-keep">
            모든 플랜은 SearchTune OS 도메인의 브랜드 페이지에 발행됩니다. 별도 블로그 운영 없이 바로 시작할 수 있습니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-3 md:gap-4">
          {TIERS.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.name}
                className={`relative p-5 md:p-6 rounded-2xl border bg-card flex flex-col ${
                  t.highlight
                    ? "border-primary/60 shadow-lg ring-1 ring-primary/20"
                    : "border-border/50"
                }`}
              >
                {t.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold whitespace-nowrap">
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

                <Link to={t.ctaHref} className="w-full">
                  <Button
                    size="lg"
                    variant={t.ctaVariant ?? "default"}
                    className="rounded-full h-11 w-full justify-center"
                  >
                    {t.cta}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[12px] text-muted-foreground mt-8 break-keep">
          베타 기간에는 초대받은 사용자에게 무료 액세스가 제공되며, 이후 Pro 평생 50% 쿠폰이 자동 발급됩니다.
        </p>
      </div>
    </section>
  );
}
