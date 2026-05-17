# Workflow: refresh Korea DRAM exports

**Status.** Skeleton. Tool exists but does not fetch yet.

**Goal.** Pull monthly Korea DRAM (and ideally HBM) export volumes by destination — the cleanest leading indicator for global HBM demand outside earnings season.

**Tool.** `tools/refresh_korea_trade.py`

## Recommended implementation path

**Path A — UN Comtrade Plus API (preferred for v1)**

- Endpoint: `https://comtradeapi.un.org/data/v1/get/C/M/HS`
- Params: `reporterCode=410` (Korea), `cmdCode=854232` (Electronic ICs — memories), `period=YYYYMM`, `partnerCode=0` for World or specific codes for US/China/Taiwan
- Auth: free tier with limited monthly calls, sign up at comtradeplus.un.org
- Returns: JSON, easy to parse, USD value + net weight
- Limitation: 854232 includes all memory ICs (DRAM + NAND + HBM). HBM-specific volume is not separable at HS-6.

**Path B — KITA k-stat scraping**

- Site: https://stat.kita.net/stat
- Requires session cookie. Inspect network tab during a manual query to find the actual endpoint.
- More detailed than Comtrade but Korean-language UI and fragile.

**Path C — MOTIE monthly trade press release**

- URL pattern: https://www.motie.go.kr/kor/article/ATCL... (press releases)
- Unstructured PRs — would need LLM extraction. Easier to read once than to scrape monthly.

## Output schema (planned)

```
data/refreshed/korea_trade/dram_exports.json
{
  "period": "2026-04",
  "totalUsd": 12345678901,
  "byDestination": [
    { "country": "US", "valueUsd": ..., "yoyPct": ... },
    { "country": "China", "valueUsd": ..., "yoyPct": ... },
    { "country": "Taiwan", "valueUsd": ..., "yoyPct": ... }
  ],
  "source": "UN Comtrade HS 854232",
  "fetchedAt": "..."
}
```

## What to do now

Until this is implemented, capture the monthly headline number from MOTIE's
English press release (or Korea Customs Service) and put it directly into the
bottleneck's `indicators` field as a one-line summary with a source URL.
