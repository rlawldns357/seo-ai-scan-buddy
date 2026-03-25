import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { unlockWithEmail } from "@/lib/rateLimit";

interface RateLimitBannerProps {
  remaining: number;
  emailUnlocked: boolean;
  onUnlocked: () => void;
}

const RateLimitBanner = ({ remaining, emailUnlocked, onUnlocked }: RateLimitBannerProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (remaining > 0) return null;

  const handleUnlock = async () => {
    if (!email || !email.includes("@")) {
      setError("올바른 이메일을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Save email as lead
      await supabase.from("email_leads").insert({ email, source: "rate_limit_unlock" });

      // Unlock bonus
      const result = await unlockWithEmail(email);
      if (result.allowed) {
        onUnlocked();
      } else {
        setError("오늘 사용량을 모두 소진했어요. 내일 다시 시도해 주세요.");
      }
    } catch {
      setError("오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-5 text-center animate-fade-up">
      <div className="text-2xl mb-2">🔒</div>
      <p className="text-sm font-semibold text-foreground mb-1">
        오늘 무료 분석 횟수를 모두 사용했어요
      </p>
      {!emailUnlocked ? (
        <>
          <p className="text-xs text-muted-foreground mb-4">
            이메일을 입력하면 <span className="font-bold text-accent">5회 추가</span> 분석할 수 있어요!
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder="email@example.com"
              className="flex-1 h-10 px-4 rounded-xl border border-input bg-muted/30 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="h-10 px-5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "처리 중..." : "추가 분석 받기"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          내일 다시 방문해 주세요! 매일 무료로 분석할 수 있어요. 🙂
        </p>
      )}
    </div>
  );
};

export default RateLimitBanner;
