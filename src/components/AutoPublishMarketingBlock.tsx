import ValueProp from "@/features/publish/landing/ValueProp";
import HowItWorks from "@/features/publish/landing/HowItWorks";
import AudienceFit from "@/features/publish/landing/AudienceFit";
import ValueCards from "@/features/publish/landing/ValueCards";
import FinalCta from "@/features/publish/landing/FinalCta";
import { Sparkles } from "lucide-react";

/**
 * Additive marketing block shown on the home (/) page below the diagnostic UI.
 * Reuses the existing /dashboard landing sections so messaging stays consistent.
 * Does NOT modify the diagnostic flow above it.
 */
export default function AutoPublishMarketingBlock() {
  return (
    <section className="w-full bg-muted/20 border-t border-border/40 mt-20">
      <div className="max-w-3xl mx-auto px-4 pt-14 pb-2 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
          <Sparkles className="w-3 h-3" /> Autoblog · 진단 그다음 단계
        </span>
        <p className="text-xs md:text-sm text-muted-foreground mt-3">
          진단으로 끝내지 않고, 콘텐츠 운영까지 자동으로 이어가고 싶다면.
        </p>
      </div>

      <ValueProp />
      <HowItWorks />
      <AudienceFit />
      <ValueCards />
      <FinalCta />
    </section>
  );
}
