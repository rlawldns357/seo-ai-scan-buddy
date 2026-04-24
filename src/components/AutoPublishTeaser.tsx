import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  CalendarClock,
  CheckCircle2,
  Tag,
  Sparkles,
} from "lucide-react";
import BetaSignupModal from "@/components/BetaSignupModal";
import { trackEvent } from "@/lib/analytics";

/**
 * Home-screen "new product launch" teaser for AutoBlog.
 * Acquire.com-inspired: deep navy full-bleed surface, generous whitespace,
 * a small product mockup on the right that signals what the product actually does.
 *
 * Primary CTA opens the closed-beta application modal which surfaces the
 * lifetime Pro 50% promo (mem://strategy/autoblog-bm-tiers).
 */
export default function AutoPublishTeaser() {
  const [betaOpen, setBetaOpen] = useState(false);

  const openBeta = () => {
    trackEvent("autoblog_beta_modal_open", { source: "home_teaser" });
    setBetaOpen(true);
  };

  return (
    <section className="mt-16 max-w-2xl mx-auto text-left">
      <div className="relative overflow-hidden rounded-3xl bg-[hsl(232_47%_14%)] text-white px-6 sm:px-10 py-10 sm:py-12 shadow-xl">
        {/* subtle decorative glow */}
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative grid sm:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          {/* LEFT — copy */}
          <div>
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-extrabold tracking-[0.18em] uppercase ring-1 ring-white/15">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                New · AutoBlog
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-extrabold tracking-wider uppercase shadow-md">
                <Tag className="w-3 h-3" /> 평생 50% 쿠폰
              </span>
            </div>

            <h2 className="text-3xl sm:text-[2.4rem] font-extrabold leading-[1.1] tracking-tight">
              매일 글 안 써도<br />
              <span className="text-white/70">검색·AI에 노출되는 콘텐츠가</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                알아서 쌓입니다
              </span>
            </h2>

            <p className="text-sm sm:text-[15px] text-white/70 mt-4 leading-relaxed break-keep">
              브랜드 주제 한 줄만 입력하면, AutoBlog가{" "}
              <span className="text-white font-semibold">SEO·AEO·GEO 3축</span>으로
              최적화된 글을 생성하고{" "}
              <span className="text-white font-semibold">자동 예약·발행</span>까지
              해줍니다. 스키마, 내부 링크, FAQ까지 같이 셋업돼서 검색엔진과 AI가
              인용하기 좋은 형태로 운영돼요.
            </p>

            {/* feature bullets */}
            <ul className="mt-4 space-y-1.5">
              {[
                "주제 한 줄 → 30편 콘텐츠 큐 자동 보충",
                "예약 시간에 맞춰 자동 발행 (KST)",
                "발행 후 자동 채점으로 품질 모니터링",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-center gap-2 text-[13px] text-white/80"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                  {line}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={openBeta}
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-white text-[hsl(232_47%_14%)] text-sm font-extrabold hover:bg-white/90 transition-colors shadow-md"
              >
                <Sparkles className="w-4 h-4" /> 베타 신청하기{" "}
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/autoblog"
                className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-transparent text-white text-sm font-bold ring-1 ring-white/25 hover:bg-white/5 transition-colors"
              >
                자세히 보기
              </Link>
            </div>

            <p className="text-[11px] text-white/50 mt-3">
              초대받은 사용자 무료 · 정식 출시 시 Pro 평생 50% 자동 적용
            </p>
          </div>

          {/* RIGHT — mini product mockup */}
          <div className="hidden sm:block relative">
            <div className="relative rounded-2xl bg-white/[0.06] backdrop-blur-md ring-1 ring-white/10 p-3.5 shadow-2xl">
              <div className="flex items-center gap-1.5 mb-3 px-1">
                <span className="w-2 h-2 rounded-full bg-white/20" />
                <span className="w-2 h-2 rounded-full bg-white/20" />
                <span className="w-2 h-2 rounded-full bg-white/20" />
                <span className="ml-auto text-[10px] font-bold text-white/50 tracking-wider uppercase">
                  AutoBlog
                </span>
              </div>

              <div className="space-y-2">
                {/* Published */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-accent/20 text-accent shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white truncate">
                      가을 신상품 코디 가이드
                    </div>
                    <div className="text-[10px] text-white/50">발행됨 · 2시간 전</div>
                  </div>
                </div>
                {/* Scheduled */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/25 text-primary-foreground shrink-0">
                    <CalendarClock className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white truncate">
                      주말 세일 안내
                    </div>
                    <div className="text-[10px] text-white/50">예약 · 토 09:00</div>
                  </div>
                </div>
                {/* Draft */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/5">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 text-white/70 shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white truncate">
                      리뷰 베스트 5 큐레이션
                    </div>
                    <div className="text-[10px] text-white/50">초안 준비됨</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between px-1">
                <span className="text-[10px] text-white/50">큐 자동 보충</span>
                <span className="text-[10px] font-bold text-accent">+27편 대기</span>
              </div>
            </div>

            {/* floating little badge */}
            <div className="absolute -top-3 -right-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-extrabold tracking-wider uppercase shadow-lg ring-2 ring-[hsl(232_47%_14%)]">
              Live
            </div>
          </div>
        </div>
      </div>

      <BetaSignupModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </section>
  );
}
