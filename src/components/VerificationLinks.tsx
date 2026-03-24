import { ExternalLink } from "lucide-react";

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
    },
    {
      label: '네이버 인덱스 확인',
      href: `https://search.naver.com/search.naver?query=site:${encodeURIComponent(domain)}`,
    },
    {
      label: '리치 결과 테스트',
      href: `https://search.google.com/test/rich-results?url=${encodeURIComponent(url)}`,
    },
    {
      label: '모바일 친화성 테스트',
      href: `https://search.google.com/test/mobile-friendly?url=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <div className="bg-card rounded-xl shadow-card p-5 animate-fade-up" style={{ animationDelay: '0.35s' }}>
      <h3 className="text-sm font-semibold text-foreground mb-3">🔗 외부 도구에서 확인하기</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            {link.label}
            <ExternalLink className="w-3 h-3" />
          </a>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        위 링크는 외부 도구로 연결됩니다. 결과의 책임은 해당 서비스에 있어요.
      </p>
    </div>
  );
}
