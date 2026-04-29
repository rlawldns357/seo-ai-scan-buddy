import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";

export default function Privacy() {
  const title = "개인정보처리방침 – 서치튠OS";
  const url = "https://searchtuneos.com/privacy";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content="서치튠OS(SearchTune OS) 개인정보처리방침. 수집하는 개인정보, 이용 목적, 보관 기간 등을 안내합니다." />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:url" content={url} />
      </Helmet>
      <Navbar />

      <main className="container max-w-3xl pt-16 pb-28 md:pt-24 md:pb-32">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-8">개인정보처리방침</h1>
        <p className="text-sm text-muted-foreground mb-10">시행일: 2026년 4월 14일</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground">1. 수집하는 개인정보</h2>
            <p>서치튠OS(이하 "서비스")는 다음과 같은 개인정보를 수집할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>분석 서비스 이용 시:</strong> 입력한 URL, IP 주소(비식별 처리), 브라우저 정보</li>
              <li><strong>이메일 리드 제출 시:</strong> 이메일 주소</li>
              <li><strong>상담 신청 시:</strong> 이름, 이메일, 전화번호, 회사명, 직책, 사이트 URL</li>
              <li><strong>자동 수집 정보:</strong> 방문 페이지, 접속 시간, 세션 ID (쿠키 기반)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>SEO·AEO·GEO 분석 결과 제공</li>
              <li>서비스 개선 및 사용자 경험 향상</li>
              <li>이메일을 통한 분석 보고서 발송</li>
              <li>상담 요청 처리 및 응대</li>
              <li>서비스 이용 통계 분석</li>
              <li>부정 이용 방지 및 서비스 안정성 확보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">3. 개인정보의 보관 및 파기</h2>
            <p>수집된 개인정보는 수집 목적이 달성된 후 지체 없이 파기합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>분석 이력:</strong> 수집일로부터 1년</li>
              <li><strong>이메일 리드:</strong> 수신 거부 시 즉시 삭제</li>
              <li><strong>상담 신청 정보:</strong> 처리 완료 후 6개월</li>
              <li><strong>접속 로그:</strong> 3개월</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">4. 개인정보의 제3자 제공</h2>
            <p>서치튠OS는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우 예외로 합니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>이용자의 사전 동의가 있는 경우</li>
              <li>법령에 의해 요구되는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">5. 쿠키(Cookie) 사용</h2>
            <p>서비스는 사용자 경험 개선과 서비스 분석을 위해 쿠키를 사용합니다. 브라우저 설정을 통해 쿠키 사용을 거부할 수 있으며, 이 경우 일부 서비스 이용이 제한될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">6. 광고</h2>
            <p>서비스는 Google AdSense 등 제3자 광고 네트워크를 사용할 수 있으며, 이러한 광고 네트워크는 관심 기반 광고 제공을 위해 쿠키를 사용할 수 있습니다. 자세한 내용은 <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google 광고 정책</a>을 참조하세요.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">7. 이용자의 권리</h2>
            <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>개인정보 열람, 수정, 삭제 요청</li>
              <li>마케팅 이메일 수신 거부</li>
              <li>개인정보 처리 정지 요청</li>
            </ul>
            <p>위 요청은 이메일(<strong>support@searchtuneos.com</strong>)을 통해 접수할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">8. 개인정보 보호책임자</h2>
            <ul className="list-none space-y-1">
              <li><strong>서비스명:</strong> 서치튠OS (SearchTune OS)</li>
              <li><strong>이메일:</strong> support@searchtuneos.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">9. 방침 변경</h2>
            <p>본 개인정보처리방침은 법령 또는 서비스 변경 사항을 반영하기 위해 수정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.</p>
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
