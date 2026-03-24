import { Search } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="w-full bg-background sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <div className="gradient-primary rounded-xl p-2">
            <Search className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">Search OS</span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent">Beta</span>
        </div>
        <a
          href="mailto:hello@example.com"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          문의하기
        </a>
      </div>
    </nav>
  );
}
