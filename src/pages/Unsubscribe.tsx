import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("error");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) { setStatus("error"); return; }
      if (data?.success) { setStatus("success"); }
      else if (data?.reason === "already_unsubscribed") { setStatus("already"); }
      else { setStatus("error"); }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          {status === "loading" && <p className="text-muted-foreground">확인 중...</p>}
          {status === "valid" && (
            <>
              <h1 className="text-xl font-bold text-foreground">이메일 수신 거부</h1>
              <p className="text-sm text-muted-foreground">더 이상 이메일을 받지 않으시겠어요?</p>
              <button
                onClick={handleUnsubscribe}
                className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                수신 거부 확인
              </button>
            </>
          )}
          {status === "success" && (
            <>
              <h1 className="text-xl font-bold text-foreground">수신 거부 완료</h1>
              <p className="text-sm text-muted-foreground">이메일 수신이 해제되었습니다.</p>
            </>
          )}
          {status === "already" && (
            <>
              <h1 className="text-xl font-bold text-foreground">이미 수신 거부됨</h1>
              <p className="text-sm text-muted-foreground">이미 이메일 수신이 해제된 상태입니다.</p>
            </>
          )}
          {status === "invalid" && (
            <>
              <h1 className="text-xl font-bold text-foreground">유효하지 않은 링크</h1>
              <p className="text-sm text-muted-foreground">토큰이 유효하지 않거나 만료되었습니다.</p>
            </>
          )}
          {status === "error" && (
            <>
              <h1 className="text-xl font-bold text-foreground">오류 발생</h1>
              <p className="text-sm text-muted-foreground">일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Unsubscribe;
