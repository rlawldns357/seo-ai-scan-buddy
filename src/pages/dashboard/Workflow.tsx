import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { KanbanSquare } from "lucide-react";
import PageHeader from "@/features/publish/ui/PageHeader";

const KanbanBoard = lazy(() => import("@/features/publish/kanban/KanbanBoard"));

export default function DashboardWorkflow() {
  return (
    <>
      <Helmet>
        <title>자동 발행 | AutoBlog</title>
      </Helmet>
      <PageHeader
        icon={KanbanSquare}
        chip="Auto Publish"
        title="자동 발행"
        subtitle="AI가 본문을 만들어 ‘발행 대기’에 쌓아둡니다. 시간을 정해 자동 발행하거나 즉시 발행하세요."
        tone="accent"
      />
      <Suspense fallback={<div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />}>
        <KanbanBoard />
      </Suspense>
    </>
  );
}
