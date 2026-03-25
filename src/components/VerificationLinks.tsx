import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerificationLinksProps {
  url: string;
}

export default function VerificationLinks({ url }: VerificationLinksProps) {
  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  const links = [
    {
      label: '구글 인덱스 확인',
      href: `https://www.google.com/search?q=site:${encodeURIComponent(domain)}`,
      desc: '구글에 사이트가 몇 페이지나 색인되었는지 확인합니다.',
    },
    {
      label: '네이버 인덱스 확인',
      href: `https://search.naver.com/search.naver?query=site:${encodeURIComponent(domain)}`,
      desc: '네이버 검색에 사이트가 등록되어 있는지 확인합니다.',
    },
    {
      label: '리치 결과 테스트',
      href: `https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`,
      desc: '구조화된 데이터(JSON-LD 등)가 올바른지, 리치 스니펫이 표시되는지 테스트합니다.',
    },
    {
      label: 'PageSpeed Insights',
      href: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`,
      desc: '페이지 로딩 속도와 Core Web Vitals 점수를 측정합니다.',
    },
    {
      label: 'OG 태그 미리보기',
      href: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(url)}`,
      desc: 'Facebook 공유 시 표시되는 제목·설명·이미지(Open Graph 메타태그)를 확인합니다.',
    },
    {
      label: '카카오 공유 디버거',
      href: `https://developers.kakao.com/tool/debugger/sharing?url=${encodeURIComponent(url)}`,
      desc: '카카오톡 공유 시 표시되는 미리보기(제목·설명·이미지)를 확인하고 캐시를 초기화합니다.',
    },
    {
      label: '네이버 사이트 검증',
      href: `https://searchadvisor.naver.com/tools/sitecheck?url=${encodeURIComponent(url)}`,
      desc: '네이버 서치어드바이저에서 사이트의 검색 등록 상태와 robots.txt 등을 확인합니다.',
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-card rounded-2xl shadow-card border border-border/60 p-6 animate-fade-up" style={{ animationDelay: '0.35s' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">🔗</span>
          <h3 className="text-base font-bold text-foreground">외부 도구에서 직접 확인하기</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">분석 결과를 외부 도구에서 교차 검증해 보세요.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {links.map((link) => (
            <Tooltip key={link.label}>
              <TooltipTrigger asChild>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {link.label}
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                {link.desc}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          위 링크는 외부 도구로 연결됩니다. 결과의 책임은 해당 서비스에 있어요.
        </p>
      </div>
    </TooltipProvider>
  );
}
