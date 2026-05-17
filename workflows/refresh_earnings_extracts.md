# Workflow: extract structured commentary from earnings (Claude API)

**Status.** Skeleton. Tool exists but does not call Claude yet.

**Goal.** For each bottleneck, surface auditable extracts from the most recent earnings filings — segment revenue mix, "sold out" / lead-time statements, qualification milestones — without re-reading 60-page MD&A by hand.

**Tool.** `tools/refresh_earnings_extracts.py`

## Recommended implementation

1. **Source text** — pull the MD&A and Risk Factors sections from the latest 10-Q stored by `refresh_sec_filings.py`. Use the `primaryDocument` URL and clean with `beautifulsoup4`.
2. **Per bottleneck**, call `anthropic.messages.create` with:
   - Model: `claude-sonnet-4-6` (cheaper, fast enough for this; bump to opus if extraction quality is poor)
   - Tool-use forcing JSON output via `tool_choice`
   - Schema: an array of `{ category, claim, sourceQuote, sourceUrl, periodOfReport }` items
3. **Categories worth extracting** per bottleneck:
   - `segmentRevenue` — e.g. "InP revenue grew 24% sequentially"
   - `capacity` — e.g. "M15X ramp on track for HBM4"
   - `leadTime` — e.g. "EML lead times remain 35-40 weeks"
   - `qualification` — e.g. "NVIDIA HBM4 sample shipments began Q1"
   - `pricing` — e.g. "HBM ASPs up 12% sequentially"
4. **Output** to `data/refreshed/extracts/<slug>.json`. Keep the raw `sourceQuote` so a human can audit any number that lands on the dashboard.

## Why use tool-use, not plain prose

Tool-use lets us force a JSON schema. Without it, Claude will often comply but
occasionally returns markdown. Tool-use eliminates that whole class of bug.

## Cost ballpark

A 10-Q MD&A is ~20-40K tokens. Five bottlenecks × biweekly = ~200-400K input
tokens/month. With Sonnet at $3/MTok input, this is single-digit dollars per
month. Cache the system prompt; the extraction schema doesn't change.

## What to do now

Until this is implemented, when reading a fresh 10-Q, paste the relevant
paragraph into the `insight` field of the bottleneck JSON with `[source: <URL>]`
inline. The dashboard renders that as markdown so the link is clickable.
