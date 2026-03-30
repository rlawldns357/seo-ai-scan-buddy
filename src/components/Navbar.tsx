import { Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const isAdmin = typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_pw") !== null;

  return (
    <nav className="w-full bg-background sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="gradient-primary rounded-xl p-2">
              <Search className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold text-foreground tracking-tight">
                SearchTune <span className="font-extrabold">OS</span>
              </span>
              <span className="text-[9px] text-muted-foreground/60 font-medium tracking-wide">v0.9.1-beta</span>
            </div>
          </Link>
          <span className="hidden sm:inline px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent">Beta</span>
          <span className="sm:hidden px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-wider bg-accent/10 text-accent leading-none">β</span>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-score-excellent/10 text-score-excellent border border-score-excellent/20 hover:bg-score-excellent/20 transition-colors"
            >
              <ShieldCheck className="w-3 h-3" />
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/about"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            About
          </Link>
          <a
            href="mailto:contact@searchtuneos.com"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Contact
          </a>
        </div>
      </div>
    </nav>
  );
}
