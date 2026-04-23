import { lazy, Suspense, useEffect, useState, useRef, ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Separator } from "@/components/ui/separator";
import { ArrowUp } from "lucide-react";

import DashboardIndex from "./Index";
const DashboardRecommendations = lazy(() => import("./Recommendations"));
const DashboardContent = lazy(() => import("./Content"));
const DashboardAutoPublish = lazy(() => import("./AutoPublish"));
const DashboardPosts = lazy(() => import("./Posts"));
const DashboardReports = lazy(() => import("./Reports"));

/**
 * 화면에 가까워지면 children을 마운트하는 lazy section 래퍼.
 * 전체 페이지를 한 번에 로드하지 않고 스크롤에 따라 점진적 마운트.
 */
function LazySection({
  id,
  chip,
  children,
  rootMargin = "300px",
}: {
  id: string;
  chip?: string;
  children: ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted || !ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [mounted, rootMargin]);

  return (
    <section
      id={id}
      ref={ref}
      className="scroll-mt-32 min-h-[120px]"
      data-section-chip={chip}
    >
      {mounted ? (
        <Suspense fallback={<div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />}>
          {children}
        </Suspense>
      ) : (
        <div className="h-32 rounded-2xl bg-muted/20" />
      )}
    </section>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="맨 위로"
      className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

/**
 * AutoBlog 운영 콘솔 — 라이브 데모처럼 위→아래로 스크롤되는 원페이지.
 * 사이드바 메뉴 = 같은 페이지 내 섹션 앵커.
 */
export default function DashboardOnePage() {
  return (
    <>
      <Helmet>
        <title>AutoBlog 작업 공간 | SearchTune OS</title>
        <meta
          name="description"
          content="콘텐츠 추천부터 발행, 성과 분석까지 한 페이지에서 흐름대로 관리합니다."
        />
      </Helmet>

      <div className="space-y-10">
        <section id="overview" className="scroll-mt-32">
          <DashboardIndex />
        </section>

        <Separator className="opacity-60" />

        <LazySection id="recommendations">
          <DashboardRecommendations />
        </LazySection>

        <Separator className="opacity-60" />

        <LazySection id="content">
          <DashboardContent />
        </LazySection>

        <Separator className="opacity-60" />

        <LazySection id="queue">
          <DashboardAutoPublish />
        </LazySection>

        <Separator className="opacity-60" />

        <LazySection id="posts">
          <DashboardPosts />
        </LazySection>

        <Separator className="opacity-60" />

        <LazySection id="reports">
          <DashboardReports />
        </LazySection>
      </div>

      <BackToTop />
    </>
  );
}
