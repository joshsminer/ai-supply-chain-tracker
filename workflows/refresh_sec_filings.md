# Workflow: refresh SEC EDGAR filings

**Goal.** For every US-listed ticker, capture the most recent 10-Q/10-K filing and the latest reported revenue.

**Tool.** `tools/refresh_sec_filings.py` + `tools/sec_edgar_client.py`

**Inputs.** None. Subset of tickers via positional args.

**Outputs.** `data/refreshed/sec/<TICKER>.json` with:
- `latestFiling` — form type, `filedAt`, `periodOfReport`, primary doc URL
- `latestRevenue` — most recent us-gaap `Revenues` (or fallback tag) value, period end, form
- `entityName`, `sicDescription`
- `fetchedAt`

## Run it

```
python tools/refresh_sec_filings.py        # all known US filers
python tools/refresh_sec_filings.py AXTI   # subset
```

## Currently mapped CIKs

See `TICKER_CIK` in `tools/sec_edgar_client.py`:
- AXTI → 1051627
- COHR → 820318
- LITE → 1633978
- MU → 723125

When adding a new bottleneck with a US-listed ticker, append its CIK here. Find
the CIK at https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=<name>

## Notes

- SEC requires a real `User-Agent`. Set `SEC_USER_AGENT` in `.env` (format: `"OrgName name@email.com"`).
- The script self-rate-limits to 6.7 requests/second (well below the 10/s ceiling).
- Foreign filers (Sumitomo, JX, Hynix, Samsung, BESI, IQE) are not in EDGAR. Their data needs a separate path — JP filings for Japan tickers, KRX disclosures (DART) for Korea, etc.
- `latestRevenue` is **total company** revenue, not segment-specific. Segment-level numbers (e.g. AXT's InP-only revenue, Micron's HBM-only revenue) live in unstructured MD&A text and need the earnings-extracts workflow.
