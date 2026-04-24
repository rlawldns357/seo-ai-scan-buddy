import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { BarChart3 } from "lucide-react";
import PageHeader from "@/features/publish/ui/PageHeader";

const Reports = lazy(() => import("./Reports"));

export default function DashboardReportsPage() {
  return (
    <>
      <Helmet>
        <title>성과 리포트 | AutoBlog</title>
      </Helmet>
      <PageHeader
        icon={BarChart3}
        chip="Reports"
        title="성과 리포트"
        subtitle="분석 점수 추이와 발행 현황을 시각화합니다."
        tone="success"
      />
      <Suspense fallback={<div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />}>
        <Reports />
      </Suspense>
    </>
  );
}
