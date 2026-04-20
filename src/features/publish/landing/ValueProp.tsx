export default function ValueProp() {
  return (
    <section className="py-16 md:py-24 px-2 md:px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
          블로그를 따로 구축하지 않아도,<br />
          <span className="text-primary">콘텐츠 운영은 바로 시작</span>할 수 있습니다
        </h2>
        <p className="text-sm md:text-base text-muted-foreground mt-5 leading-relaxed">
          복잡한 CMS 설정 없이<br />
          내 사이트와 연결된 전용 콘텐츠 페이지를 만들고<br />
          필요한 글을 자동으로 발행해보세요.
        </p>
        <div className="mt-8 p-6 md:p-8 rounded-2xl border border-border/50 bg-card text-left max-w-2xl mx-auto">
          <p className="text-sm md:text-base text-foreground leading-relaxed">
            사이트를 연결하면 <span className="font-semibold text-primary">SearchTune OS 안에 전용 콘텐츠 페이지</span>가 생성됩니다.
            이후 필요한 글이 자동으로 발행되어, 콘텐츠 운영을 더 가볍게 시작할 수 있습니다.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground mt-4 leading-relaxed">
            직접 블로그를 구축하지 않아도 되고,<br />
            무엇을 써야 할지 매번 고민하지 않아도 됩니다.
          </p>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mt-8 max-w-2xl mx-auto leading-relaxed">
          SearchTune OS는 내 사이트 주제와 운영 방향에 맞는 글을 만들어
          내 전용 콘텐츠 페이지에 자동으로 쌓아줍니다.
          처음부터 큰 블로그를 만들기보다, 필요한 콘텐츠를 빠르게 운영해보는 데 적합합니다.
        </p>
      </div>
    </section>
  );
}
