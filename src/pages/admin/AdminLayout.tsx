import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, BarChart3, FileText, Search, Inbox, Sparkles, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/insights", label: "인사이트", icon: BarChart3 },
  { to: "/admin/blog", label: "블로그 관리", icon: FileText },
  { to: "/admin/seo-monitor", label: "SEO 모니터", icon: Search },
  { to: "/admin/indexing-queue", label: "색인 큐", icon: Inbox },
  { to: "/admin/ai-growth-loop", label: "AI 성장 루프", icon: Sparkles },
  { to: "/admin/credits", label: "크레딧 / 비용", icon: Wallet },
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

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 shrink-0 border-r border-border bg-card sticky top-0 h-screen flex flex-col">
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
        <div className="container py-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
