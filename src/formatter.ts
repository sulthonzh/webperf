import chalk from "chalk";
import Table from "cli-table3";
import type { AuditReport } from "./cli";

interface FormatOptions {
  quiet?: boolean;
}

function fmt(tpl: TemplateStringsArray, ...vals: any[]): string {
  return String.raw(tpl, ...vals);
}

export function formatReport(report: AuditReport, opts: FormatOptions = {}): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold("  Performance Audit: " + report.url));
  lines.push(chalk.dim("  " + formatTimestamp(report.timestamp)));
  lines.push("");

  // Score summary
  const table = new Table({
    head: ["Category", "Score"],
    colWidths: [22, 12],
    style: { head: ["bold"] },
  });

  for (const [cat, score] of Object.entries(report.scores)) {
    table.push([formatCategoryName(cat), colorScore(score)]);
  }
  lines.push(table.toString());
  lines.push("");

  // Core Web Vitals
  if (report.metrics) {
    lines.push(chalk.bold("  Core Web Vitals"));
    lines.push("");

    const vitalsTable = new Table({
      head: ["Metric", "Value", "Rating"],
      colWidths: [28, 14, 12],
      style: { head: ["bold"] },
    });

    const m = report.metrics;
    if (m.fcp !== undefined) vitalsTable.push(["First Contentful Paint", m.fcp + " ms", rateFCP(m.fcp)]);
    if (m.lcp !== undefined) vitalsTable.push(["Largest Contentful Paint", m.lcp + " ms", rateLCP(m.lcp)]);
    if (m.cls !== undefined) vitalsTable.push(["Cumulative Layout Shift", String(m.cls), rateCLS(m.cls)]);
    if (m.tbt !== undefined) vitalsTable.push(["Total Blocking Time", m.tbt + " ms", rateTBT(m.tbt)]);
    if (m.si !== undefined) vitalsTable.push(["Speed Index", m.si + " ms", rateSI(m.si)]);
    if (m.tti !== undefined) vitalsTable.push(["Time to Interactive", m.tti + " ms", rateTTI(m.tti)]);
    if (m.ttfb !== undefined) vitalsTable.push(["Time to First Byte", m.ttfb + " ms", rateTTFB(m.ttfb)]);

    lines.push(vitalsTable.toString());
    lines.push("");
  }

  // Suggestions
  if (!opts.quiet && report.suggestions.length > 0) {
    lines.push(chalk.bold("  Top Suggestions"));
    lines.push("");

    const impactColors: Record<string, (s: string) => string> = {
      high: (s) => chalk.red(s),
      medium: (s) => chalk.yellow(s),
      low: (s) => chalk.dim(s),
    };

    for (const s of report.suggestions.slice(0, 10)) {
      const c = impactColors[s.impact] || ((s) => chalk.dim(s));
      const impact = c("[" + s.impact.toUpperCase() + "]");
      lines.push("  " + impact + " " + s.title);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function formatJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

function formatCategoryName(cat: string): string {
  const names: Record<string, string> = {
    performance: "Performance",
    accessibility: "Accessibility",
    "best-practices": "Best Practices",
    seo: "SEO",
    pwa: "PWA",
  };
  return names[cat] || cat;
}

function colorScore(score: number): string {
  if (score >= 90) return chalk.green(score + "/100");
  if (score >= 50) return chalk.yellow(score + "/100");
  return chalk.red(score + "/100");
}

function rateFCP(ms: number): string {
  if (ms <= 1800) return chalk.green("good");
  if (ms <= 3000) return chalk.yellow("needs work");
  return chalk.red("poor");
}

function rateLCP(ms: number): string {
  if (ms <= 2500) return chalk.green("good");
  if (ms <= 4000) return chalk.yellow("needs work");
  return chalk.red("poor");
}

function rateCLS(val: number): string {
  if (val <= 0.1) return chalk.green("good");
  if (val <= 0.25) return chalk.yellow("needs work");
  return chalk.red("poor");
}

function rateTBT(ms: number): string {
  if (ms <= 200) return chalk.green("good");
  if (ms <= 600) return chalk.yellow("needs work");
  return chalk.red("poor");
}

function rateSI(ms: number): string {
  if (ms <= 3400) return chalk.green("good");
  if (ms <= 5800) return chalk.yellow("needs work");
  return chalk.red("poor");
}

function rateTTI(ms: number): string {
  if (ms <= 3800) return chalk.green("good");
  if (ms <= 7300) return chalk.yellow("needs work");
  return chalk.red("poor");
}

function rateTTFB(ms: number): string {
  if (ms <= 800) return chalk.green("good");
  if (ms <= 1800) return chalk.yellow("needs work");
  return chalk.red("poor");
}
