import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import {
  Lightbulb,
  KanbanSquare,
  Send,
  Plus,
  Sparkles,
  Clock3,
  ArrowRight,
  Zap,
  ZapOff,
  CheckCircle2,
  Circle,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/useAuth";
import { useUserSite } from "@/features/publish/useUserSite";
import { useAutopublishSettings } from "@/features/publish/useAutopublishSettings";
import { supabase } from "@/integrations/supabase/client";
import WorkspaceHeader from "@/features/publish/WorkspaceHeader";
import DashboardHero from "@/features/publish/DashboardHero";
import DashboardIndex from "./Index";

type PostLite = {
  id: string;
  title: string;
  status: string;
  source_axis: string | null;
  published_at: string | null;
  created_at: string;
};

const AXIS_TONE: Record<string, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-warning/10 text-score-warning",
};

/**
 * /dashboard 홈 — 위젯형 운영 피드.
 *
 * - 비로그인/사이트 미연결: 기존 DashboardIndex(온보딩) 그대로 위임
 * - 사이트 연결됨: 위젯 4개로 구성
 *   1) 다음 액션 카드 (CTA)
 *   2) 발행 대기 미리보기 (3건)
 *   3) 자동발행 상태 카드
 *   4) 시작 체크리스트 (큐/발행 1건/자동발행 ON)
 */
export default function DashboardHome() {
  const { user } = useAuth();
  const { site, loading } = useUserSite();
  const navigate = useNavigate();

  // 온보딩/게스트 분기는 기존 DashboardIndex가 담당
  if (loading) {
    return <div className="text-sm text-muted-foreground">불러오는 중…</div>;
  }
  if (!user || !site) {
    return <DashboardIndex />;
  }

  return (
    <>
      <Helmet>
        <title>대시보드 | AutoBlog</title>
      </Helmet>
      <WorkspaceHeader />
      <ConnectedHome siteId={site.id} />
    </>
  );
}

