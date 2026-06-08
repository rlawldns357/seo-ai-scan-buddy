// Threads 룰 엔진 자가 학습 루프
// 최근 큐의 성공/실패 데이터를 분석 → Gemini가 룰을 다듬어 자동 적용(minor +1)
// 인증: body.password === ADMIN_PASSWORD 또는 x-cron-secret 헤더
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body as { password?: string };
    const cronSecret = req.headers.get("x-cron-secret");
    const adminPw = Deno.env.get("ADMIN_PASSWORD");
    const expectedCron = Deno.env.get("CRON_SECRET");
    const isAdmin = adminPw && password === adminPw;
    const isCron = expectedCron && cronSecret === expectedCron;
    if (!isAdmin && !isCron) return json({ error: "인증 실패" }, 401);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY 없음");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) 현재 엔진 설정
    const { data: cfg, error: cfgErr } = await supabase
      .from("threads_engine_config")
      .select("*")
      .eq("config_key", "threads_engine")
      .maybeSingle();
    if (cfgErr || !cfg) throw new Error("엔진 설정 없음");
    const prevVersion = `v${cfg.version_major}.${cfg.version_minor}`;

    // 2) 최근 30일 큐 데이터 수집
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: rows } = await supabase
      .from("social_publish_queue")
      .select("status, body, error_message, retry_count, created_at")
      .eq("platform", "threads")
      .gte("created_at", since)
      .limit(500);

    const items = rows || [];
    const published = items.filter(i => i.status === "published");
    const failed = items.filter(i => i.status === "failed");
    const drafts = items.filter(i => i.status === "draft");
    const total = items.length;
    const successRate = total ? Math.round((published.length / total) * 100) : 0;

    // 본문 통계
    const bodyLens = published.map(i => (i.body || "").length);
    const avgLen = bodyLens.length ? Math.round(bodyLens.reduce((a, b) => a + b, 0) / bodyLens.length) : 0;
    const threadChainCount = published.filter(i => (i.body || "").includes("\n---\n")).length;

    // 실패 사유 그룹
    const failureReasons: Record<string, number> = {};
    for (const f of failed) {
      const msg = (f.error_message || "unknown").slice(0, 80);
      failureReasons[msg] = (failureReasons[msg] || 0) + 1;
    }
    const topFailures = Object.entries(failureReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    // 성공 본문 샘플
    const successSamples = published.slice(0, 8).map(i => (i.body || "").slice(0, 280));

    const metrics = {
      window_days: 30,
      total, published: published.length, failed: failed.length, draft: drafts.length,
      success_rate_pct: successRate,
      avg_body_length: avgLen,
      thread_chain_count: threadChainCount,
      top_failures: topFailures,
    };

    if (total < 3) {
      // 데이터 부족 — 로그만 남기고 종료
      await supabase.from("threads_engine_log").insert({
        kind: "learn", prev_version: prevVersion, new_version: prevVersion,
        summary: "학습 보류: 30일 내 큐 데이터 부족 (3건 미만)",
        metrics, status: "skipped",
      });
      return json({ skipped: true, reason: "데이터 부족", metrics });
    }

    // 3) Gemini에게 룰 개선 요청
    const persona = `${cfg.character_name || "쓰레디"} — ${cfg.character_tagline || "Threads 발행 전문가"}`;
    const sysPrompt = `너는 '${persona}'. SearchTune OS의 Threads 자동 발행 룰 엔진을 자가 학습으로 개선하는 책임자다.

최근 30일 발행 데이터를 분석해서, 현재 룰을 다듬어라.

[현재 룰 ${prevVersion}]
${cfg.rules || "(비어있음)"}

[지표]
${JSON.stringify(metrics, null, 2)}

[성공 발행 본문 샘플]
${successSamples.map((s, i) => `${i + 1}. ${s}`).join("\n")}

[규칙]
1. 실패가 많으면 그 패턴을 룰로 명문화해서 피하게 해라 (예: "Fatal 응답을 피하려면 ..." 같은 구체 지침).
2. 성공 패턴이 명확하면 그걸 룰로 강화해라.
3. 룰 전체 길이는 2000자 이내. 한국어, 항목별 줄바꿈, 결론 먼저.
4. 데이터가 약하면 무리하게 바꾸지 말고 한두 줄만 보강해라.
5. 반드시 다음 JSON 형식으로만 응답해라:
{
  "summary": "이번 학습에서 바꾼 한국어 한 줄 요약 (80자 이내)",
  "new_rules": "전체 새 룰 본문 (이전 룰을 포함해 개선된 완성본)"
}`;

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: sysPrompt }],
        temperature: 0.3,
      }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const aiJson = await res.json();
    const raw = aiJson?.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();

    let parsed: { summary?: string; new_rules?: string };
    try { parsed = JSON.parse(cleaned); }
    catch { throw new Error(`AI 응답 파싱 실패: ${raw.slice(0, 200)}`); }

    const newRules = (parsed.new_rules || "").trim();
    const summary = (parsed.summary || "자동 학습 결과").slice(0, 200);
    if (!newRules || newRules.length < 30) throw new Error("AI가 유효한 새 룰을 반환하지 않음");
    if (newRules === (cfg.rules || "").trim()) {
      await supabase.from("threads_engine_log").insert({
        kind: "learn", prev_version: prevVersion, new_version: prevVersion,
        summary: "학습 결과 변경 없음 — 룰 유지", metrics, status: "noop",
      });
      return json({ unchanged: true, version: prevVersion, metrics });
    }

    // 4) 룰 적용 + minor 버전 +1
    const newMinor = cfg.version_minor + 1;
    const newVersion = `v${cfg.version_major}.${newMinor}`;
    const { error: upErr } = await supabase
      .from("threads_engine_config")
      .update({
        rules: newRules.slice(0, 5000),
        pending_rules: null,
        version_minor: newMinor,
        updated_at: new Date().toISOString(),
      })
      .eq("config_key", "threads_engine");
    if (upErr) throw upErr;

    // 5) 쓰레드튜너 대화 로그에 시스템 메시지로 학습 기록 남기기 → 다음 chat에서 컨텍스트로 활용
    await supabase.from("threads_engine_chat").insert({
      role: "system",
      content: `[자가 학습 ${newVersion}] ${summary}\n지표: 발행 ${published.length} · 실패 ${failed.length} · 성공률 ${successRate}%`,
    }).then(() => {}).catch(() => {});

    // 6) 학습 로그
    await supabase.from("threads_engine_log").insert({
      kind: "learn", prev_version: prevVersion, new_version: newVersion,
      summary, metrics, status: "success",
    });

    return json({
      applied: true,
      prev_version: prevVersion,
      new_version: newVersion,
      summary,
      metrics,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabase.from("threads_engine_log").insert({
        kind: "learn", status: "error", summary: "학습 실패", error: msg.slice(0, 500),
      });
    } catch (_) { /* noop */ }
    return json({ error: msg }, 500);
  }
});
