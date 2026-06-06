// Threads 룰 엔진 — 대화로 룰을 다듬고 버전을 올린다
// actions:
//   - state:  현재 config + 최근 대화 50개 반환
//   - chat:   유저 메시지를 받아 AI 응답 생성, 둘 다 저장, minor 버전 +1
//             AI가 룰 변경을 제안하면 pending_rules에 저장 (구조: "PROPOSED_RULES:\n...")
//   - apply:  pending_rules(또는 직접 전달된 rules)를 확정 → rules 교체, major +1, minor=0
//   - reset:  pending_rules 폐기

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAI(systemPrompt: string, history: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map(h => ({ role: h.role === "system" ? "assistant" : h.role, content: h.content })),
  ];
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  return j?.choices?.[0]?.message?.content?.trim() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { password, action } = body as { password?: string; action?: string };
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPassword || password !== adminPassword) {
      return json({ error: "인증 실패" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- state ---
    if (action === "state") {
      const [cfgRes, chatRes] = await Promise.all([
        supabase.from("threads_engine_config").select("*").eq("config_key", "threads_engine").maybeSingle(),
        supabase.from("threads_engine_chat").select("*").order("created_at", { ascending: true }).limit(100),
      ]);
      if (cfgRes.error) throw cfgRes.error;
      return json({ config: cfgRes.data, chat: chatRes.data || [] });
    }

    // 공통: 현재 설정 로드
    const { data: cfg, error: cfgErr } = await supabase
      .from("threads_engine_config")
      .select("*")
      .eq("config_key", "threads_engine")
      .maybeSingle();
    if (cfgErr || !cfg) throw new Error("엔진 설정을 찾을 수 없습니다");

    // --- chat ---
    if (action === "chat") {
      const { message } = body as { message?: string };
      if (!message?.trim()) throw new Error("message 필수");

      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableKey) throw new Error("LOVABLE_API_KEY 없음");

      // 최근 대화 16개 가져오기 (컨텍스트)
      const { data: recent } = await supabase
        .from("threads_engine_chat")
        .select("role, content")
        .order("created_at", { ascending: false })
        .limit(16);
      const history = (recent || []).reverse();

      const versionStr = `v${cfg.version_major}.${cfg.version_minor}`;
      const sysPrompt = `너는 'Threads 룰 엔진'이다. 사용자는 Threads 자동 발행 훅 카피의 규칙을 너와 대화하며 다듬는다.

[현재 룰 (${versionStr})]
${cfg.rules}

${cfg.pending_rules ? `[대기 중인 변경안]\n${cfg.pending_rules}\n` : ""}
[너의 역할]
- 사용자가 구체적인 변경(예: "이모지 빼", "더 짧게", "질문형으로 통일")을 요청하면, 새로운 전체 룰 텍스트를 다음 형식으로 응답에 포함:
  PROPOSED_RULES:
  <변경된 전체 룰 텍스트(불릿 포함)>
  END_RULES
- 단순 질문/논의면 PROPOSED_RULES 블록을 넣지 말 것
- 응답은 한국어, 친근하고 간결한 톤
- 답변 본문은 2~3문장 + (필요시) PROPOSED_RULES 블록`;

      let aiText = "";
      try {
        aiText = await callAI(sysPrompt, [...history, { role: "user", content: message }], lovableKey);
      } catch (e) {
        aiText = `(AI 호출 실패: ${e instanceof Error ? e.message : String(e)})`;
      }

      // PROPOSED_RULES 추출
      let proposed: string | null = null;
      const m = aiText.match(/PROPOSED_RULES:\s*\n([\s\S]*?)\nEND_RULES/);
      if (m) proposed = m[1].trim();

      // 버전 minor +1
      const newMinor = cfg.version_minor + 1;
      const newVersion = `v${cfg.version_major}.${newMinor}`;

      // 저장 (사용자 메시지 + AI 응답)
      await supabase.from("threads_engine_chat").insert([
        { role: "user", content: message, version_at: versionStr },
        { role: "assistant", content: aiText, version_at: newVersion },
      ]);

      const update: Record<string, unknown> = {
        version_minor: newMinor,
        updated_at: new Date().toISOString(),
      };
      if (proposed) update.pending_rules = proposed;

      await supabase
        .from("threads_engine_config")
        .update(update)
        .eq("config_key", "threads_engine");

      return json({
        reply: aiText,
        proposed_rules: proposed,
        version: { major: cfg.version_major, minor: newMinor },
      });
    }

    // --- apply ---
    if (action === "apply") {
      const { rules: directRules } = body as { rules?: string };
      const newRules = (directRules?.trim() || cfg.pending_rules?.trim() || "").trim();
      if (!newRules) throw new Error("적용할 룰이 없습니다");

      const newMajor = cfg.version_major + 1;
      const versionStr = `v${newMajor}.0`;

      await supabase
        .from("threads_engine_config")
        .update({
          rules: newRules,
          pending_rules: null,
          version_major: newMajor,
          version_minor: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("config_key", "threads_engine");

      await supabase.from("threads_engine_chat").insert({
        role: "system",
        content: `🚀 엔진 ${versionStr} 배포! 새 룰이 다음 자동 생성부터 적용됩니다.`,
        version_at: versionStr,
      });

      return json({
        success: true,
        version: { major: newMajor, minor: 0 },
        rules: newRules,
      });
    }

    // --- reset ---
    if (action === "reset") {
      await supabase
        .from("threads_engine_config")
        .update({ pending_rules: null, updated_at: new Date().toISOString() })
        .eq("config_key", "threads_engine");
      return json({ success: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
