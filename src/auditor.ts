import * as lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import type { AuditReport, CoreWebVitals, Suggestion } from "./cli";

interface AuditOptions {
  categories: string[];
  mobile: boolean;
}

export async function runAudit(
  url: string,
  options: AuditOptions
): Promise<AuditReport> {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--disable-gpu", "--no-sandbox"],
  });

  try {
    const categoryIds = options.categories as any[];

    const flags = {
      url,
      port: chrome.port,
      output: "json" as const,
      onlyCategories: categoryIds.length > 0 ? categoryIds : undefined,
    };

    const config = {
      extends: "lighthouse:default",
      settings: {
        formFactor: options.mobile ? ("mobile" as const) : ("desktop" as const),
        screenEmulation: options.mobile
          ? { mobile: true, width: 360, height: 640, deviceScaleFactor: 2.6, disabled: false }
          : { mobile: false, disabled: true },
        throttling: options.mobile
          ? {
              rttMs: 150,
              throughputKbps: 1_638.4,
              cpuSlowdownMultiplier: 4,
            }
          : undefined,
      },
    };

    const runnerResult = await lighthouse.default(url, flags, config);
    const reportJson = runnerResult!.lhr;

    const scores = extractScores(reportJson);
    const metrics = extractMetrics(reportJson);
    const suggestions = extractSuggestions(reportJson);

    return {
      url,
      timestamp: new Date().toISOString(),
      scores,
      metrics,
      suggestions,
    };
  } finally {
    await chrome.kill();
  }
}

function extractScores(lhr: any): Record<string, number> {
  const cats = lhr.categories || {};
  const scores: Record<string, number> = {};

  for (const [key, cat] of Object.entries(cats)) {
    const raw = (cat as any).score;
    scores[key] = raw !== undefined && raw !== null ? Math.round(raw * 100) : 0;
  }

  return scores;
}

function extractMetrics(lhr: any): CoreWebVitals {
  const audits = lhr.audits || {};

  const getNumeric = (id: string): number | undefined => {
    const audit = audits[id];
    if (!audit || !audit.numericValue) return undefined;
    return Math.round(audit.numericValue);
  };

  return {
    fcp: getNumeric("first-contentful-paint"),
    lcp: getNumeric("largest-contentful-paint"),
    cls: audits["cumulative-layout-shift"]?.numericValue !== undefined
      ? Number(audits["cumulative-layout-shift"].numericValue.toFixed(3))
      : undefined,
    tbt: getNumeric("total-blocking-time"),
    si: getNumeric("speed-index"),
    tti: getNumeric("interactive"),
    ttfb: getNumeric("server-response-time"),
  };
}

function extractSuggestions(lhr: any): Suggestion[] {
  const audits = lhr.audits || {};
  const suggestions: Suggestion[] = [];

  for (const [id, audit] of Object.entries(audits)) {
    const a = audit as any;
    if (a.score !== null && a.score !== undefined && a.score < 0.9) {
      // Skip informational / not-applicable audits
      if (a.scoreDisplayMode === "notApplicable") continue;
      if (a.scoreDisplayMode === "informative") continue;

      const impact: "high" | "medium" | "low" =
        a.score < 0.5 ? "high" : a.score < 0.75 ? "medium" : "low";

      suggestions.push({
        category: findCategoryForAudit(lhr, id),
        title: a.title || id,
        impact,
        description: a.description || "",
      });
    }
  }

  // Sort by impact
  const order = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => order[a.impact] - order[b.impact]);

  return suggestions.slice(0, 20); // Top 20
}

function findCategoryForAudit(lhr: any, auditId: string): string {
  const cats = lhr.categories || {};
  for (const [name, cat] of Object.entries(cats)) {
    const refs = (cat as any).auditRefs || [];
    if (refs.some((r: any) => r.id === auditId)) {
      return name;
    }
  }
  return "other";
}
