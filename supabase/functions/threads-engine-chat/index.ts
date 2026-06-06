// Threads 룰 엔진 — 캐릭터 '쓰레디'가 대화로 룰을 다듬는다
// actions:
//   - state:  현재 config(캐릭터 포함) + 최근 대화 100개 반환
//   - chat:   유저 메시지를 받아 쓰레디(페르소나)로 응답, 둘 다 저장, minor 버전 +1
//             AI가 룰 변경을 제안하면 PROPOSED_RULES 블록 → pending_rules에 저장
//   - apply:  pending_rules 확정 → rules 교체, major +1, minor=0
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
      temperature: 0.5,
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
    if (!adminPassword || password !== adminPassword) return json({ error: "인증 실패" }, 401);

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

      const { data: recent } = await supabase
        .from("threads_engine_chat")
        .select("role, content")
        .order("created_at", { ascending: false })
        .limit(16);
      const history = (recent || []).reverse();

      const versionStr = `v${cfg.version_major}.${cfg.version_minor}`;
      const characterName = cfg.character_name || "쓰레디";
      const characterTagline = cfg.character_tagline || "Threads 발행 전문가";
      const characterVoice = cfg.character_voice || "친근한 마케터 톤, 반말, 결론 먼저.";
      const apiKnowledge = cfg.api_knowledge || "";

      const sysPrompt = `너는 '${characterName}' — ${characterTagline}다. SearchTune OS의 Threads 자동 발행을 책임지는 룰 엔진 캐릭터.

[너의 말투]
${characterVoice}

[Meta Threads Graph API 지식 베이스]
${apiKnowledge || "(아직 학습되지 않음)"}

[현재 룰 (${versionStr})]
${cfg.rules}

${cfg.pending_rules ? `[대기 중인 변경안]\n${cfg.pending_rules}\n` : ""}
[너의 역할]
- 위 API 지식과 너의 말투를 항상 고려해서 답변한다 (예: 500자 한도, 첫 줄 80자, 해시태그 1개 등)
- 사용자가 구체적인 룰 변경(예: "이모지 빼", "더 짧게", "질문형으로 통일")을 요청하면, 새로운 전체 룰 텍스트를 다음 형식으로 응답 끝에 포함:
  PROPOSED_RULES:
  <변경된 전체 룰 텍스트(불릿 포함)>
  END_RULES
- 단순 질문/논의면 PROPOSED_RULES 블록을 넣지 말 것
- 답변 본문은 너의 말투로 2~3문장 + (필요시) PROPOSED_RULES 블록`;

      let aiText = "";
      try {
        aiText = await callAI(sysPrompt, [...history, { role: "user", content: message }], lovableKey);
      } catch (e) {
        aiText = `(AI 호출 실패: ${e instanceof Error ? e.message : String(e)})`;
      }

      let proposed: string | null = null;
      const m = aiText.match(/PROPOSED_RULES:\s*\n([\s\S]*?)\nEND_RULES/);
      if (m) proposed = m[1].trim();

      // 변경안이 있으면 즉시 적용 (메이저 +1), 없으면 마이너 +1
      let newMajor = cfg.version_major;
      let newMinor = cfg.version_minor + 1;
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (proposed) {
        newMajor = cfg.version_major + 1;
        newMinor = 0;
        update.rules = proposed;
        update.pending_rules = null;
        update.version_major = newMajor;
        update.version_minor = 0;
      } else {
        update.version_minor = newMinor;
      }

      const versionAfter = `v${newMajor}.${newMinor}`;

      await supabase.from("threads_engine_chat").insert([
        { role: "user", content: message, version_at: versionStr },
        { role: "assistant", content: aiText, version_at: versionAfter },
      ]);

      await supabase.from("threads_engine_config").update(update).eq("config_key", "threads_engine");

      if (proposed) {
        const charName = cfg.character_name || "쓰레디";
        await supabase.from("threads_engine_chat").insert({
          role: "system",
          content: `🚀 ${charName} ${versionAfter} 자동 배포! 새 룰이 다음 자동 생성부터 적용됩니다.`,
          version_at: versionAfter,
        });
      }

      return json({
        reply: aiText,
        applied_rules: proposed,
        version: { major: newMajor, minor: newMinor },
      });
    }

    // --- apply ---
    if (action === "apply") {
      const { rules: directRules } = body as { rules?: string };
      const newRules = (directRules?.trim() || cfg.pending_rules?.trim() || "").trim();
      if (!newRules) throw new Error("적용할 룰이 없습니다");

      const newMajor = cfg.version_major + 1;
      const versionStr = `v${newMajor}.0`;
      const characterName = cfg.character_name || "쓰레디";

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
        content: `🚀 ${characterName} ${versionStr} 배포! 새 룰이 다음 자동 생성부터 적용됩니다.`,
        version_at: versionStr,
      });

      return json({ success: true, version: { major: newMajor, minor: 0 }, rules: newRules });
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