function ConnectedHome({ siteId }: { siteId: string }) {
  const [posts, setPosts] = useState<PostLite[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const { settings, loading: apLoading } = useAutopublishSettings(siteId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPosts(true);
      const { data } = await (supabase as any)
        .from("site_posts")
        .select("id, title, status, source_axis, published_at, created_at")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) {
        setPosts((data ?? []) as PostLite[]);
        setLoadingPosts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const queued = useMemo(() => posts.filter((p) => p.status === "scheduled"), [posts]);
  const published = useMemo(() => posts.filter((p) => p.status === "published"), [posts]);
  const autoOn = settings?.enabled ?? false;

  const checklist = [
    { done: queued.length > 0 || published.length > 0, label: "첫 추천을 큐에 추가", to: "/dashboard/recommendations" },
    { done: published.length > 0, label: "글 1건 발행", to: "/dashboard/workflow" },
    { done: autoOn, label: "자동 발행 켜기", to: "/dashboard/workflow" },
  ];
  const allDone = checklist.every((c) => c.done);

  return (
    <div className="space-y-4">
      {/* 1) Next action — primary CTA */}
      <NextActionCard queuedCount={queued.length} />

      {/* 2-3) 큐 미리보기 + 자동발행 상태 (2열) */}
      <div className="grid gap-4 md:grid-cols-2">
        <QueuePreviewCard queued={queued} loading={loadingPosts} />
        <AutopublishCard
          loading={apLoading}
          enabled={autoOn}
          weekdays={settings?.weekdays ?? []}
          hours={settings?.hours_kst ?? []}
          dailyLimit={settings?.daily_limit ?? 0}
        />
      </div>

      {/* 4) 시작 체크리스트 (모든 항목 완료되면 숨김) */}
      {!allDone && <ChecklistCard items={checklist} />}
    </div>
  );
}

function NextActionCard({ queuedCount }: { queuedCount: number }) {
  const hasQueue = queuedCount > 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/[0.06] via-card to-accent/[0.06] px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
      <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <div className="relative min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Next</p>
        <h2 className="text-base font-semibold text-foreground mt-0.5">
          {hasQueue ? `대기 중인 ${queuedCount}건 검토하고 발행하기` : "콘텐츠 큐에 새 글 추가하기"}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {hasQueue
            ? "자동 발행 페이지에서 카드를 드래그해 발행할 수 있어요."
            : "추천 주제에서 고르거나 직접 주제를 입력해 시작하세요."}
        </p>
      </div>
      <Button asChild className="relative rounded-full shrink-0">
        <Link to={hasQueue ? "/dashboard/workflow" : "/dashboard/recommendations"}>
          {hasQueue ? (
            <>
              <Send className="w-4 h-4" /> 자동 발행 열기
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> 추천 보기
            </>
          )}
        </Link>
      </Button>
    </div>
  );
}

function QueuePreviewCard({ queued, loading }: { queued: PostLite[]; loading: boolean }) {
  const top = queued.slice(0, 3);
  return (
    <Card className="p-4 rounded-2xl border-border/60 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <KanbanSquare className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">발행 대기</h3>
          {queued.length > 0 && (
            <span className="text-[11px] font-mono font-bold text-accent tabular-nums">
              {queued.length}
            </span>
          )}
        </div>
        <Link
          to="/dashboard/workflow"
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
        >
          전체 보기 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <EmptyMini
          icon={Lightbulb}
          message="아직 큐에 글이 없어요"
          ctaLabel="추천에서 고르기"
          to="/dashboard/recommendations"
        />
      ) : (
        <ul className="space-y-1.5">
          {top.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition">
              {p.source_axis && (
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${AXIS_TONE[p.source_axis] ?? "bg-muted text-muted-foreground"}`}>
                  {p.source_axis}
                </span>
              )}
              <span className="text-[13px] text-foreground line-clamp-1 flex-1 break-keep">{p.title}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const KOR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function AutopublishCard({
  loading,
  enabled,
  weekdays,
  hours,
  dailyLimit,
}: {
  loading: boolean;
  enabled: boolean;
  weekdays: number[];
  hours: number[];
  dailyLimit: number;
}) {
  return (
    <Card className="p-4 rounded-2xl border-border/60 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {enabled ? (
            <Zap className="w-4 h-4 text-score-excellent" />
          ) : (
            <ZapOff className="w-4 h-4 text-muted-foreground" />
          )}
          <h3 className="text-sm font-semibold text-foreground">자동 발행</h3>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              enabled
                ? "bg-score-excellent/10 text-score-excellent"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {enabled ? "ON" : "OFF"}
          </span>
        </div>
        <Link
          to="/dashboard/workflow"
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
        >
          설정 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="h-16 rounded-lg bg-muted/30 animate-pulse" />
      ) : enabled ? (
        <div className="space-y-1.5 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock3 className="w-3 h-3" />
            <span>
              {weekdays.length > 0 ? weekdays.map((d) => KOR_DAYS[d]).join("·") : "요일 미설정"}
              {" · "}
              {hours.length > 0 ? hours.map((h) => `${h}시`).join("·") : "시간 미설정"}
            </span>
          </div>
          <div>
            일일 최대{" "}
            <span className="font-semibold text-foreground tabular-nums">{dailyLimit}건</span>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          자동 발행이 꺼져 있어요. 자동 발행에서 ⚡ 버튼으로 요일·시간을 설정하면 큐가 자동으로
          발행됩니다.
        </p>
      )}
    </Card>
  );
}

function ChecklistCard({
  items,
}: {
  items: { done: boolean; label: string; to: string }[];
}) {
  const doneCount = items.filter((i) => i.done).length;
  return (
    <Card className="p-4 rounded-2xl border-border/60 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">시작 체크리스트</h3>
        </div>
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
          {doneCount}/{items.length}
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              to={it.to}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg transition ${
                it.done ? "text-muted-foreground" : "hover:bg-muted/40 text-foreground"
              }`}
            >
              {it.done ? (
                <CheckCircle2 className="w-4 h-4 text-score-excellent shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              )}
              <span className={`text-[13px] flex-1 ${it.done ? "line-through" : ""}`}>{it.label}</span>
              {!it.done && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function EmptyMini({
  icon: Icon,
  message,
  ctaLabel,
  to,
}: {
  icon: typeof Sparkles;
  message: string;
  ctaLabel: string;
  to: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-4">
      <Icon className="w-6 h-6 text-muted-foreground/60 mb-2" />
      <p className="text-[12px] text-muted-foreground mb-2">{message}</p>
      <Button asChild size="sm" variant="outline" className="rounded-full h-7 text-xs">
        <Link to={to}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
