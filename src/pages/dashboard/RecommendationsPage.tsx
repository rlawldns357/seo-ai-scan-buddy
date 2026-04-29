import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { Lightbulb } from "lucide-react";
import PageHeader from "@/features/publish/ui/PageHeader";

const Recommendations = lazy(() => import("./Recommendations"));

export default function DashboardRecommendationsPage() {
  return (
    <>
      <Helmet>
        <title>블로그 재고 | Auto-Blog</title>
      </Helmet>
      <PageHeader
        icon={Lightbulb}
        chip="Start Here"
        title="블로그 재고 채우기"
        subtitle="사이트에 맞는 블로그 주제가 재고처럼 쌓입니다. 부족하면 ‘5개 더 받기’, 마음에 드는 건 ‘발행 대기로’ 보내 본문을 만들어요."
        tone="warning"
      />
      <Suspense fallback={<div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />}>
        <Recommendations />
      </Suspense>
    </>
  );
}
