import { useState, useRef, useEffect } from "react";
import { Search, ShieldCheck, Bell, MessageSquare, Briefcase, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import ContactModal from "@/components/ContactModal";
import ConsultationModal from "@/components/ConsultationModal";
import LeadModal from "@/components/LeadModal";
import { useAuth } from "@/features/auth/useAuth";

export default function Navbar() {
  const isAdmin = typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_pw") !== null;
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [engineVersion, setEngineVersion] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const fetchVersion = () => {
      supabase
        .from("engine_config")
        .select("version")
        .eq("config_key", "analysis_prompt")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setEngineVersion(data.version);
        });
    };
    fetchVersion();

    const channel = supabase
      .channel("engine_config_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "engine_config" }, () => {
        fetchVersion();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const menuItems = [
    { icon: Bell, label: "출시 알림 신청", desc: "정식 출시 소식을 먼저 받아보세요", action: () => { setDropdownOpen(false); setLeadOpen(true); } },
    { icon: MessageSquare, label: "무료 상담 신청", desc: "전문가가 맞춤 솔루션을 제안해요", action: () => { setDropdownOpen(false); setConsultOpen(true); } },
    { icon: Briefcase, label: "비즈니스 문의", desc: "제휴, 협업, 서비스 관련 문의", action: () => { setDropdownOpen(false); setContactOpen(true); } },
  ];

  return (
    <>
      <nav className="w-full bg-background sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <div className="gradient-primary rounded-xl p-2 shrink-0">
                <Search className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex flex-col leading-none min-w-0">
                <span className="text-base sm:text-lg font-bold text-foreground tracking-tight whitespace-nowrap">
                  SearchTune <span className="font-extrabold">OS</span>
                </span>
                <span className="text-[9px] text-muted-foreground/60 font-medium tracking-wide whitespace-nowrap">
                  v0.11.0-beta{engineVersion !== null && ` · Engine v${engineVersion}`}
                </span>
              </div>
            </Link>
            <span className="hidden sm:inline px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent shrink-0">Beta</span>
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-score-excellent/10 text-score-excellent border border-score-excellent/20 hover:bg-score-excellent/20 transition-colors shrink-0"
              >
                <ShieldCheck className="w-3 h-3" />
                Admin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              to={user ? "/dashboard" : "/autoblog"}
              className="inline-flex items-center gap-1 sm:gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium whitespace-nowrap"
            >
              {!user && <LogIn className="w-3.5 h-3.5 hidden sm:inline-block" />}
              <span>AutoBlog</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary leading-none">PRO</span>
            </Link>
            <Link
              to="/blog"
              className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Blog
            </Link>
            <Link
              to="/about"
              className="hidden sm:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              About
            </Link>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Contact
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-up z-50">
                  {menuItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                        <item.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <LeadModal open={leadOpen} onClose={() => setLeadOpen(false)} title="출시 알림 신청" />
      <ConsultationModal open={consultOpen} onClose={() => setConsultOpen(false)} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}
