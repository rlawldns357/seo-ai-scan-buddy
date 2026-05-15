import { Helmet } from "react-helmet-async";
import CostDashboard from "@/components/admin/CostDashboard";

export default function Credits() {
  return (
    <div className="space-y-6">
      <Helmet>
        <title>크레딧 / API 비용 – 서치튠OS 관리자</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div>
        <h1 className="text-2xl font-bold text-foreground">💰 크레딧 / API 비용</h1>
        <p className="text-sm text-muted-foreground">
          프로바이더별 사용량 · 월 예산 잔여 · 카톡 보고용 텍스트 복사
        </p>
      </div>
      <CostDashboard />
    </div>
  );
}
