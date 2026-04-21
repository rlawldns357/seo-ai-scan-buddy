import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Sparkles, Search, MessageSquareQuote, Quote } from "lucide-react";

export default function Hero() {
  return (
    <section className="py-20 md:py-32 px-2 md:px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-4">
            <Sparkles className="w-3 h-3" /> NEW · AutoBlog 베타 오픈
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight break-keep">
            검색엔진과 AI가 더 잘 이해하는{" "}
            <span className="text-primary">콘텐츠 운영</span>을 시작하세요
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-5 leading-relaxed break-keep">
            주제만 입력하면 Google·Naver가 읽기 좋은 구조와 ChatGPT·Perplexity가 인용하기 좋은
            형태로 글이 자동 발행됩니다. 매번 SEO·AEO·GEO를 따로 점검하지 않아도 됩니다.
          </p>

          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { icon: Search, label: "SEO", desc: "Google·Naver 노출" },
              { icon: MessageSquareQuote, label: "AEO", desc: "답변 박스 채택" },
              { icon: Quote, label: "GEO", desc: "ChatGPT·Perplexity 인용" },
            ].map(({ icon: Icon, label, desc }) => (
              <li
                key={label}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-border/50 bg-card"
              >
                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-foreground">{label}</span>
                  <span className="block text-[10px] text-muted-foreground break-keep">{desc}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/auth?next=/dashboard">
              <Button size="lg" className="rounded-full h-12 px-6 gap-2">
                페이지 만들기 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="outline" className="rounded-full h-12 px-6">
                작동 방식 보기
              </Button>
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-transparent blur-2xl rounded-3xl" aria-hidden />
          <div className="relative space-y-3">
            {[
              { title: "AI 답변에 인용되는 FAQ 콘텐츠 — 2026 가이드", tag: "AEO", time: "방금 발행됨" },
              { title: "ChatGPT·Perplexity가 우리 브랜드를 인용하게 하는 법", tag: "GEO", time: "오늘 오전" },
              { title: "구조화 데이터로 검색 노출 끌어올리기", tag: "SEO", time: "어제" },
            ].map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow md:[&]:translate-x-[var(--tx)]"
                style={{ ["--tx" as never]: `${i * 8}px` }}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {p.tag}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{p.time}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-2 break-keep">{p.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
