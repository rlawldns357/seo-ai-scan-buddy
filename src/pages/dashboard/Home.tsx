import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
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

const STOCK_TARGET = 30;

const AXIS_TONE: Record<string, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-warning/10 text-score-warning",
};

/**
 * /dashboard 홈 — 위젯형 운영 피드.
 *
 * - 비로그인/사이트 미연결: 기존 DashboardIndex(온보딩) 그대로 위임
 * - 사이트 연결됨: 위젯 카드들로 구성
 *   1) 다음 액션 카드 (CTA)
 *   2) 블로그 재고 현황
 *   3) 발행 대기 미리보기 + 자동발행 상태 (2열)
 *   4) 시작 체크리스트 (큐/발행 1건/자동발행 ON)
 */
export default function DashboardHome() {
  const { user } = useAuth();
  const { site, loading } = useUserSite();

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }
  if (!user || !site) {
    return <DashboardIndex />;
  }

  return (
    <>
      <Helmet>
        <title>대시보드 · SearchTune OS</title>
      </Helmet>
      <WorkspaceHeader />
      <DashboardHero stage="ready" siteTitle={site.title} siteHref={site.site_url} />
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
  const stockIdeas = useMemo(() => posts.filter((p) => p.status === "idea"), [posts]);
  const autoOn = settings?.enabled ?? false;

  const checklist = [
    {
      done: queued.length > 0 || published.length > 0,
      label: "첫 추천을 큐에 추가",
      to: "/dashboard#recommendations",
    },
    { done: published.length > 0, label: "글 1건 발행", to: "/dashboard#workflow" },
    { done: autoOn, label: "자동 발행 켜기", to: "/dashboard#workflow" },
  ];
  const allDone = checklist.every((c) => c.done);

  return (
    <div className="space-y-4">
      <NextActionCard queuedCount={queued.length} />
      <StockStatusCard
        loading={loadingPosts}
        stockCount={stockIdeas.length}
        target={STOCK_TARGET}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QueuePreviewCard queued={queued} loading={loadingPosts} />
        <AutopublishCard
          loading={apLoading}
          enabled={autoOn}
          weekdays={settings?.weekdays ?? []}
          hours={settings?.hours_kst ?? []}
          dailyLimit={settings?.daily_limit ?? 1}
        />
      </div>
      {!allDone && <ChecklistCard items={checklist} />}
    </div>
  );
}

function NextActionCard({ queuedCount }: { queuedCount: number }) {
  const hasQueue = queuedCount > 0;
  return (
    <Card className="p-5 border-primary/20 bg-primary/[0.03] flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-primary mb-1">NEXT</p>
        <h3 className="text-base font-semibold">
          {hasQueue
            ? `대기 중인 ${queuedCount}건 검토하고 발행하기`
            : "콘텐츠 큐에 새 글 추가하기"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {hasQueue
            ? "자동 발행 페이지에서 카드를 드래그해 발행할 수 있어요."
            : "추천 주제에서 고르거나 직접 주제를 입력해 시작하세요."}
        </p>
      </div>
      <Button asChild size="sm" className="rounded-full shrink-0">
        {hasQueue ? (
          <Link to="/dashboard#workflow">
            <Send className="w-4 h-4 mr-1.5" />
            자동 발행 열기
          </Link>
        ) : (
          <Link to="/dashboard#recommendations">
            <Plus className="w-4 h-4 mr-1.5" />
            추천 보기
          </Link>
        )}
      </Button>
    </Card>
  );
}

function StockStatusCard({
  loading,
  stockCount,
  target,
}: {
  loading: boolean;
  stockCount: number;
  target: number;
}) {
  const safeTarget = Math.max(target, 1);
  const pct = Math.min(100, Math.round((stockCount / safeTarget) * 100));
  const low = stockCount < safeTarget;
  const empty = stockCount === 0;
  const barTone = empty
    ? "bg-destructive"
    : low
      ? "bg-score-warning"
      : "bg-score-excellent";
  const chipTone = empty
    ? "bg-destructive/10 text-destructive"
    : low
      ? "bg-score-warning/10 text-score-warning"
      : "bg-score-excellent/10 text-score-excellent";
  const chipLabel = empty ? "재고 없음" : low ? "보충 필요" : "충분";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-score-warning" />
          <h3 className="text-sm font-semibold">블로그 재고</h3>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${chipTone}`}>
            {chipLabel}
          </span>
        </div>
        <Link
          to="/dashboard#recommendations"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          재고 보기 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="h-12 animate-pulse rounded-md bg-muted/50" />
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">{stockCount}</span>
              <span className="text-xs text-muted-foreground">/ {safeTarget}편</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full ${barTone} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {empty
              ? "재고가 비었어요. 추천에서 주제를 채워주세요."
              : low
                ? `목표까지 ${safeTarget - stockCount}편 부족해요. 자동 보충이 켜져 있다면 곧 채워집니다.`
                : "재고가 충분해요. 자동 발행이 안정적으로 돌 수 있어요."}
          </p>
        </>
      )}
    </Card>
  );
}

function QueuePreviewCard({ queued, loading }: { queued: PostLite[]; loading: boolean }) {
  const top = queued.slice(0, 3);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <KanbanSquare className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">발행 대기</h3>
          {queued.length > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {queued.length}
            </span>
          )}
        </div>
        <Link
          to="/dashboard#workflow"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          전체 보기 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded-md bg-muted/50" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <EmptyMini
          icon={Sparkles}
          message="대기 중인 글이 없어요"
          ctaLabel="추천 보기"
          to="/dashboard#recommendations"
        />
      ) : (
        <ul className="space-y-2">
          {top.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              {p.source_axis && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    AXIS_TONE[p.source_axis] ?? "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.source_axis}
                </span>
              )}
              <span className="truncate">{p.title}</span>
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
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {enabled ? (
            <Zap className="w-4 h-4 text-primary" />
          ) : (
            <ZapOff className="w-4 h-4 text-muted-foreground" />
          )}
          <h3 className="text-sm font-semibold">자동 발행</h3>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              enabled
                ? "bg-score-excellent/10 text-score-excellent"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {enabled ? "ON" : "OFF"}
          </span>
        </div>
        <Link
          to="/dashboard#workflow"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          설정 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="h-12 animate-pulse rounded-md bg-muted/50" />
      ) : enabled ? (
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="w-3.5 h-3.5" />
            <span>
              {weekdays.length > 0 ? weekdays.map((d) => KOR_DAYS[d]).join("·") : "요일 미설정"}
              {" · "}
              {hours.length > 0 ? hours.map((h) => `${h}시`).join("·") : "시간 미설정"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            일일 최대 <span className="font-semibold text-foreground">{dailyLimit}건</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
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
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">시작 체크리스트</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {doneCount}/{items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-sm">
            {it.done ? (
              <CheckCircle2 className="w-4 h-4 text-score-excellent shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span
              className={
                it.done ? "text-muted-foreground line-through" : "text-foreground"
              }
            >
              {it.label}
            </span>
            {!it.done && (
              <Link
                to={it.to}
                className="ml-auto text-xs text-primary hover:underline inline-flex items-center gap-0.5"
              >
                바로가기 <ArrowRight className="w-3 h-3" />
              </Link>
            )}
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
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon className="w-5 h-5 text-muted-foreground mb-2" />
      <p className="text-xs text-muted-foreground mb-2">{message}</p>
      <Button asChild size="sm" variant="outline" className="rounded-full h-7 text-xs">
        <Link to={to}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
