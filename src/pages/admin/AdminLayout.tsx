import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, BarChart3, FileText, Search, Wallet, Activity, Menu, X, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/insights", label: "인사이트", icon: BarChart3 },
  { to: "/admin/blog", label: "블로그 (자체)", icon: FileText },
  { to: "/admin/content", label: "콘텐츠 (AutoBlog)", icon: Layers },
  { to: "/admin/seo", label: "SEO", icon: Search },
  { to: "/admin/credits", label: "비용 / 크레딧", icon: Wallet },
  { to: "/admin/system", label: "시스템", icon: Activity },
];

export default function AdminLayout() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (sessionStorage.getItem("admin_pw")) setAuthed(true);
  }, []);

  useEffect(() => { setNavOpen(false); }, [location.pathname]);

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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-primary-foreground" />
            </div>
            <CardTitle className="text-lg">관리자 인증</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? "확인 중..." : "로그인"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentLabel = NAV.find(n => location.pathname.startsWith(n.to))?.label ?? "관리자";

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 px-3 h-12 border-b border-border bg-card/95 backdrop-blur">
        <button
          onClick={() => setNavOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-muted"
          aria-label="메뉴 열기"
        >
          <Menu className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold truncate">{currentLabel}</p>
        <div className="w-9" />
      </div>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col animate-in slide-in-from-left">
            <div className="px-4 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">SearchTune OS</p>
                <p className="text-sm font-bold text-foreground">관리자 콘솔</p>
              </div>
              <button onClick={() => setNavOpen(false)} className="p-2 rounded-lg hover:bg-muted" aria-label="닫기">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => { sessionStorage.removeItem("admin_pw"); setAuthed(false); }}
              >
                로그아웃
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border bg-card sticky top-0 h-screen flex-col">
        <div className="px-4 py-5 border-b border-border">
          <p className="text-xs text-muted-foreground">SearchTune OS</p>
          <p className="text-sm font-bold text-foreground">관리자 콘솔</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => { sessionStorage.removeItem("admin_pw"); setAuthed(false); }}
          >
            로그아웃
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="container py-4 md:py-8 max-w-7xl px-3 md:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
