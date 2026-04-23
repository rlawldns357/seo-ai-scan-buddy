import { lazy, Suspense, useEffect, useState, useRef, ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowUp, LayoutDashboard, Lightbulb, KanbanSquare, BarChart3, Archive } from "lucide-react";
import { LucideIcon } from "lucide-react";

import DashboardIndex from "./Index";
import WorkspaceHeader from "@/features/publish/WorkspaceHeader";
const DashboardRecommendations = lazy(() => import("./Recommendations"));
const KanbanBoard = lazy(() => import("@/features/publish/kanban/KanbanBoard"));
const ArchiveSection = lazy(() => import("@/features/publish/ArchiveSection"));
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
      {/* 플랫 섹션 헤더: 번호·아이콘·타이틀 한 줄 + 보조 설명 */}
      <div className={isFirst ? "mb-5" : "mt-10 mb-5"}>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-mono font-semibold text-muted-foreground tabular-nums">
            {String(meta.index).padStart(2, "0")}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground break-keep">
            {meta.title}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-[1.6rem] break-keep">
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
    chip: "Start Here",
    title: "URL · 주제 입력하고 추천 받기",
    subtitle: "사이트 URL은 자동으로 채워집니다. 관심 주제를 넣고, 마음에 안 드는 추천은 🎲 주사위로 다시 굴려보세요.",
    icon: Lightbulb,
  },
  {
    id: "workflow",
    index: 3,
    chip: "Workflow",
    title: "콘텐츠 워크플로우",
    subtitle: "아이디어 → 초안 → 발행 대기 → 발행됨. 카드를 다음 칸으로 드래그하면 상태가 바뀝니다.",
    icon: KanbanSquare,
  },
  {
    id: "archive",
    index: 4,
    chip: "Archive",
    title: "발행 아카이브",
    subtitle: "발행된 모든 글을 검색하고, 오래된 글은 보관해 칸반을 가볍게 유지하세요.",
    icon: Archive,
  },
  {
    id: "reports",
    index: 5,
    chip: "Reports",
    title: "성과 리포트",
    subtitle: "분석 점수 추이와 발행 현황을 시각화합니다.",
    icon: BarChart3,
  },
];

/**
 * AutoBlog 운영 콘솔 — 위→아래로 흐르는 원페이지.
 * 콘텐츠 운영은 한 화면 칸반 보드에서 드래그로 처리.
 */
export default function DashboardOnePage() {
  return (
    <>
      <Helmet>
        <title>AutoBlog 작업 공간 | SearchTune OS</title>
        <meta
          name="description"
          content="추천부터 발행까지 한 화면 칸반에서 드래그로 관리합니다."
        />
      </Helmet>

      <div>
        <WorkspaceHeader />

        <SectionShell meta={OVERVIEW} isFirst>
          <DashboardIndex />
        </SectionShell>

        {SECTIONS.map((meta) => (
          <SectionShell key={meta.id} meta={meta}>
            <LazyMount>
              {meta.id === "recommendations" && <DashboardRecommendations />}
              {meta.id === "workflow" && <KanbanBoard />}
              {meta.id === "archive" && <ArchiveSection />}
              {meta.id === "reports" && <DashboardReports />}
            </LazyMount>
          </SectionShell>
        ))}
      </div>

      <BackToTop />
    </>
  );
}
