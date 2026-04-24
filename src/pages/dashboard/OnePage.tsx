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

type AccentTone = "primary" | "accent" | "warning" | "success" | "neutral";

type SectionMeta = {
  id: string;
  index: number;
  chip: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: AccentTone;
};

// 모든 섹션이 동일한 alpha 강도를 사용하도록 통일
// badge: bg /10, ring /20  ·  rail: from /35 → via /8 → to 0  ·  icon: full
const TONE_CLASSES: Record<AccentTone, { badge: string; icon: string; rail: string; chipDot: string }> = {
  primary: {
    badge: "bg-primary/10 text-primary ring-1 ring-primary/20",
    icon: "text-primary",
    rail: "bg-gradient-to-b from-primary/35 via-primary/8 to-transparent",
    chipDot: "bg-primary",
  },
  accent: {
    badge: "bg-accent/10 text-accent ring-1 ring-accent/20",
    icon: "text-accent",
    rail: "bg-gradient-to-b from-accent/35 via-accent/8 to-transparent",
    chipDot: "bg-accent",
  },
  warning: {
    badge: "bg-score-warning/10 text-score-warning ring-1 ring-score-warning/20",
    icon: "text-score-warning",
    rail: "bg-gradient-to-b from-score-warning/35 via-score-warning/8 to-transparent",
    chipDot: "bg-score-warning",
  },
  success: {
    badge: "bg-score-excellent/10 text-score-excellent ring-1 ring-score-excellent/20",
    icon: "text-score-excellent",
    rail: "bg-gradient-to-b from-score-excellent/35 via-score-excellent/8 to-transparent",
    chipDot: "bg-score-excellent",
  },
  neutral: {
    badge: "bg-muted text-muted-foreground ring-1 ring-border",
    icon: "text-muted-foreground",
    rail: "bg-gradient-to-b from-border via-border/40 to-transparent",
    chipDot: "bg-muted-foreground",
  },
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
  const tone = TONE_CLASSES[meta.tone];
  return (
    <section id={meta.id} className="scroll-mt-32">
      <div
        className={
          isFirst
            ? "mb-4 sm:mb-5"
            : "mt-7 sm:mt-10 mb-4 sm:mb-5 pt-7 sm:pt-10 border-t border-border/60"
        }
      >
        {/* 전 섹션 공통 타이포 스케일 — 절대 변경 금지
            chip 10/12 · index 11/none · title 18/26 · subtitle 13/20 */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-[11px] leading-none font-mono font-bold tabular-nums shrink-0 ${tone.badge}`}>
            {String(meta.index).padStart(2, "0")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] leading-[12px] font-bold uppercase tracking-[0.15em] text-muted-foreground min-w-0">
            <Icon className={`h-3.5 w-3.5 shrink-0 ${tone.icon}`} /> {meta.chip}
          </span>
        </div>
        <h2 className="text-[18px] leading-[26px] font-bold tracking-tight text-foreground break-keep mt-2 sm:mt-2.5">
          {meta.title}
        </h2>
        <p className="text-[13px] leading-[20px] text-muted-foreground mt-1 break-keep">
          {meta.subtitle}
        </p>
      </div>
      {/* 본문: 모바일은 들여쓰기를 줄여 카드 폭을 최대로 확보 (px-3 컨테이너에서 답답해지지 않게) */}
      <div className="relative pl-3 sm:pl-5">
        <span className={`pointer-events-none absolute left-0 top-0 bottom-0 w-[2px] rounded-full ${tone.rail}`} aria-hidden />
        {children}
      </div>
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
  tone: "primary",
};

const SECTIONS: SectionMeta[] = [
  {
    id: "recommendations",
    index: 2,
    chip: "Start Here",
    title: "URL · 주제 입력하고 추천 받기",
    subtitle: "사이트 URL은 자동으로 채워집니다. 관심 주제를 넣고, 마음에 안 드는 추천은 🎲 주사위로 다시 굴려보세요.",
    icon: Lightbulb,
    tone: "warning",
  },
  {
    id: "workflow",
    index: 3,
    chip: "Workflow",
    title: "콘텐츠 워크플로우",
    subtitle: "AI가 본문을 만들어 ‘발행 대기’에 쌓아둡니다. 시간을 정해 자동 발행하거나 즉시 발행하세요.",
    icon: KanbanSquare,
    tone: "accent",
  },
  {
    id: "archive",
    index: 4,
    chip: "Archive",
    title: "발행 아카이브",
    subtitle: "발행된 모든 글을 검색하고, 오래된 글은 보관해 칸반을 가볍게 유지하세요.",
    icon: Archive,
    tone: "neutral",
  },
  {
    id: "reports",
    index: 5,
    chip: "Reports",
    title: "성과 리포트",
    subtitle: "분석 점수 추이와 발행 현황을 시각화합니다.",
    icon: BarChart3,
    tone: "success",
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
