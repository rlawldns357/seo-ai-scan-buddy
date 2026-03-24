import { Search } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <div className="gradient-primary rounded-lg p-1.5">
            <Search className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Search OS</span>
        </div>
        <a
          href="mailto:hello@example.com"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          문의하기
        </a>
      </div>
    </nav>
  );
}
