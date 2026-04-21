import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FinalCta() {
  return (
    <section className="py-20 md:py-28 px-2 md:px-6">
      <div className="max-w-3xl mx-auto text-center p-8 md:p-12 rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
          검색엔진과 AI가<br />
          <span className="text-primary">더 잘 이해하는 콘텐츠 운영</span>, 지금 시작하세요
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-5 leading-relaxed">
          페이지 1개를 만들면 검색 노출·답변 채택·AI 인용 관점이 같이 반영된 글이<br />
          구조까지 갖춰서 자동으로 발행됩니다.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="#how">
            <Button size="lg" variant="outline" className="rounded-full h-12 px-6">
              작동 방식 보기
            </Button>
          </a>
          <Link to="/auth?next=/dashboard">
            <Button size="lg" className="rounded-full h-12 px-8 gap-2">
              페이지 만들기 <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
