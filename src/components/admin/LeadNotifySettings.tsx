import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Save, Send, CheckCircle2 } from "lucide-react";

export default function LeadNotifySettings() {
  const [emails, setEmails] = useState("");
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const load = async () => {
    const pw = sessionStorage.getItem("admin_pw") || "";
    const { data } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "getLeadNotifySettings" },
    });
    setEmails(data?.emails || "");
    setInitial(data?.emails || "");
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    const pw = sessionStorage.getItem("admin_pw") || "";
    const { data } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "setLeadNotifySettings", emails: emails.trim() },
    });
    setSaving(false);
    if (data?.success) {
      setInitial(emails.trim());
      setMsg("✓ 저장 완료");
      setTimeout(() => setMsg(""), 2000);
    } else {
      setMsg("저장 실패: " + (data?.error || ""));
    }
  };

  const sendTest = async () => {
    setTesting(true); setMsg("");
    const pw = sessionStorage.getItem("admin_pw") || "";
    const { data } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "sendTestLeadNotify" },
    });
    setTesting(false);
    setMsg(data?.success ? "✓ 테스트 알림 발송됨 (수신함 확인)" : ("발송 실패: " + (data?.error || "")));
  };

  const parsed = emails.split(/[,;\s]+/g).map((s) => s.trim()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  const invalid = emails.split(/[,;\s]+/g).map((s) => s.trim()).filter((s) => s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-4 h-4 text-primary" />
          리드 알림 수신 이메일
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          새 인바운드 리드가 발생할 때 이 주소들로 즉시 이메일 알림을 보냅니다. 쉼표·공백·세미콜론으로 여러 개 입력 가능합니다.
        </p>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="you@company.com, teammate@company.com"
          rows={2}
          className="w-full text-sm bg-background border border-border rounded-md p-2 font-mono"
        />
        <div className="flex flex-wrap gap-1.5 text-xs">
          {parsed.map((e) => (
            <span key={e} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />{e}
            </span>
          ))}
          {invalid.map((e) => (
            <span key={e} className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              ✗ {e}
            </span>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <Button size="sm" onClick={save} disabled={saving || emails.trim() === initial}>
            <Save className="w-3.5 h-3.5 mr-1" />{saving ? "저장 중..." : "저장"}
          </Button>
          <Button size="sm" variant="outline" onClick={sendTest} disabled={testing || parsed.length === 0}>
            <Send className="w-3.5 h-3.5 mr-1" />{testing ? "발송 중..." : "테스트 알림 발송"}
          </Button>
          {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
