import type jsPDF from "jspdf";
import { type DemoResult, type AxisAnalysis } from "@/data/demoResults";

function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

function addWatermark(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.saveGraphicsState();
  // @ts-ignore - jsPDF supports this
  doc.setGState(new doc.GState({ opacity: 0.09 }));
  doc.setTextColor(120, 120, 140);
  
  // Large diagonal watermarks covering the entire page
  const text = "SearchTune OS";
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  
  // Main massive watermark
  doc.setFontSize(96);
  doc.text(text, centerX, centerY, {
    align: "center",
    angle: 35,
  });
  
  // Repeating pattern for full coverage
  doc.setFontSize(48);
  const positions = [
    { x: centerX - 60, y: centerY - 100 },
    { x: centerX + 60, y: centerY - 100 },
    { x: centerX - 60, y: centerY + 100 },
    { x: centerX + 60, y: centerY + 100 },
    { x: centerX, y: centerY - 50 },
    { x: centerX, y: centerY + 50 },
    { x: centerX - 40, y: 40 },
    { x: centerX + 40, y: pageHeight - 40 },
  ];
  positions.forEach(({ x, y }) => {
    doc.text(text, x, y, { align: "center", angle: 35 });
  });
  
  // "BETA" stamp
  doc.setFontSize(120);
  // @ts-ignore
  doc.setGState(new doc.GState({ opacity: 0.05 }));
  doc.setTextColor(100, 100, 120);
  doc.text("BETA", centerX, centerY + 20, {
    align: "center",
    angle: 35,
  });
  
  doc.restoreGraphicsState();
}

function addHeader(doc: jsPDF, url: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Brand header
  doc.setFillColor(22, 22, 30);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("SearchTune OS", 20, 18);
  
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 200);
  doc.text("SEO · AEO · GEO Analysis Report  |  BETA", 20, 28);
  
  doc.setFontSize(8);
  doc.text(url, 20, 36);
  
  // Date
  const date = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  doc.text(date, pageWidth - 20, 36, { align: "right" });
}

function addScoreCards(doc: jsPDF, result: DemoResult, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth = (pageWidth - 60) / 3;
  const axes: { label: string; score: number; color: [number, number, number] }[] = [
    { label: "SEO", score: result.seoScore, color: [67, 97, 238] },
    { label: "AEO", score: result.aeoScore, color: [139, 92, 246] },
    { label: "GEO", score: result.geoScore, color: [34, 197, 94] },
  ];

  axes.forEach((axis, i) => {
    const x = 20 + i * (cardWidth + 10);
    
    // Card bg
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(x, y, cardWidth, 50, 4, 4, "F");
    
    // Label
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 120);
    doc.text(axis.label, x + cardWidth / 2, y + 15, { align: "center" });
    
    // Score
    doc.setFontSize(28);
    doc.setTextColor(...axis.color);
    doc.text(String(axis.score), x + cardWidth / 2, y + 36, { align: "center" });
    
    // Grade
    doc.setFontSize(10);
    doc.text(getGrade(axis.score), x + cardWidth / 2 + 18, y + 36);
  });

  return y + 60;
}

