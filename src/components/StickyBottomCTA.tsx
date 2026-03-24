import { useState } from "react";
import { Bell, CheckCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function StickyBottomCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const handleSubmit = () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;

    const stored = JSON.parse(localStorage.getItem("demo_emails") || "[]") as string[];
    if (!stored.includes(trimmed)) {
      stored.push(trimmed);
      localStorage.setItem("demo_emails", JSON.stringify(stored));
    }
    setStatus("success");
    trackEvent("sticky_email_submit", { email: trimmed });
  };

  if (status === "success") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-primary">
        <div className="container max-w-4xl mx-auto flex items-center justify-center gap-2 px-4 py-4">
          <CheckCircle className="w-5 h-5 text-primary-foreground shrink-0" />
          <p className="text-sm font-semibold text-primary-foreground">등록 완료! 출시되면 가장 먼저 알려드릴게요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-primary">
      <div className="container max-w-4xl mx-auto flex items-center gap-4 px-4 py-3">
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Bell className="w-4 h-4 text-primary-foreground/80" />
          <span className="text-sm font-semibold text-primary-foreground whitespace-nowrap">정식 출시 알림</span>
        </div>
        <div className="sm:hidden flex items-center gap-1.5 shrink-0">
          <Bell className="w-4 h-4 text-primary-foreground/80" />
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="you@company.com"
            className="flex-1 min-w-0 h-10 px-4 rounded-xl bg-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:bg-primary-foreground/20 text-sm font-medium border-0 transition-colors"
          />
          <button
            onClick={handleSubmit}
            className="shrink-0 h-10 px-5 rounded-xl bg-primary-foreground text-primary font-bold text-sm hover:bg-primary-foreground/90 transition-colors whitespace-nowrap"
          >
            알림 받기
          </button>
        </div>
      </div>
    </div>
  );
}
