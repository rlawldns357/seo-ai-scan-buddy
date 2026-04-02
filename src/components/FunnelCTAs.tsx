import { useState } from "react";
import { FileText, MessageSquare, Bell } from "lucide-react";
import ConsultationModal from "@/components/ConsultationModal";
import LeadModal from "@/components/LeadModal";
import { type DemoResult } from "@/data/demoResults";

interface FunnelCTAsProps {
  result?: DemoResult | null;
  url?: string;
}

export default function FunnelCTAs({ result, url }: FunnelCTAsProps) {
  const [consultOpen, setConsultOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. 상담 신청 - Primary */}
        <button
          onClick={() => setConsultOpen(true)}
          className="group relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent hover:border-primary/40 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl gradient-primary">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xs font-bold text-primary">추천</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">무료 상담 신청</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              현재 상태를 진단하고<br />맞춤 솔루션을 제안받으세요
            </p>
          </div>
          <span className="text-xs font-semibold text-primary group-hover:underline">
            전문가 상담 신청 →
          </span>
        </button>

        {/* 2. 보고서 받기 - Coming Soon */}
        <div className="relative flex flex-col items-start gap-3 p-5 rounded-2xl border border-border bg-card/50 opacity-75">
          <div className="absolute top-3 right-3">
            <span className="px-2 py-0.5 rounded-full bg-score-warning/10 text-score-warning text-[10px] font-bold">
              출시예정
            </span>
          </div>
          <div className="p-2 rounded-xl bg-muted">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">자동 SEO 리포트</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              분석 결과를 상세 보고서로<br />자동 생성해 이메일로 전달
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground/60">
            곧 출시됩니다
          </span>
        </div>

        {/* 3. 출시 알림 - Light */}
        <button
          onClick={() => setLaunchOpen(true)}
          className="group flex flex-col items-start gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary/20 hover:shadow-md transition-all text-left"
        >
          <div className="p-2 rounded-xl bg-accent/10">
            <Bell className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">출시 알림 받기</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              정식 출시 소식을 가장 먼저<br />이메일로 받아보세요
            </p>
          </div>
          <span className="text-xs font-semibold text-accent group-hover:underline">
            알림 신청하기 →
          </span>
        </button>
      </div>

      <ConsultationModal open={consultOpen} onClose={() => setConsultOpen(false)} />
      <LeadModal
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        title="출시 알림 신청"
        result={result}
        url={url}
      />
    </>
  );
}