function addAxisDetail(doc: jsPDF, axis: AxisAnalysis, y: number, color: [number, number, number]): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - 40;
  
  // Check if we need a new page
  if (y > 230) {
    doc.addPage();
    addWatermark(doc);
    y = 20;
  }

  // Axis header
  doc.setFontSize(14);
  doc.setTextColor(...color);
  doc.text(`${axis.label} Analysis`, 20, y);
  y += 4;
  
  // Description
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 140);
  const descLines = doc.splitTextToSize(axis.description, maxWidth);
  doc.text(descLines, 20, y + 4);
  y += 4 + descLines.length * 4 + 4;

  // Sub-signals
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 80);
  doc.text("Sub-signals", 20, y);
  y += 6;
  
  axis.subSignals.forEach((sig) => {
    if (y > 270) {
      doc.addPage();
      addWatermark(doc);
      y = 20;
    }
    
    // Bar background
    doc.setFillColor(235, 235, 240);
    doc.roundedRect(20, y - 3, maxWidth, 8, 2, 2, "F");
    
    // Bar fill
    const barWidth = (sig.score / 100) * maxWidth;
    const r = Math.round(color[0] + (235 - color[0]) * 0.5);
    const g = Math.round(color[1] + (235 - color[1]) * 0.5);
    const b = Math.round(color[2] + (235 - color[2]) * 0.5);
    doc.setFillColor(r, g, b);
    doc.roundedRect(20, y - 3, barWidth, 8, 2, 2, "F");
    
    // Label
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 60);
    doc.text(`${sig.name}  ${sig.score}점 (가중치 ${sig.weight}%)`, 24, y + 2);
    y += 12;
  });

  y += 2;

  // Rationale
  if (y > 250) {
    doc.addPage();
    addWatermark(doc);
    y = 20;
  }
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 80);
  doc.text("Score Rationale", 20, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 100);
  const ratLines = doc.splitTextToSize(axis.scoreRationale, maxWidth);
  doc.text(ratLines, 20, y);
  y += ratLines.length * 4 + 4;

  // Issues
  if (axis.issues.length > 0) {
    if (y > 255) {
      doc.addPage();
      addWatermark(doc);
      y = 20;
    }
    doc.setFontSize(9);
    doc.setTextColor(220, 50, 50);
    doc.text("Issues", 20, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 100);
    axis.issues.forEach((issue) => {
      const lines = doc.splitTextToSize(`• ${issue}`, maxWidth - 5);
      doc.text(lines, 24, y);
      y += lines.length * 4 + 2;
    });
    y += 2;
  }

  // Improvements
  if (y > 250) {
    doc.addPage();
    addWatermark(doc);
    y = 20;
  }
  doc.setFontSize(9);
  doc.setTextColor(34, 150, 80);
  doc.text("Improvements", 20, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 100);
  
  const allFixes = [
    axis.priorityFix,
    axis.quickFix,
    ...axis.additionalFixes,
  ].filter(Boolean);
  
  allFixes.forEach((fix) => {
    const lines = doc.splitTextToSize(`▸ ${fix.label}  (${fix.pointRange})`, maxWidth - 5);
    doc.text(lines, 24, y);
    y += lines.length * 4 + 2;
  });

  return y + 6;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 180);
    doc.text(`SearchTune OS  |  searchtuneos.com  |  Page ${i}/${pageCount}`, pageWidth / 2, pageHeight - 8, {
      align: "center",
    });
    doc.text("This report is auto-generated. Scores are estimates, not guarantees.", pageWidth / 2, pageHeight - 4, {
      align: "center",
    });
  }
}

export function generateReportPdf(result: DemoResult, url: string): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Page 1
  addWatermark(doc);
  addHeader(doc, url);
  
  let y = 52;
  y = addScoreCards(doc, result, y);
  y += 4;

  // Verdict
  const totalAvg = Math.round((result.seoScore + result.aeoScore + result.geoScore) / 3);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 80);
  const verdict = totalAvg >= 70
    ? "전반적으로 양호한 상태이지만, 일부 영역에서 개선 여지가 있습니다."
    : totalAvg >= 50
    ? "개선이 필요한 영역이 있습니다. 아래 분석을 확인하세요."
    : "시급한 개선이 필요합니다. 핵심 이슈를 먼저 해결하세요.";
  doc.text(verdict, 20, y);
  y += 10;

  // Axis details
  y = addAxisDetail(doc, result.seoAxis, y, [67, 97, 238]);
  y = addAxisDetail(doc, result.aeoAxis, y, [139, 92, 246]);
  y = addAxisDetail(doc, result.geoAxis, y, [34, 197, 94]);

  // Apply watermark to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    addWatermark(doc);
  }

  addFooter(doc);

  return doc;
}

export function downloadReportPdf(result: DemoResult, url: string) {
  const doc = generateReportPdf(result, url);
  const domain = url.replace(/https?:\/\//, "").replace(/\//g, "");
  doc.save(`SearchTuneOS_Report_${domain}.pdf`);
}
