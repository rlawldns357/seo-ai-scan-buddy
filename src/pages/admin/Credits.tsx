import { Helmet } from "react-helmet-async";
import CostDashboard from "@/components/admin/CostDashboard";

export default function Credits() {
  return (
    <div className="space-y-6">
      <Helmet>
        <title>크레딧 / API 비용 – 서치튠OS 관리자</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Brutalist page header */}
      <header className="br-card-ink p-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="br-tag-accent">06 / CREDITS</span>
            <span className="br-label" style={{ color: "#fff", opacity: 0.6 }}>// API COST OPS</span>
          </div>
          <h1 className="br-h1 text-3xl md:text-4xl">
            CREDIT<br/>BURN-RATE.
          </h1>
          <p className="br-label" style={{ color: "#fff", opacity: 0.7 }}>
            프로바이더별 사용량 · 월 예산 잔여 · 카톡 보고용 텍스트 복사
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="br-tag-accent">REAL-TIME</span>
        </div>
      </header>

      <CostDashboard />
    </div>
  );
}
