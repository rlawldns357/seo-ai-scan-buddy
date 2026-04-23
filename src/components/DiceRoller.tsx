import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface DiceRollerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle: string;
  onSuccess: () => void;
}

type Phase = "idle" | "rolling" | "generating" | "success" | "error";

const FACES = [1, 2, 3, 4, 5, 6];

export default function DiceRoller({ open, onOpenChange, postId, postTitle, onSuccess }: DiceRollerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [face, setFace] = useState(1);
  const [error, setError] = useState<string>("");
  const [balance, setBalance] = useState<{ balance: number; addon: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setError("");
    void loadBalance();
  }, [open]);

  // Spin while rolling/generating
  useEffect(() => {
    if (phase !== "rolling" && phase !== "generating") return;
    const id = setInterval(() => {
      setFace(FACES[Math.floor(Math.random() * 6)]);
    }, 120);
    return () => clearInterval(id);
  }, [phase]);

  const loadBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("regeneration_credits")
      .select("balance, addon_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setBalance({ balance: data?.balance ?? 0, addon: data?.addon_balance ?? 0 });
  };

  const total = (balance?.balance ?? 0) + (balance?.addon ?? 0);

  const handleRoll = async () => {
    if (total < 1) {
      setError("크레딧이 부족해요.");
      return;
    }
    setPhase("rolling");
    setError("");

    // Visual roll for ~1.2s before kicking off the request
    await new Promise((r) => setTimeout(r, 1200));
    setPhase("generating");

    try {
      const { data, error } = await supabase.functions.invoke("regenerate-post", {
        body: { postId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Final face = 1~6 random
      const final = 1 + Math.floor(Math.random() * 6);
      setFace(final);
      setPhase("success");
      setBalance({ balance: data.newBalance ?? 0, addon: data.newAddon ?? 0 });
      toast({ title: `🎲 ${final} 나왔어요!`, description: "글이 새로 굴러갔어요." });
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "재생성에 실패했어요.";
      setError(msg);
      setPhase("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            주사위 굴려 다시 쓰기
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{postTitle}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <Dice face={face} spinning={phase === "rolling" || phase === "generating"} />

          <div className="text-center space-y-1 min-h-[48px]">
            {phase === "idle" && (
              <p className="text-sm text-muted-foreground">
                주사위를 굴리면 같은 주제로 완전히 새 버전이 만들어져요.
              </p>
            )}
            {phase === "rolling" && (
              <p className="text-sm text-muted-foreground">주사위 굴리는 중…</p>
            )}
            {phase === "generating" && (
              <p className="text-sm text-muted-foreground">AI가 새 글을 쓰고 있어요…</p>
            )}
            {phase === "success" && (
              <p className="text-sm text-primary font-semibold">새 버전이 발행됐어요! ✨</p>
            )}
            {phase === "error" && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="w-full rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">남은 크레딧</span>
            <span className="font-semibold">
              🎲 {total}
              {balance && balance.addon > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({balance.balance} + {balance.addon} 추가)
                </span>
              )}
            </span>
          </div>

          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={phase === "rolling" || phase === "generating"}
            >
              {phase === "success" ? "닫기" : "취소"}
            </Button>
            <Button
              className="flex-1"
              onClick={handleRoll}
              disabled={
                phase === "rolling" ||
                phase === "generating" ||
                phase === "success" ||
                total < 1
              }
            >
              {phase === "error" ? "다시 굴리기" : `🎲 굴리기 (1 크레딧)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Dice({ face, spinning }: { face: number; spinning: boolean }) {
  return (
    <div
      className={`relative w-24 h-24 rounded-2xl border-2 border-border bg-card shadow-lg grid place-items-center transition-transform duration-150 ${
        spinning ? "animate-[diceSpin_0.6s_ease-in-out_infinite]" : ""
      }`}
      style={{
        // inline keyframes via tailwind-friendly arbitrary; fallback below
      }}
    >
      <DiceFace n={face} />
      <style>{`
        @keyframes diceSpin {
          0%   { transform: rotate(0deg) scale(1); }
          25%  { transform: rotate(90deg) scale(1.05); }
          50%  { transform: rotate(180deg) scale(0.95); }
          75%  { transform: rotate(270deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>
    </div>
  );
}

function DiceFace({ n }: { n: number }) {
  // Pip layout per face (1..6) on a 3x3 grid
  const layouts: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const dots = new Set(layouts[n] ?? [4]);
  return (
    <div className="grid grid-cols-3 gap-1.5 p-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${dots.has(i) ? "bg-foreground" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}
