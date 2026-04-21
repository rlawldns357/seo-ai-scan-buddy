import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FinalCta() {
  return (
    <section className="py-20 md:py-28 px-2 md:px-6">
      <div className="max-w-3xl mx-auto text-center p-8 md:p-12 rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
          내 사이트용 콘텐츠 운영,<br />
          <span className="text-primary">오늘 바로 시작</span>해보세요
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-5 leading-relaxed">
          사이트를 연결하고 규칙만 정하면<br />
          SearchTune OS가 전용 콘텐츠 페이지를 만들고 자동으로 글을 발행합니다.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link to="/auth?next=/dashboard">
            <Button size="lg" className="rounded-full h-12 px-8 gap-2">
              무료로 시작하기 <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-[11px] text-muted-foreground">베타 기간 무료 · 신용카드 등록 불필요</p>
        </div>
      </div>
    </section>
  );
}
