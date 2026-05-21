import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink } from "lucide-react";

const SITE = "https://searchtuneos.com";
const PROBE_SLUGS = ["what-is-aeo", "seo-vs-aeo-vs-geo", "faq-schema-aeo-boost", "geo-generative-engine-optimization", "ai-crawler-access"];

type Status = "pass" | "warn" | "fail" | "pending";

interface QaCheck { status: Status; detail: string }
interface QaJson {
  generatedAt: string;
  source: string;
  checks: Record<string, QaCheck>;
  remaining: string[];
}
interface AuditPost { slug: string; severity: string; issues: string[] }
interface AuditJson {
  summary: { totalPosts: number; bySeverity: Record<string, number>; issueCounts: Record<string, number> };
  posts: AuditPost[];
}
interface ProbeResult { slug: string; ok: boolean; httpStatus: number | null; canonical: string | null; hasTldr: boolean; note: string }

const TONE: Record<Status, { Icon: typeof CheckCircle2; cls: string; label: string }> = {
  pass:    { Icon: CheckCircle2,   cls: "text-emerald-600 bg-emerald-500/10", label: "PASS" },
  warn:    { Icon: AlertTriangle,  cls: "text-amber-600 bg-amber-500/10",     label: "WARN" },
  fail:    { Icon: XCircle,        cls: "text-destructive bg-destructive/10", label: "FAIL" },
  pending: { Icon: RefreshCw,      cls: "text-muted-foreground bg-muted",     label: "…" },
};

function StatusPill({ status }: { status: Status }) {
  const t = TONE[status];
  const Icon = t.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono ${t.cls}`}>
      <Icon className="w-3 h-3" />
      {t.label}
    </span>
  );
}

export default function QaStatus() {
  const [qa, setQa] = useState<QaJson | null>(null);
  const [audit, setAudit] = useState<AuditJson | null>(null);
  const [probes, setProbes] = useState<ProbeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qaRes, auditRes] = await Promise.all([
        fetch("/qa/status.json", { cache: "no-store" }).then(r => r.ok ? r.json() : null),
        fetch("/qa/blog-audit.json", { cache: "no-store" }).then(r => r.ok ? r.json() : null),
      ]);
      setQa(qaRes);
      setAudit(auditRes);

      // Live canonical probe — fetch each .html and verify canonical + TL;DR text
      const results = await Promise.all(PROBE_SLUGS.map(async (slug): Promise<ProbeResult> => {
        const url = `${SITE}/blog/${slug}.html`;
        try {
          const r = await fetch(url, { cache: "no-store" });
          const text = r.ok ? await r.text() : "";
          const canonical = (text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || null;
          const hasTldr = /TL;?DR|핵심 요약|3줄 요약/i.test(text);
          const ok = r.ok && !!canonical && canonical.endsWith(`.html`);
          return { slug, ok, httpStatus: r.status, canonical, hasTldr, note: ok ? "canonical .html OK" : "canonical mismatch or non-200" };
        } catch (e) {
          return { slug, ok: false, httpStatus: null, canonical: null, hasTldr: false, note: String(e) };
        }
      }));
      setProbes(results);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const auditSeverity = audit?.summary.bySeverity || {};
  const auditStatus: Status = (auditSeverity.high || 0) > 0 ? "fail" : (auditSeverity.medium || 0) > 2 ? "warn" : "pass";
  const probeFail = probes.filter(p => !p.ok).length;
  const probeStatus: Status = probes.length === 0 ? "pending" : probeFail > 0 ? "fail" : "pass";

  return (
    <div className="space-y-6">
      <Helmet><title>QA Status — SearchTune OS Admin</title><meta name="robots" content="noindex,nofollow" /></Helmet>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">QA Status (read-only)</h1>
          <p className="text-sm text-muted-foreground">tests · build · prerender · live canonical · blog audit · lint 요약. 자동 수정 버튼 없음.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />새로고침
        </Button>
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}

      {/* Static QA snapshot (Hermes / CI 작성) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">빌드 / 테스트 / 린트 스냅샷</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!qa && <p className="text-xs text-muted-foreground">/qa/status.json 없음 — Hermes 실행 후 갱신됩니다.</p>}
          {qa && (
            <>
              <p className="text-xs text-muted-foreground font-mono">
                생성: {qa.generatedAt} · 소스: {qa.source}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(qa.checks).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 p-2 rounded border border-border">
                    <StatusPill status={v.status} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{k}</div>
                      <div className="text-xs text-muted-foreground break-words">{v.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              {qa.remaining?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold mb-1">남은 수동 작업</div>
                  <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                    {qa.remaining.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Live canonical probe */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">Live canonical probe <StatusPill status={probeStatus} /></CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">production HTML을 직접 fetch해서 canonical link와 TL;DR 텍스트 존재 여부를 검사합니다.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="py-1">slug</th><th>HTTP</th><th>canonical</th><th>TL;DR</th><th>비고</th><th></th>
                </tr>
              </thead>
              <tbody>
                {probes.map(p => (
                  <tr key={p.slug} className="border-b last:border-0">
                    <td className="py-1 font-mono">{p.slug}</td>
                    <td>{p.httpStatus ?? "-"}</td>
                    <td className="font-mono text-[10px] break-all">{p.canonical || "—"}</td>
                    <td>{p.hasTldr ? "✓" : "—"}</td>
                    <td className="text-muted-foreground">{p.note}</td>
                    <td>
                      <a href={`${SITE}/blog/${p.slug}.html`} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        열기<ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
                {probes.length === 0 && <tr><td colSpan={6} className="py-3 text-muted-foreground">불러오는 중…</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Blog growth-loop audit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">블로그 성장 루프 감사 <StatusPill status={auditStatus} /></CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!audit && <p className="text-xs text-muted-foreground">/qa/blog-audit.json 없음 — `node scripts/audit-blog-growth-loop.mjs` 후 public/qa/blog-audit.json 갱신.</p>}
          {audit && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(audit.summary.bySeverity).map(([k, v]) => (
                  <span key={k} className="px-2 py-1 rounded bg-muted font-mono">{k}: <strong>{v}</strong></span>
                ))}
                <span className="px-2 py-1 rounded bg-muted font-mono">total: <strong>{audit.summary.totalPosts}</strong></span>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1">이슈 카운트</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(audit.summary.issueCounts).map(([k, v]) => (
                    <span key={k} className="px-2 py-1 rounded bg-amber-500/10 text-amber-700 font-mono">{k}: <strong>{v}</strong></span>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground border-b">
                    <tr className="text-left"><th className="py-1">slug</th><th>severity</th><th>issues</th></tr>
                  </thead>
                  <tbody>
                    {audit.posts
                      .filter(p => p.severity !== "ok")
                      .sort((a, b) => b.issues.length - a.issues.length)
                      .slice(0, 20)
                      .map(p => (
                      <tr key={p.slug} className="border-b last:border-0">
                        <td className="py-1 font-mono">{p.slug}</td>
                        <td>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            p.severity === "high" ? "bg-destructive/15 text-destructive" :
                            p.severity === "medium" ? "bg-amber-500/15 text-amber-700" :
                            "bg-muted text-muted-foreground"
                          }`}>{p.severity}</span>
                        </td>
                        <td className="text-muted-foreground break-words">{p.issues.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        ※ 이 화면은 read-only 요약입니다. 위험한 자동 수정 버튼은 의도적으로 노출하지 않습니다. 실제 수정은 Lovable 에디터에서 배치 단위로 진행하세요.
      </p>
    </div>
  );
}
