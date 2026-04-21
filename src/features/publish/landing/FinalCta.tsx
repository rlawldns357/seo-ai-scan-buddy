import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FinalCta() {
  return (
    <section className="py-20 md:py-28 px-2 md:px-6">
      <div className="max-w-3xl mx-auto text-center p-8 md:p-12 rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
          내 사이트용 콘텐츠 운영,<br />
          <span className="text-primary">어떻게 작동하는지</span> 살펴보세요
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-5 leading-relaxed">
          사이트 연결부터 자동 발행까지의 흐름을<br />
          내 사이트에 어떻게 적용할 수 있는지 미리 확인해볼 수 있습니다.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="#how">
            <Button size="lg" variant="outline" className="rounded-full h-12 px-6">
              작동 방식 보기
            </Button>
          </a>
          <Link to="/auth?next=/dashboard">
            <Button size="lg" className="rounded-full h-12 px-8 gap-2">
              내 사이트 연동해보기 <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
