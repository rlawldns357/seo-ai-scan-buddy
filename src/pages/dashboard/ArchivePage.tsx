import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { Archive } from "lucide-react";
import PageHeader from "@/features/publish/ui/PageHeader";

const ArchiveSection = lazy(() => import("@/features/publish/ArchiveSection"));

export default function DashboardArchivePage() {
  return (
    <>
      <Helmet>
        <title>발행 아카이브 | Auto Blog</title>
      </Helmet>
      <PageHeader
        icon={Archive}
        chip="Archive"
        title="발행 아카이브"
        subtitle="발행된 모든 글을 검색하고, 오래된 글은 보관해 칸반을 가볍게 유지하세요."
        tone="neutral"
      />
      <Suspense fallback={<div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />}>
        <ArchiveSection />
      </Suspense>
    </>
  );
}
