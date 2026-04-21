import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FinalCta() {
  return (
    <section className="py-12 md:py-28 px-4 md:px-6">
      <div className="max-w-3xl mx-auto text-center p-6 md:p-12 rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card">
        <h2 className="text-[24px] leading-[1.3] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground break-keep">
          검색엔진과 AI가{" "}
          <span className="text-primary">더 잘 이해하는 콘텐츠 운영</span>, 지금 시작하세요
        </h2>
        <p className="text-[15px] leading-[1.7] md:text-base md:leading-relaxed text-muted-foreground mt-5 break-keep">
          페이지 1개를 만들면 검색 노출·답변 채택·AI 인용 관점이 같이 반영된 글이 구조까지 갖춰서 자동으로 발행됩니다.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/auth?next=/dashboard" className="w-full sm:w-auto order-1 sm:order-2">
            <Button size="lg" className="rounded-full h-12 px-8 gap-2 w-full sm:w-auto justify-center">
              페이지 만들기 <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a href="#how" className="w-full sm:w-auto order-2 sm:order-1">
            <Button size="lg" variant="outline" className="rounded-full h-12 px-6 w-full sm:w-auto justify-center">
              작동 방식 보기
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
