import { FileText, BookOpen, FileCode2, ArrowRight } from "lucide-react";

const ITEMS = [
  {
    icon: FileText,
    title: "무료 진단 리포트",
    tag: "PDF",
    tagCls: "bg-score-poor/10 text-score-poor border-score-poor/20",
    desc: "현재 상태와 개선 포인트를 한눈에 정리한 무료 리포트입니다.",
    cta: "리포트 생성하기",
    tint: "text-score-poor",
    bg: "bg-score-poor/10",
  },
  {
    icon: BookOpen,
    title: "적용 가이드",
    tag: "가이드",
    tagCls: "bg-score-excellent/10 text-score-excellent border-score-excellent/20",
    desc: "검색 노출부터 AI 인용까지 단계별 액션 가이드입니다.",
    cta: "가이드 보기",
    tint: "text-score-excellent",
    bg: "bg-score-excellent/10",
  },
  {
    icon: FileCode2,
    title: "분석 원문 보기",
    tag: "RAW",
    tagCls: "bg-muted text-muted-foreground border-border",
    desc: "AI 모델별 원문 응답과 근거 데이터를 확인하세요.",
    cta: "원문 보기",
    tint: "text-foreground",
    bg: "bg-muted",
  },
];

export default function ReportsInsights() {
  return (
    <section className="rounded-3xl bg-card border border-border shadow-card p-4 sm:p-5 animate-fade-up">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-foreground">리포트 & 인사이트</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">분석을 더 깊이 이해하고 실행에 옮겨보세요.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {ITEMS.map(({ icon: Icon, title, tag, tagCls, desc, cta, tint, bg }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-muted/20 hover:bg-muted/30 hover:border-foreground/20 transition-all px-4 py-3.5 flex flex-col gap-2 group"
          >
            <div className="flex items-center justify-between">
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${bg} ${tint}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagCls}`}>
                {tag}
              </span>
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-foreground leading-tight">{title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{desc}</p>
            </div>
            <button className={`mt-auto inline-flex items-center gap-1 text-[12px] font-semibold ${tint} group-hover:underline`}>
              {cta}
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
