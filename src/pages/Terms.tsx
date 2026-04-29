import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";

export default function Terms() {
  const title = "이용약관 – 서치튠OS";
  const url = "https://searchtuneos.com/terms";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content="서치튠OS(SearchTune OS) 이용약관. 서비스 이용 조건, 면책 사항, 지적재산권 등을 안내합니다." />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:url" content={url} />
      </Helmet>
      <Navbar />

      <main className="container max-w-3xl pt-16 pb-28 md:pt-24 md:pb-32">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-8">이용약관</h1>
        <p className="text-sm text-muted-foreground mb-10">시행일: 2026년 4월 14일</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground">제1조 (목적)</h2>
            <p>이 약관은 서치튠OS(이하 "서비스")가 제공하는 SEO·AEO·GEO 분석 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제2조 (정의)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>"서비스"</strong>란 서치튠OS가 제공하는 웹사이트 분석, SEO·AEO·GEO 점수 진단, 블로그 콘텐츠 등 일체의 서비스를 의미합니다.</li>
              <li><strong>"이용자"</strong>란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 모든 사람을 의미합니다.</li>
              <li><strong>"콘텐츠"</strong>란 서비스 내에서 제공되는 분석 결과, 블로그 게시물, 가이드 등 모든 정보를 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>서비스는 필요한 경우 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 공지 후 시행됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제4조 (서비스의 제공)</h2>
            <p>서비스는 다음을 제공합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>URL 기반 SEO·AEO·GEO 통합 분석</li>
              <li>웹사이트 성능 및 검색 최적화 진단 보고서</li>
              <li>검색 엔진 최적화 관련 블로그 콘텐츠</li>
              <li>기타 서비스가 정하는 부가 서비스</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제5조 (서비스 이용 제한)</h2>
            <p>서비스는 다음의 경우 이용을 제한할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>서비스의 안정적 운영을 방해하는 행위 (과도한 요청, DDoS 등)</li>
              <li>타인의 개인정보를 무단으로 수집하는 행위</li>
              <li>서비스를 이용한 불법적 활동</li>
              <li>자동화 도구를 이용한 대량 분석 요청</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제6조 (분석 결과의 정확성)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>서비스가 제공하는 분석 결과는 참고 목적으로만 제공되며, 절대적인 검색엔진 순위나 성과를 보장하지 않습니다.</li>
              <li>분석 결과는 AI 기반 추정치이며, 실제 검색엔진의 평가와 차이가 있을 수 있습니다.</li>
              <li>분석 결과에 기반한 의사결정의 책임은 이용자에게 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제7조 (지적재산권)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>서비스가 작성한 콘텐츠(블로그 게시물, 가이드 등)에 대한 저작권은 서치튠OS에 귀속됩니다.</li>
              <li>이용자는 서비스의 콘텐츠를 출처를 명시하여 비상업적 목적으로 인용할 수 있습니다.</li>
              <li>이용자가 입력한 URL 및 분석 대상 웹사이트에 대한 권리는 해당 이용자 또는 웹사이트 소유자에게 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제8조 (면책 사항)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>서비스는 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>이용자가 서비스를 통해 얻은 정보에 의한 손해에 대해 서비스는 책임을 지지 않습니다.</li>
              <li>서비스는 이용자 간 또는 이용자와 제3자 간의 분쟁에 개입하지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제9조 (광고 게재)</h2>
            <p>서비스는 운영을 위해 서비스 화면에 광고를 게재할 수 있습니다. 광고 게재에 대한 동의는 서비스 이용 시 이루어진 것으로 간주합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제10조 (준거법 및 관할)</h2>
            <p>본 약관의 해석 및 분쟁 해결은 대한민국 법률에 따르며, 분쟁 발생 시 서울중앙지방법원을 제1심 관할법원으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">제11조 (문의)</h2>
            <p>본 약관에 관한 문의는 아래로 연락해 주세요.</p>
            <ul className="list-none space-y-1">
              <li><strong>서비스명:</strong> 서치튠OS (SearchTune OS)</li>
              <li><strong>이메일:</strong> support@searchtuneos.com</li>
            </ul>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-10">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SearchTune OS. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
