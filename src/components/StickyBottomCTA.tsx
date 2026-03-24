import { useState } from "react";
import { Bell, CheckCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function StickyBottomCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;

    const stored = JSON.parse(localStorage.getItem("demo_emails") || "[]") as string[];
    if (stored.includes(trimmed)) {
      setStatus("success");
      return;
    }
    stored.push(trimmed);
    localStorage.setItem("demo_emails", JSON.stringify(stored));
    setStatus("success");
    trackEvent("sticky_email_submit", { email: trimmed });
  };

  if (status === "success") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-score-excellent/20 bg-score-excellent/5 backdrop-blur-sm">
        <div className="container max-w-4xl mx-auto flex items-center justify-center gap-2 px-4 py-3">
          <CheckCircle className="w-4 h-4 text-score-excellent shrink-0" />
          <p className="text-sm font-medium text-score-excellent">등록 완료! 출시되면 가장 먼저 알려드릴게요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="container max-w-4xl mx-auto flex items-center gap-3 px-4 py-2.5">
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <Bell className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">출시 알림</span>
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="you@company.com"
            className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <button
            onClick={handleSubmit}
            className="shrink-0 h-9 px-4 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            출시 알림 받기
          </button>
        </div>
      </div>
    </div>
  );
}
