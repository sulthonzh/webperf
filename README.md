# webperf

Quick web performance audits from your terminal. Lighthouse scores, Core Web Vitals, and actionable suggestions — no browser needed.

## Why

You're deploying a site and want to check performance. Opening DevTools, navigating to Lighthouse, waiting for the audit... it's slow and manual. `webperf` gives you the same data in your terminal, perfect for CI pipelines and quick checks.

## Install

```bash
npm install -g webperf
```

Or run directly:

```bash
npx webperf https://your-site.com
```

## Usage

### Basic audit

```bash
webperf https://example.com
```

### JSON output (for scripts and CI)

```bash
webperf https://example.com --json
```

### Multiple runs (average out variance)

```bash
webperf https://example.com --runs 3
```

### Desktop mode

```bash
webperf https://example.com --no-mobile
```

### Save report

```bash
webperf https://example.com --output report.md
webperf https://example.com --output report.json --json
```

### Specific categories only

```bash
webperf https://example.com --categories performance accessibility
```

### Quiet mode (just scores, no suggestions)

```bash
webperf https://example.com --quiet
```

## What you get

- **Lighthouse scores** — Performance, Accessibility, Best Practices, SEO (0-100)
- **Core Web Vitals** — FCP, LCP, CLS, TBT, Speed Index, TTI, TTFB with good/needs work/poor ratings
- **Suggestions** — Sorted by impact (high → medium → low), tells you what to fix first

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Performance check
  run: |
    npx webperf https://staging.example.com --json > perf-report.json
    # Fail if performance score < 80
    SCORE=$(cat perf-report.json | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.scores.performance)")
    if [ "$SCORE" -lt 80 ]; then
      echo "Performance score $SCORE is below threshold"
      exit 1
    fi
```

## Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--json` | `-j` | Output as JSON |
| `--output <file>` | `-o` | Save report (md or json) |
| `--runs <n>` | `-n` | Number of runs to average (1-5) |
| `--categories <list>` | `-c` | Categories: performance, accessibility, best-practices, seo, pwa |
| `--mobile` | `-m` | Mobile emulation (default: true) |
| `--quiet` | `-q` | Only show scores |

## Requirements

- Node.js 18+
- Chrome/Chromium (for Lighthouse — auto-detected via chrome-launcher)

## License

MIT
