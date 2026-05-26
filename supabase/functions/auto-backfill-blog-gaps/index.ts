// auto-backfill-blog-gaps
// 매일 09:00 KST(=00:00 UTC) 실행. 최근 7일 중 published=true 글이 0편인 날을 찾아
// 최대 3편까지 generate-blog-post(target_date=...)로 자동 채움.
// 결과는 rlawldns357@gmail.com 으로 이메일 알림.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_EMAIL = "rlawldns357@gmail.com";
const SCAN_DAYS = 7;
const MAX_BACKFILL_PER_RUN = 3;

function getKSTDateString(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function lastNDates(n: number, excludeToday = true): string[] {
  const out: string[] = [];
  const now = new Date();
  const start = excludeToday ? 1 : 0;
  for (let i = start; i < n + start; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    out.push(getKSTDateString(d));
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const sendAlert = async (alertType: string, message: string, details: string[] = []) => {
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "blog-alert",
          recipientEmail: ALERT_EMAIL,
          idempotencyKey: `blog-alert-${alertType}-${new Date().toISOString().slice(0, 13)}`,
          templateData: { alertType, message, details },
        },
      });
    } catch (e) {
      console.warn("alert email failed:", e);
    }
  };

  try {
    const datesToCheck = lastNDates(SCAN_DAYS, true); // 어제부터 7일치
    const earliest = datesToCheck[datesToCheck.length - 1];
    const latest = datesToCheck[0];

    // 한 번에 조회
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("date")
      .eq("published", true)
      .gte("date", earliest)
      .lte("date", latest);
    if (error) throw error;

    const countByDate = new Map<string, number>();
    (posts || []).forEach((p: any) => {
      countByDate.set(p.date, (countByDate.get(p.date) || 0) + 1);
    });

    const missing = datesToCheck.filter((d) => (countByDate.get(d) || 0) === 0);
    const toFill = missing.slice(0, MAX_BACKFILL_PER_RUN).reverse(); // 오래된 날짜부터

    if (toFill.length === 0) {
      // 24h 무발행 체크 (어제+오늘)
      const today = getKSTDateString(new Date());
      const { data: recent } = await supabase
        .from("blog_posts")
        .select("date")
        .eq("published", true)
        .gte("date", datesToCheck[0])
        .lte("date", today)
        .limit(1);
      if (!recent || recent.length === 0) {
        await sendAlert("no_posts_24h", "어제부터 오늘까지 발행된 글이 없습니다. 시스템 점검이 필요합니다.");
      }
      return new Response(JSON.stringify({ ok: true, gaps: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Backfill 시도 (순차)
    const successes: string[] = [];
    const failures: string[] = [];
    for (const date of toFill) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-blog-post`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ target_date: date, force: true, trigger: "auto-backfill" }),
          signal: AbortSignal.timeout(180_000),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.success !== false) {
          successes.push(`${date} — ${json?.slug || json?.title || "생성 완료"}`);
        } else {
          failures.push(`${date} — ${json?.error || json?.message || `HTTP ${res.status}`}`);
        }
      } catch (e) {
        failures.push(`${date} — ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 알림 발송
    if (successes.length > 0) {
      await sendAlert(
        "backfill_success",
        `최근 ${SCAN_DAYS}일 스캔 중 누락된 ${missing.length}일 중 ${successes.length}일치를 자동으로 채웠어요.`,
        [...successes, ...(failures.length ? ["", "실패:", ...failures] : [])],
      );
    } else if (failures.length > 0) {
      await sendAlert(
        "backfill_failed",
        `누락 ${missing.length}일 발견했으나 자동 복구에 모두 실패했어요.`,
        failures,
      );
    }

    return new Response(
      JSON.stringify({ ok: true, missing, attempted: toFill, successes, failures }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sendAlert("backfill_failed", "auto-backfill-blog-gaps 함수 자체가 실패했어요.", [msg]);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
