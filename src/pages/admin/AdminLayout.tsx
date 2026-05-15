import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, BarChart3, FileText, Search, Inbox, Sparkles, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/insights", label: "Insights", icon: BarChart3, code: "01" },
  { to: "/admin/blog", label: "Blog", icon: FileText, code: "02" },
  { to: "/admin/seo-monitor", label: "SEO Monitor", icon: Search, code: "03" },
  { to: "/admin/indexing-queue", label: "Indexing", icon: Inbox, code: "04" },
  { to: "/admin/ai-growth-loop", label: "Growth Loop", icon: Sparkles, code: "05" },
  { to: "/admin/credits", label: "Credits", icon: Wallet, code: "06" },
];

export default function AdminLayout() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (sessionStorage.getItem("admin_pw")) setAuthed(true);
  }, []);

  useEffect(() => {
    if (authed && location.pathname === "/admin") navigate("/admin/insights", { replace: true });
  }, [authed, location.pathname, navigate]);

  const handleLogin = async () => {
    setLoading(true); setError("");
    try {
      const { data: res, error: err } = await supabase.functions.invoke("admin-auth", { body: { password } });
      if (err || res?.error) setError("비밀번호가 틀렸습니다");
      else { sessionStorage.setItem("admin_pw", password); setAuthed(true); }
    } catch { setError("서버 오류"); }
    setLoading(false);
  };

  if (!authed) {
    return (
      <div className="admin-brutal admin-brutal-paper min-h-screen flex items-center justify-center p-4">
        <div className="br-card w-full max-w-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="br-tag">// AUTH</span>
            <span className="br-label">v0.12.0</span>
          </div>
          <div className="space-y-1">
            <h1 className="br-h1 text-2xl">관리자 인증</h1>
            <p className="br-label">PASSWORD REQUIRED</p>
          </div>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="rounded-none border-2 border-black h-12 font-mono bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {error && <p className="br-label" style={{ color: "#c1121f" }}>!! {error}</p>}
          <button className="br-btn w-full justify-center" onClick={handleLogin} disabled={loading}>
            {loading ? "확인 중..." : "→ 로그인"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-brutal admin-brutal-paper min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r-2 border-black bg-white sticky top-0 h-screen flex flex-col">
        <div className="px-4 py-5 border-b-2 border-black">
          <div className="flex items-center justify-between">
            <span className="br-tag">SearchTune OS</span>
            <span className="br-label">v0.12</span>
          </div>
          <p className="br-h1 text-lg mt-2">ADMIN<br/>CONSOLE</p>
        </div>
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, code }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn("br-nav-item", isActive && "active")}
            >
              <span className="br-label" style={{ color: "inherit", opacity: 0.55 }}>{code}</span>
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t-2 border-black">
          <button
            className="br-btn-ghost w-full justify-center"
            onClick={() => { sessionStorage.removeItem("admin_pw"); setAuthed(false); }}
          >
            ⏏ Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Top status bar */}
        <div className="border-b-2 border-black bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 bg-[#22c55e] rounded-none animate-pulse" />
            <span className="br-label">SYSTEM ONLINE</span>
            <span className="br-label opacity-40">·</span>
            <span className="br-label">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }).toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="br-tag-accent">LIVE</span>
          </div>
        </div>
        <div className="p-6 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
