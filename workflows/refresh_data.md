# Workflow: refresh all live data

**Goal.** Refresh every external-data field so the tracker shows current values without hand-editing JSON.

**Cadence.** Run weekly on Monday morning, or before any investor meeting that uses the tracker.

## One-command refresh

```
python tools/refresh_all.py
```

This runs every source in sequence and prints a summary. Each step is
independent — failures don't abort the rest.

Steps:
1. **market** — yfinance prices for every ticker, plus today's bar appended to `data/history/market.jsonl`
2. **sec** — EDGAR latest filing + revenue per US-listed ticker
3. **korea_trade** — UN Comtrade Korea DRAM/memory IC exports by destination
4. **extracts** — Claude tool-use 10-Q extraction (skipped if `ANTHROPIC_API_KEY` missing)
5. **priors** — snapshot every debate's current probability to `data/history/priors.jsonl`
6. **severities** — snapshot every bottleneck's current severity to `data/history/severities.jsonl`

### Skipping slow steps

```
python tools/refresh_all.py --skip extracts            # skip paid Claude calls
python tools/refresh_all.py --skip korea_trade,extracts
python tools/refresh_all.py --only market,sec          # just the fast ones
```

## Automatic snapshots on edit

`.claude/settings.json` installs a PostToolUse hook that fires
`tools/_post_edit_hook.py` after any `Edit` or `Write`. The wrapper checks
whether the modified file is under `data/bottlenecks/` — if so, it runs
`snapshot_priors.py` and `snapshot_severities.py` automatically. Edits made
outside Claude Code (your IDE, etc.) won't trigger the hook; for those, run
the snapshot tools manually or kick off `refresh_all.py`.

The first time the hook fires in a session, Claude Code will prompt for
permission. After that it's silent.

## Verifying the refresh

After running, inspect `data/refreshed/` and `data/history/`:
- `data/refreshed/market/<TICKER>.json` — current price snapshot per ticker
- `data/refreshed/sec/<TICKER>.json` — latest filing per US-listed ticker
- `data/refreshed/korea_trade/dram_exports.json` — monthly Korea exports
- `data/refreshed/extracts/<TICKER>.json` — Claude-extracted findings (if run)
- `data/history/market.jsonl` — daily price bars, append-only
- `data/history/priors.jsonl` — debate probability snapshots
- `data/history/severities.jsonl` — bottleneck severity snapshots

The app reads these at build time via `lib/refreshed.ts` and `lib/history.ts`
and displays "Live · refreshed N min ago" badges, sparklines, and alert lists.

## When something breaks

- **yfinance 429 / empty info.** Some foreign tickers (e.g. `5016.T`) flap. Re-run; if persistent, check Yahoo Finance manually and note in the bottleneck JSON.
- **EDGAR 404 / "no filings found".** The CIK is wrong, or the entity hasn't filed. Update `TICKER_CIK` in `tools/sec_edgar_client.py`.
- **Comtrade 429.** The public preview endpoint is aggressively rate-limited; the script already backs off. Re-run later.
- **Anthropic rate limit / missing key.** The extracts step exits cleanly when `ANTHROPIC_API_KEY` is unset.
- **`Cannot find module './vendor-chunks/...'` during dev.** The dev server's `.next` cache got nuked by a parallel `next build`. `rm -rf .next` and restart `npm run dev`.

## Commit the snapshot

Per SPEC §10 Phase 5, snapshot the JSON to git on every refresh so we have a
poor-man's time series. The `data/refreshed/` and `data/history/` files are
intended to be committed (unlike `.tmp/`).
