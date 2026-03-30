import { useState } from "react";
import { Search, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export default function StickyBottomCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;

    setStatus("loading");
    try {
      const { error } = await supabase.from("email_leads").insert({
        email: trimmed,
        source: "sticky_cta",
      });

      if (!error || error.code === "23505") {
        setStatus("success");
        trackEvent("sticky_email_submit", { email: trimmed });
        if (!error) {
          // Send confirmation email (fire-and-forget)
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "lead-confirmation",
              recipientEmail: trimmed,
              idempotencyKey: `lead-confirm-${trimmed}`,
            },
          });
        }
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border">
        <div className="container max-w-4xl mx-auto flex items-center justify-center gap-1.5 px-3 py-2 sm:py-3">
          <CheckCircle className="w-3.5 h-3.5 text-score-excellent shrink-0" />
          <p className="text-xs sm:text-sm font-medium text-foreground">등록 완료! 출시되면 가장 먼저 알려드릴게요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border">
      {/* Desktop layout */}
      <div className="hidden sm:flex container max-w-4xl mx-auto items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="gradient-primary rounded-lg p-1.5">
              <Search className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">SearchTune <span className="font-extrabold">OS</span></span>
          </div>
          <div className="w-px h-6 bg-border" />
          <p className="text-xs text-muted-foreground">
            정식 출시되면 가장 먼저 알려드릴게요
          </p>
        </div>
        <div className="flex-1 flex gap-2 justify-end">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="you@company.com"
            className="flex-1 max-w-[240px] min-w-0 h-9 px-3 rounded-lg border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className="shrink-0 h-9 px-4 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50"
          >
            {status === "loading" ? "..." : "알림 받기"}
          </button>
        </div>
      </div>

      {/* Mobile layout: 2-row full-width */}
      <div className="sm:hidden px-3 py-2.5 space-y-2">
        <p className="text-center text-[11px] font-medium text-muted-foreground">
          🚀 <span className="font-bold text-foreground">SearchTune OS</span> 정식 출시 알림을 받아보세요
        </p>
        <div className="flex gap-1.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="you@company.com"
            className="flex-1 min-w-0 h-10 px-3 rounded-full border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className="shrink-0 h-10 px-5 rounded-full gradient-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50"
          >
            {status === "loading" ? "..." : "알림 받기"}
          </button>
        </div>
      </div>
    </div>
  );
}
