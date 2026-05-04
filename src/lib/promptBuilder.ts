import type { AxisAnalysis, Improvement } from "@/data/demoResults";

const AXIS_FULLNAME: Record<AxisAnalysis["label"], string> = {
  SEO: "SEO (검색엔진 최적화)",
  AEO: "AEO (Answer Engine Optimization)",
  GEO: "GEO (Generative Engine Optimization)",
};

function safeDomain(url?: string) {
  if (!url) return "내 사이트";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** 개별 개선 과제 한 줄에 붙는 프롬프트 */
export function buildImprovementPrompt(opts: {
  axis: AxisAnalysis;
  score: number;
  improvement: Improvement;
  fixType: "priority" | "quick" | "additional";
  url?: string;
}) {
  const { axis, score, improvement, fixType, url } = opts;
  const domain = safeDomain(url);
  const axisName = AXIS_FULLNAME[axis.label];
  const fixLabel =
    fixType === "priority" ? "가장 먼저 해야 할 개선"
    : fixType === "quick" ? "빠르게 적용 가능한 개선"
    : "추가 개선";

  const issuesBlock = (axis.issues || []).map((i) => `- ${i}`).join("\n") || "- (이슈 정보 없음)";

  return [
    `내 사이트(${domain})의 ${axisName} 점수를 개선하려고 해요.`,
    "",
    `## 현재 상황`,
    `- ${axis.label} 점수: ${score}/100`,
    `- 점수 사유: ${axis.scoreRationale || "-"}`,
    "",
    `## 핵심 이슈`,
    issuesBlock,
    "",
    `## 적용할 개선 (${fixLabel})`,
    `- ${improvement.label}`,
    `- 예상 점수 상승: ${improvement.pointRange}`,
    "",
    `## 요청`,
    "1. 위 개선을 실제로 적용하는 방법을 단계별로 알려주세요.",
    "2. 가능하면 HTML/JSON-LD/메타 태그 등 코드 예시를 함께 보여주세요.",
    "3. 적용 후 어떻게 검증할 수 있는지도 알려주세요.",
  ].join("\n");
}

/** 한 축 전체 진단을 통째로 복사 */
export function buildAxisPrompt(opts: { axis: AxisAnalysis; score: number; url?: string }) {
  const { axis, score, url } = opts;
  const domain = safeDomain(url);
  const axisName = AXIS_FULLNAME[axis.label];

  const issues = (axis.issues || []).map((i) => `- ${i}`).join("\n") || "- (없음)";
  const strengths = (axis.strengths || []).map((i) => `- ${i}`).join("\n") || "- (없음)";
  const fixes: string[] = [];
  if (axis.priorityFix) fixes.push(`- [가장 먼저] ${axis.priorityFix.label} (${axis.priorityFix.pointRange})`);
  if (axis.quickFix) fixes.push(`- [빠른 개선] ${axis.quickFix.label} (${axis.quickFix.pointRange})`);
  for (const f of axis.additionalFixes || []) {
    fixes.push(`- [추가] ${f.label} (${f.pointRange})`);
  }

  return [
    `내 사이트(${domain})의 ${axisName} 진단 결과예요. 개선 액션 플랜을 만들어 주세요.`,
    "",
    `## 점수`,
    `- ${axis.label}: ${score}/100`,
    `- 점수 사유: ${axis.scoreRationale || "-"}`,
    axis.scoreCap ? `- 점수 상한: ${axis.scoreCap}` : "",
    "",
    `## 핵심 이슈`,
    issues,
    "",
    `## 잘된 점`,
    strengths,
    "",
    `## 개선 과제`,
    fixes.join("\n") || "- (없음)",
    "",
    `## 요청`,
    "1. 위 개선들을 우선순위대로 정리해 주세요.",
    "2. 각 항목별로 실제 적용 방법과 코드 예시(HTML, JSON-LD 등)를 보여주세요.",
    "3. 적용 후 검증 방법도 알려주세요.",
  ].filter(Boolean).join("\n");
}
