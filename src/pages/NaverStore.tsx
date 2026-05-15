import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Store, AlertTriangle, TrendingDown, Search, Bot } from "lucide-react";
import Navbar from "@/components/Navbar";
import { parseNaverStoreUrl } from "@/lib/naverStore";

/**
 * /naver-store — 네이버 스마트/브랜드 스토어 타겟 랜딩.
 * 입력 후 메인(/)으로 redirect하면 자동 분기 로직이 analyze-naver-store로 연결.
 */
export default function NaverStore() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [ownDomain, setOwnDomain] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setError("URL을 입력해 주세요.");
      return;
    }
    if (trimmed.length > 2000) {
      setError("URL이 너무 길어요.");
      return;
    }
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    let host = "";
    try {
      host = new URL(normalized).hostname.toLowerCase();
    } catch {
      setError("올바른 URL 형식이 아니에요. 예: brand.naver.com/내브랜드");
      return;
    }

    if (host !== "brand.naver.com" && host !== "smartstore.naver.com") {
      if (host.endsWith("naver.com")) {
        setError("네이버 메인/검색 URL은 분석할 수 없어요. 스토어 URL(brand.naver.com/… 또는 smartstore.naver.com/…)을 입력해 주세요.");
      } else {
        setError("brand.naver.com 또는 smartstore.naver.com URL만 입력 가능해요. 일반 사이트는 메인 페이지에서 분석해 주세요.");
      }
      return;
    }

    const parsed = parseNaverStoreUrl(normalized);
    if (!parsed) {
      setError("브랜드 식별자가 없어요. 예: brand.naver.com/내브랜드 형식으로 입력해 주세요.");
      return;
    }

    // 자체 도메인 정규화 (선택 입력)
    let ownDomainParam = "";
    const trimmedOwn = ownDomain.trim();
    if (trimmedOwn) {
      try {
        const withProto = /^https?:\/\//i.test(trimmedOwn) ? trimmedOwn : `https://${trimmedOwn}`;
        const ownHost = new URL(withProto).hostname.toLowerCase().replace(/^www\./, "");
        if (ownHost.endsWith("naver.com")) {
          setError("자체 도메인은 naver.com이 아닌 별도 도메인이어야 해요.");
          return;
        }
        ownDomainParam = ownHost;
      } catch {
        setError("자체 도메인 형식이 올바르지 않아요. 예: mybrand.com");
        return;
      }
    }

    const qs = new URLSearchParams({ url: parsed.storeUrl, autorun: "1" });
    if (ownDomainParam) qs.set("ownDomain", ownDomainParam);
    navigate(`/?${qs.toString()}`);
  };

  return (
    <>
      <Helmet>
        <title>네이버 스마트스토어 SEO 진단 – 서치튠OS</title>
        <meta
          name="description"
          content="네이버 스마트스토어의 검색 노출 상태를 SEO, AEO, GEO 관점에서 점검하고 개선 방향을 확인하세요."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://searchtuneos.com/naver-store" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="네이버 스마트스토어 SEO 진단 – 서치튠OS" />
        <meta property="og:description" content="네이버 스마트스토어의 검색 노출 상태를 SEO, AEO, GEO 관점에서 점검하고 개선 방향을 확인하세요." />
        <meta property="og:url" content="https://searchtuneos.com/naver-store" />
        <meta name="twitter:title" content="네이버 스마트스토어 SEO 진단 – 서치튠OS" />
        <meta name="twitter:description" content="네이버 스마트스토어의 검색 노출 상태를 SEO, AEO, GEO 관점에서 점검하고 개선 방향을 확인하세요." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />

        <main className="flex-1 px-4 sm:px-6 pt-14 pb-32 sm:pt-20 sm:pb-40">
          <div className="max-w-3xl mx-auto">
            {/* 히어로 */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-6">
                <Store className="w-3.5 h-3.5" />
                네이버 스토어 전용 진단
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-tight tracking-tight mb-5">
                <span className="block">네이버 스마트스토어 SEO 진단</span>
                <span className="block text-muted-foreground text-lg sm:text-2xl font-light mt-3">
                  내 스토어가 검색에서 얼마나 보이는지,
                </span>
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-1">
                  10초 만에 알려드려요
                </span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
                브랜드 스토어·스마트스토어는 구조적으로 검색 권위가 naver.com에 적립돼요.
                <br className="hidden sm:block" />
                얼마나 누수되는지, 어디서 회수 가능한지 무료로 확인하세요.
              </p>
            </div>

            {/* 입력 폼 */}
            <form
              onSubmit={handleSubmit}
              className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm mb-12"
            >
              <label htmlFor="store-url" className="block text-sm font-bold text-foreground mb-2">
                네이버 스토어 URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="store-url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="brand.naver.com/내브랜드"
                  className="flex-1 h-12 px-4 rounded-full border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  무료 진단 시작
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-destructive font-medium">{error}</p>}
              <p className="mt-3 text-xs text-muted-foreground">
                예: <code className="px-1.5 py-0.5 bg-muted rounded">brand.naver.com/mujikorea</code> ·{" "}
                <code className="px-1.5 py-0.5 bg-muted rounded">smartstore.naver.com/오늘의집</code>
              </p>

              {/* 자체 도메인 옵션 */}
              <div className="mt-4 pt-4 border-t border-border/60">
                <label htmlFor="own-domain" className="block text-xs font-bold text-foreground mb-1.5">
                  자체 도메인이 있나요? <span className="text-muted-foreground font-normal">(선택)</span>
                </label>
                <input
                  id="own-domain"
                  type="text"
                  value={ownDomain}
                  onChange={(e) => setOwnDomain(e.target.value)}
                  placeholder="예: mybrand.com"
                  className="w-full h-10 px-4 rounded-full border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  자체 도메인이 검색에서 잘 노출되고 있다면, 누수가 아니라 권위가 정상 분배되는 상태로 채점해요.
                </p>
              </div>

            </form>

            {/* 진단 항목 3개 */}
            <div className="grid sm:grid-cols-3 gap-3 mb-10">
              {[
                {
                  icon: <TrendingDown className="w-5 h-5" />,
                  title: "권위 누수율",
                  desc: "검색 권위 중 naver.com에 적립돼 회수 불가능한 비율",
                  color: "text-rose-600 bg-rose-50",
                },
                {
                  icon: <Bot className="w-5 h-5" />,
                  title: "AI 인용 가능성",
                  desc: "ChatGPT·Perplexity가 내 브랜드를 답변에 인용할 준비도",
                  color: "text-violet-600 bg-violet-50",
                },
                {
                  icon: <Search className="w-5 h-5" />,
                  title: "외부 채널 점유율",
                  desc: "블로그·카페·웹문서 등 외부 채널의 브랜드 언급 분포",
                  color: "text-blue-600 bg-blue-50",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className={`inline-flex w-9 h-9 rounded-xl items-center justify-center mb-2 ${item.color}`}>
                    {item.icon}
                  </div>
                  <h2 className="text-sm font-bold text-foreground mb-1">{item.title}</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* 왜 일반 SEO 진단으로는 부족한가 */}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <div className="text-sm">
                  <p className="font-bold text-amber-900 mb-2">
                    일반 SEO 진단으로는 네이버 스토어를 정확히 볼 수 없어요
                  </p>
                  <ul className="text-amber-900/80 space-y-1.5 list-disc list-inside marker:text-amber-700">
                    <li>스토어는 robots.txt로 외부 크롤러를 차단해요 → 일반 진단은 빈 화면을 보게 됩니다</li>
                    <li>자체 도메인이 없어 Lighthouse·메타 태그 분석이 무의미해요</li>
                    <li>검색 권위가 어디로 새고 있는지는 네이버 Search API로만 측정 가능해요</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
