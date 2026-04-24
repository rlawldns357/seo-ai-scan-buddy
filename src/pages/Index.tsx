import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Sparkles, LayoutDashboard, Rocket } from "lucide-react";

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";

/**
 * AutoBlog 관리자 진입형 메인 엔트리.
 *
 * - 분석 서비스용 URL 입력/CTA/이메일 퍼널/FAQ 제거
 * - sessionStorage / @ alias 유틸 / 누락 import 제거
 * - 로그인 사용자는 곧바로 /dashboard 로 이동
 * - 비로그인 사용자는 /autoblog 마케팅 랜딩 또는 /auth 로 유도
 */
const Index = () => {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Helmet>
        <title>AutoBlog — 자동 발행 콘텐츠 운영 콘솔 | SearchTune OS</title>
        <meta
          name="description"
          content="검색엔진과 AI 답변 엔진이 인용하는 콘텐츠를 자동 설계·예약·발행하는 AutoBlog 운영 콘솔."
        />
      </Helmet>

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-8">
            <Sparkles className="w-4 h-4" />
            AutoBlog 콘텐츠 운영 콘솔
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl text-foreground leading-snug sm:leading-[1.4] mb-6 tracking-tight">
            <span className="font-light">검색엔진과 AI가</span>{" "}
            <span className="font-extrabold">우리 브랜드를 인용</span>
            <span className="font-light">하게 만드는</span>
            <br className="hidden sm:block" />
            <span className="font-extrabold">자동 콘텐츠 큐</span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg mb-10 leading-relaxed">
            SEO·AEO·GEO 3축으로 글을 자동 설계하고 구조화된 형태로 예약·발행합니다.
            <br className="hidden sm:block" />
            대시보드에서 큐를 채우고, 발행 일정을 켜두기만 하세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            {loading ? (
              <Button size="lg" className="rounded-full h-12 px-8" disabled>
                불러오는 중…
              </Button>
            ) : user ? (
              <Button asChild size="lg" className="rounded-full h-12 px-8">
                <Link to="/dashboard">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  대시보드 열기
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="rounded-full h-12 px-8">
                  <Link to="/auth">
                    <Rocket className="w-4 h-4 mr-2" />
                    무료로 시작하기
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full h-12 px-8">
                  <Link to="/autoblog">
                    제품 자세히 보기
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-12 text-left">
            <FeatureCard
              title="콘텐츠 큐"
              body="추천 토픽을 한 번에 큐에 적재하고 AI가 본문을 생성합니다."
            />
            <FeatureCard
              title="자동 발행"
              body="요일·시간·일일 캡을 정해두면 KST 기준으로 자동 발행됩니다."
            />
            <FeatureCard
              title="3축 채점"
              body="발행 전후 SEO·AEO·GEO 신호 기반으로 자동 채점합니다."
            />
          </div>
        </div>
      </main>
    </div>
  );
};

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="text-sm font-semibold text-foreground mb-1">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
    </div>
  );
}

export default Index;
