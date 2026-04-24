import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react";

import Navbar from "@/components/Navbar";
import ResultHeader from "@/components/ResultHeader";
import ScoreDashboard from "@/components/ScoreDashboard";
import VerificationLinks from "@/components/VerificationLinks";
import FunnelCTAs from "@/components/FunnelCTAs";
import FaqSection from "@/components/FaqSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

import { analyzeSite } from "@/lib/analyze";
import { validateUrl } from "@/lib/urlValidation";
import type { DemoResult } from "@/data/demoResults";

/**
 * SearchTune OS — 사이트 진단 메인.
 * URL 입력 → analyze-site Edge Function → SEO/AEO/GEO 3축 결과.
 * AutoBlog 운영 콘솔은 상단 CTA(/dashboard, /autoblog)로 분리 진입.
 */
const Index = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [analyzedUrl, setAnalyzedUrl] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const v = validateUrl(input);
    if (!v.isValid) {
      toast({ title: "URL을 확인해 주세요", description: v.errorMessage, variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await analyzeSite(v.finalUrl);
      if (error || !data) {
        toast({
          title: "분석 실패",
          description: error?.message ?? "잠시 후 다시 시도해 주세요.",
          variant: "destructive",
        });
        return;
      }
      setResult(data);
      setAnalyzedUrl(v.finalUrl);
      // 결과 영역으로 스크롤
      setTimeout(() => {
        document.getElementById("analysis-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Helmet>
        <title>SearchTune OS — 무료 SEO·AEO·GEO 사이트 진단</title>
        <meta
          name="description"
          content="URL을 입력하면 검색엔진(SEO)·답변엔진(AEO)·생성형 AI(GEO) 3축으로 사이트를 즉시 진단합니다."
        />
      </Helmet>

      <Navbar />

      <main className="flex-1 px-2 sm:px-4 py-8 sm:py-12 pb-24">
        {/* ───── Hero + URL 입력 ───── */}
        <section className="max-w-2xl mx-auto text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            SearchTune OS · 무료 사이트 진단
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl text-foreground leading-snug sm:leading-[1.4] mb-5 tracking-tight">
            <span className="font-light">검색엔진과 AI가</span>{" "}
            <span className="font-extrabold">우리 사이트를 어떻게 보는지</span>
            <br className="hidden sm:block" />
            <span className="font-light">30초 만에 확인하세요</span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg mb-8 leading-relaxed">
            SEO(검색 노출) · AEO(답변 채택) · GEO(AI 인용) 3축으로 채점합니다.
          </p>

          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 mb-3">
            <Input
              type="url"
              inputMode="url"
              placeholder="https://example.com"
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/\s+/g, ""))}
              disabled={loading}
              className="h-14 text-base flex-1 rounded-full px-5"
              aria-label="분석할 사이트 URL"
            />
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="h-14 px-6 rounded-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  분석 중…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  무료로 분석하기
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            평균 30~60초 소요 · 결과는 즉시 제공됩니다
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <Link to="/autoblog" className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
              AutoBlog 자동 발행 알아보기
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline">
              운영 콘솔 열기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </section>

        {/* ───── 결과 ───── */}
        {result && (
          <section
            id="analysis-result"
            className="max-w-4xl mx-auto mt-12 space-y-5 animate-fade-up scroll-mt-16"
          >
            <ResultHeader psi={null} psiError={null} url={analyzedUrl} result={result} />
            <ScoreDashboard result={result} url={analyzedUrl} />
            <VerificationLinks url={analyzedUrl} />
            <FunnelCTAs result={result} url={analyzedUrl} />
            <FaqSection expanded />
            <div className="h-16" />
          </section>
        )}

        {/* ───── 빈 상태(피처 카드) ───── */}
        {!result && !loading && (
          <section className="max-w-4xl mx-auto mt-14 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FeatureCard title="SEO" body="검색엔진이 우리 사이트를 얼마나 잘 인식·노출하는지 채점합니다." />
            <FeatureCard title="AEO" body="구글 SGE·네이버 AI 답변에서 인용될 준비가 됐는지 확인합니다." />
            <FeatureCard title="GEO" body="ChatGPT·Perplexity 등 생성형 AI가 인용할 수 있는 구조인지 분석합니다." />
          </section>
        )}
      </main>
    </div>
  );
};

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4 text-left">
      <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
    </div>
  );
}

export default Index;
