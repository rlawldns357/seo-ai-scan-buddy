import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { Lightbulb } from "lucide-react";
import PageHeader from "@/features/publish/ui/PageHeader";

const Recommendations = lazy(() => import("./Recommendations"));

export default function DashboardRecommendationsPage() {
  return (
    <>
      <Helmet>
        <title>콘텐츠 추천 | AutoBlog</title>
      </Helmet>
      <PageHeader
        icon={Lightbulb}
        chip="Start Here"
        title="주제 추천 받기"
        subtitle="사이트 URL은 자동으로 채워집니다. 관심 주제를 넣고, 마음에 안 드는 추천은 🎲 주사위로 다시 굴려보세요."
        tone="warning"
      />
      <Suspense fallback={<div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />}>
        <Recommendations />
      </Suspense>
    </>
  );
}
