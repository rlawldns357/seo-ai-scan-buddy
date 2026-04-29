import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// 데모용 고정 샘플 점수 (실제 분석 결과의 평균적 패턴)
const SAMPLE = {
  url: "example-shop.co.kr",
  scores: { seo: 72, aeo: 45, geo: 38 },
  summary:
    "기본 SEO는 양호하지만 AI 검색(AEO·GEO) 노출 신호가 부족합니다. JSON-LD 구조화 데이터와 답변형 콘텐츠 보강이 시급합니다.",
};

function scoreColor(score: number) {
  if (score >= 75) return "text-score-excellent";
  if (score >= 50) return "text-score-warning";
  return "text-destructive";
}

function scoreRing(score: number) {
  if (score >= 75) return "ring-score-excellent/30 bg-score-excellent/5";
  if (score >= 50) return "ring-score-warning/30 bg-score-warning/5";
  return "ring-destructive/30 bg-destructive/5";
}

const AXES: Array<{ key: "seo" | "aeo" | "geo"; label: string; desc: string }> = [
  { key: "geo", label: "GEO", desc: "AI 검색 노출" },
  { key: "aeo", label: "AEO", desc: "답변 엔진 최적화" },
  { key: "seo", label: "SEO", desc: "검색 엔진 노출" },
];

export default function BlogScanDemo() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return;
    setLoading(true);
    try {
      await supabase.from("email_leads").insert({ email, source: "blog_demo" });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-12 rounded-2xl border border-border bg-card p-5 md:p-8 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          무료 SEO · AEO · GEO 진단 데모
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-foreground">
            내 사이트는 AI 검색에 얼마나 노출될까?
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            샘플 결과: <span className="font-mono text-foreground">{SAMPLE.url}</span>
          </p>
        </div>
      </div>

      {/* 점수 카드 3개 — 가장 낮은 점수(GEO) 우선 노출 */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5">
        {AXES.map((axis) => {
          const score = SAMPLE.scores[axis.key];
          return (
            <div
              key={axis.key}
              className={`rounded-xl ring-1 p-3 md:p-5 text-center ${scoreRing(score)}`}
            >
              <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {axis.label}
              </div>
              <div className={`text-3xl md:text-5xl font-extrabold mt-1 ${scoreColor(score)}`}>
                {score}
              </div>
              <div className="text-[10px] md:text-xs text-muted-foreground mt-1 hidden sm:block">
                {axis.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* 요약 */}
      <div className="rounded-xl bg-muted/40 p-4 mb-5 border border-border/50">
        <p className="text-sm text-foreground leading-relaxed">{SAMPLE.summary}</p>
      </div>

      {/* 이메일 폼 + CTA */}
      {!submitted ? (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력하면 신규 가이드를 받아볼 수 있어요"
            className="flex-1 h-11 px-4 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-11 px-5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "전송 중..." : "구독하기"}
          </button>
          <Link
            to="/"
            className="h-11 px-5 rounded-full border border-primary text-primary font-bold text-sm flex items-center justify-center gap-1 hover:bg-primary/5 transition"
          >
            내 사이트 분석 <ArrowRight className="w-4 h-4" />
          </Link>
        </form>
      ) : (
        <div className="flex items-center gap-2 text-sm text-score-excellent font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          구독 완료! 신규 가이드가 이메일로 발송됩니다.
          <Link to="/" className="ml-2 underline text-primary">
            지금 내 사이트 분석하기 →
          </Link>
        </div>
      )}
    </section>
  );
}
