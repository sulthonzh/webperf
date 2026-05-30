#!/usr/bin/env node

import { runAudit } from "./auditor";
import { formatReport, formatJson } from "./formatter";
import { saveReport } from "./saver";
import { validateUrl } from "./utils";

interface CLiArgs {
  url: string;
  json?: boolean;
  output?: string;
  runs?: number;
  categories?: string[];
  mobile?: boolean;
  quiet?: boolean;
}

async function main() {
  const args = require("yargs")
    .usage("Usage: $0 <url> [options]")
    .demandCommand(1, "You must provide a URL to audit")
    .option("json", {
      alias: "j",
      type: "boolean",
      description: "Output results as JSON",
    })
    .option("output", {
      alias: "o",
      type: "string",
      description: "Save report to file (html or json)",
    })
    .option("runs", {
      alias: "n",
      type: "number",
      default: 1,
      description: "Number of audit runs (averages scores)",
    })
    .option("categories", {
      alias: "c",
      type: "array",
      choices: ["performance", "accessibility", "best-practices", "seo", "pwa"],
      description: "Categories to audit (default: all)",
    })
    .option("mobile", {
      alias: "m",
      type: "boolean",
      default: true,
      description: "Use mobile emulation (default: true)",
    })
    .option("quiet", {
      alias: "q",
      type: "boolean",
      description: "Only show scores, skip suggestions",
    })
    .parse();

  const url = args._[0] as string;

  if (!validateUrl(url)) {
    console.error(`Invalid URL: ${url}`);
    console.error("Make sure to include the protocol (https://)");
    process.exit(1);
  }

  const categories = mapCategories(args.categories);
  const runs = Math.min(Math.max(args.runs || 1, 1), 5);

  if (!args.quiet && !args.json) {
    console.log(`Auditing ${url}...`);
    if (runs > 1) console.log(`Running ${runs} time(s) and averaging scores`);
  }

  try {
    const reports = [];
    for (let i = 0; i < runs; i++) {
      if (runs > 1 && !args.quiet && !args.json) {
        console.log(`Run ${i + 1}/${runs}...`);
      }
      const report = await runAudit(url, {
        categories,
        mobile: args.mobile !== false,
      });
      reports.push(report);
    }

    const averaged = averageReports(reports);

    if (args.json) {
      console.log(formatJson(averaged));
    } else {
      console.log(formatReport(averaged, { quiet: args.quiet }));
    }

    if (args.output) {
      await saveReport(averaged, args.output, args.json);
      if (!args.json) console.log(`\nReport saved to ${args.output}`);
    }
  } catch (err: any) {
    console.error(`Audit failed: ${err.message}`);
    process.exit(1);
  }
}

function mapCategories(cats?: string[]): string[] {
  if (!cats || cats.length === 0) {
    return ["performance", "accessibility", "best-practices", "seo"];
  }
  return cats.map((c) => {
    const map: Record<string, string> = {
      "best-practices": "best-practices",
      bestpractices: "best-practices",
      bp: "best-practices",
      perf: "performance",
      a11y: "accessibility",
    };
    return map[c.toLowerCase()] || c.toLowerCase();
  });
}

function averageReports(reports: AuditReport[]): AuditReport {
  if (reports.length === 1) return reports[0];

  const avgScores: Record<string, number> = {};
  const categories = Object.keys(reports[0].scores);

  for (const cat of categories) {
    const sum = reports.reduce((acc, r) => acc + (r.scores[cat] ?? 0), 0);
    avgScores[cat] = Math.round(sum / reports.length);
  }

  // Use suggestions from the worst-scoring run
  const worstReport = reports.reduce((worst, r) => {
    const worstAvg =
      Object.values(worst.scores).reduce((a, b) => a + b, 0) /
      Object.keys(worst.scores).length;
    const rAvg =
      Object.values(r.scores).reduce((a, b) => a + b, 0) /
      Object.keys(r.scores).length;
    return rAvg < worstAvg ? r : worst;
  });

  return {
    url: reports[0].url,
    timestamp: reports[0].timestamp,
    scores: avgScores,
    metrics: reports[0].metrics,
    suggestions: worstReport.suggestions,
  };
}

export interface AuditReport {
  url: string;
  timestamp: string;
  scores: Record<string, number>;
  metrics: CoreWebVitals;
  suggestions: Suggestion[];
}

export interface CoreWebVitals {
  fcp?: number;
  lcp?: number;
  cls?: number;
  tbt?: number;
  si?: number;
  tti?: number;
  ttfb?: number;
}

export interface Suggestion {
  category: string;
  title: string;
  impact: "high" | "medium" | "low";
  description: string;
}

main().catch(console.error);
