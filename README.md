# AI Supply Chain Tracker

An internal research tool that tracks critical bottlenecks across the AI hardware
supply chain, organized by layer of the AI "cake" (compute → datacenter →
energy/site). Each bottleneck drills into a tracker card with a consistent schema:
supply structure, supply-vs-demand projection, leading indicators, investment
landscape (public + private), editorial insight, and open debates. On top of the
static research layer sits a live-data layer (market prices, SEC filings, trade
stats) and a forecasting layer that scores which stage is most likely to become
the next binding constraint.

**Live views**

- `/` — stack dashboard: stats overview, today's signals, the 3-layer stack, and a market-cap heatmap
- `/forecast` — constraint-risk scoring per stage + the flagged next emerging constraint
- `/dag` — cross-layer dependency graph with each stage's top supplier + a most-critical-companies ranking
- `/alerts` — biggest LTM movers, severity changes, prior updates, recent filings
- `/bottleneck/[slug]` — full per-bottleneck tracker card
- `/landing` — marketing hero (WebGL shader)

---

## AI tools disclosure

The use of AI tools is disclosed here in full. There are **two distinct categories**:
AI used to *build* this project, and AI used *inside* the running product.

### 1. AI used to build the project (development-time)

**Essentially the entire codebase was written by Anthropic's Claude (via Claude
Code), working from a human-authored spec ([`SPEC.md`](./SPEC.md)) and iterative
human direction.** The human set requirements, made product/design decisions,
reviewed output, supplied the Anthropic API key, funded it, and steered every
iteration; Claude produced the implementation.

Specifically, AI generated:

- The Next.js 14 / TypeScript / Tailwind front end — all routes, React components, and `lib/` utilities
- The data model (`lib/types.ts`) and all seeded bottleneck JSON research files in `data/bottlenecks/`
- The Python tools layer in `tools/` (market data, SEC EDGAR, UN Comtrade, snapshot + extraction scripts)
- The forecasting model (`lib/forecast.ts`), DAG layout (`lib/dag.ts`), heatmap layout (`lib/heatmap.ts`), and company-mapping module (`lib/companyMap.ts`)
- The workflow SOPs in `workflows/`
- Git history, commit messages, and this README

Human contributions: the original `SPEC.md` brief, all product decisions and
prioritization, editorial review of the supply-chain research, the design
direction, API credentials, and acceptance of each change.

> Note: the bottleneck research content (companies, shares, severity calls,
> insights, debates) was AI-drafted and should be treated as a starting point for
> human verification, not as audited fact. Funding figures and market shares are
> point-in-time estimates.

### 2. AI used inside the product (runtime)

The product itself calls an LLM as a runtime component:

- **`tools/extract_signals.py`** and **`tools/refresh_earnings_extracts.py`** use the **Anthropic API (Claude, tool-use / forced-JSON)** to parse SEC filings (10-Q / 10-K / 20-F) and extract structured indicator signals — lead-time, capacity utilization, pricing deltas, capex guidance, node-mix — into `data/refreshed/signals/` and `data/refreshed/extracts/`.
- These extracted signals feed the forecasting model (`lib/forecast.ts`), which folds them into each stage's forward constraint-risk score. Stages with live filing-derived signals are tagged "● live" in the `/forecast` UI.
- The extraction prompts enforce a **cite-or-null discipline**: the model must cite a specific filing statement for every number or return null — it is instructed never to fabricate figures.

Requires an `ANTHROPIC_API_KEY` (see Setup). Without it, the forecast falls back
to projection-based scoring and the extraction steps no-op.

### Non-AI data sources

Live numeric data is pulled deterministically (no LLM) from:

- **Yahoo Finance** (`yfinance`) — share prices, market caps, daily/LTM moves, price history
- **SEC EDGAR** — latest filing metadata + revenue tags
- **UN Comtrade** — Korea memory-IC export statistics

---

## Architecture

This repo follows a **WAT (Workflows / Agents / Tools)** structure: deterministic
Python tools do the data fetching, markdown workflows document the procedures, and
the Next.js app renders. See [`CLAUDE.md`](../CLAUDE.md) for the framework notes.

```
app/                 Next.js App Router routes
components/           React components (stack, card, dag, forecast, ui)
lib/                  Types, scoring engines, loaders, helpers
data/
  bottlenecks/*.json  Hand-curated (AI-drafted) research, one file per stage
  layers.json         The 3-layer AI-cake definitions
  refreshed/          Live data written by the tools (market, sec, korea_trade, signals, extracts)
  history/            Append-only JSONL time series (prices, priors, severities)
tools/                Python data + extraction scripts (the WAT tools layer)
workflows/            Markdown SOPs for each refresh procedure
```

### Data layers

| Layer | Source | Updated by |
|---|---|---|
| Editorial research | AI-drafted, human-reviewed | hand edits to `data/bottlenecks/*.json` |
| Market data | Yahoo Finance | `tools/refresh_market_data.py` |
| SEC filings | SEC EDGAR | `tools/refresh_sec_filings.py` |
| Korea trade | UN Comtrade | `tools/refresh_korea_trade.py` |
| Extracted signals | Anthropic API over filings | `tools/extract_signals.py` |
| Forecast | computed from the above | `lib/forecast.ts` (at request time) |

---

## Setup

```bash
# 1. Front end
npm install
npm run dev            # http://localhost:3000

# 2. Python tools (data refresh)
pip install -r requirements.txt
cp .env.example .env   # then fill in values

# 3. Refresh all live data + extraction + snapshots
python tools/refresh_all.py
```

### Environment (`.env`, gitignored)

```
SEC_USER_AGENT=Your Org name@email.com      # required by SEC EDGAR
ANTHROPIC_API_KEY=sk-ant-...                # required for LLM extraction only
```

Never commit `.env`. The Anthropic key is only needed for the extraction steps;
everything else runs without it.

---

## Refreshing data

```bash
python tools/refresh_all.py                 # everything
python tools/refresh_all.py --skip signals,extracts   # free + fast (no LLM cost)
python tools/extract_signals.py hbm-memory cowos      # one or two stages
```

A PostToolUse hook (`.claude/settings.json`) auto-snapshots debate priors and
severities whenever a `data/bottlenecks/*.json` file is edited.

---

## Tech stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · lucide-react ·
d3-hierarchy · three.js (landing only) · react-markdown · Python (yfinance,
requests, beautifulsoup4, anthropic).
