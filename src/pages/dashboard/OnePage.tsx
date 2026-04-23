import { lazy, Suspense, useEffect, useState, useRef, ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowUp, LayoutDashboard, Lightbulb, FileText, Send, BookOpen, BarChart3 } from "lucide-react";
import { LucideIcon } from "lucide-react";

import DashboardIndex from "./Index";
const DashboardRecommendations = lazy(() => import("./Recommendations"));
const DashboardContent = lazy(() => import("./Content"));
const DashboardAutoPublish = lazy(() => import("./AutoPublish"));
const DashboardPosts = lazy(() => import("./Posts"));
const DashboardReports = lazy(() => import("./Reports"));

type SectionMeta = {
  id: string;
  index: number;
  chip: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

function SectionShell({
  meta,
  children,
  isFirst = false,
}: {
  meta: SectionMeta;
  children: ReactNode;
  isFirst?: boolean;
}) {
  const Icon = meta.icon;
  return (
    <section id={meta.id} className="scroll-mt-32">
      {/* 큰 섹션 헤더: 번호 + 아이콘 + 제목, 미니멀하지만 명확한 구분선 */}
      <div className={isFirst ? "mb-8" : "border-t border-border/60 pt-12 mt-12 mb-8"}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono font-bold text-muted-foreground tabular-nums">
            {String(meta.index).padStart(2, "0")}
          </span>
          <span className="h-px flex-1 bg-border/60" />
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            {meta.chip}
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground break-keep">
          {meta.title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 break-keep">
          {meta.subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}

function LazyMount({ children, rootMargin = "400px" }: { children: ReactNode; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
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
    <div ref={ref} className="min-h-[120px]">
      {mounted ? (
        <Suspense fallback={<div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />}>
          {children}
        </Suspense>
      ) : (
        <div className="h-32 rounded-2xl bg-muted/20" />
      )}
    </div>
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

const OVERVIEW: SectionMeta = {
  id: "overview",
  index: 1,
  chip: "Overview",
  title: "오늘의 운영 현황",
  subtitle: "발행 대기와 발행된 글 수, 누적 성과를 한눈에 확인하세요.",
  icon: LayoutDashboard,
};

const SECTIONS: SectionMeta[] = [
  {
    id: "recommendations",
    index: 2,
    chip: "Ideas",
    title: "추천 주제",
    subtitle: "분석 결과를 바탕으로 SEO·AEO·GEO 약점을 보강할 주제를 추천합니다.",
    icon: Lightbulb,
  },
  {
    id: "content",
    index: 3,
    chip: "Draft",
    title: "글 작성",
    subtitle: "주제만 입력하면 AI가 검색·답변·인용에 최적화된 초안을 생성합니다.",
    icon: FileText,
  },
  {
    id: "queue",
    index: 4,
    chip: "Queue",
    title: "발행 큐",
    subtitle: "대기 중인 글을 검토하고 즉시 발행하거나 큐에서 제외할 수 있습니다.",
    icon: Send,
  },
  {
    id: "posts",
    index: 5,
    chip: "Live",
    title: "발행된 글",
    subtitle: "라이브 사이트에 노출 중인 글을 확인하고 관리합니다.",
    icon: BookOpen,
  },
  {
    id: "reports",
    index: 6,
    chip: "Reports",
    title: "성과 리포트",
    subtitle: "분석 점수 추이와 발행 현황을 시각화합니다.",
    icon: BarChart3,
  },
];

/**
 * AutoBlog 운영 콘솔 — 라이브 데모처럼 위→아래로 흐르는 원페이지.
 * 사이드바 메뉴 = 같은 페이지 내 섹션 앵커.
 * 각 섹션은 번호·아이콘·구분선으로 명확하게 분리.
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

      <div>
        <SectionShell meta={OVERVIEW} isFirst>
          <DashboardIndex />
        </SectionShell>

        {SECTIONS.map((meta) => (
          <SectionShell key={meta.id} meta={meta}>
            <LazyMount>
              {meta.id === "recommendations" && <DashboardRecommendations />}
              {meta.id === "content" && <DashboardContent />}
              {meta.id === "queue" && <DashboardAutoPublish />}
              {meta.id === "posts" && <DashboardPosts />}
              {meta.id === "reports" && <DashboardReports />}
            </LazyMount>
          </SectionShell>
        ))}
      </div>

      <BackToTop />
    </>
  );
}
