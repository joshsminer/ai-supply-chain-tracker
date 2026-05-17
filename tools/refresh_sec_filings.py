"""Refresh latest 10-Q/10-K filing metadata + revenue for US-listed bottleneck tickers.

Usage:
    python tools/refresh_sec_filings.py
    python tools/refresh_sec_filings.py AXTI

Writes data/refreshed/sec/<ticker>.json per ticker.
"""
from __future__ import annotations

import sys
from typing import Iterable

from _common import collect_tickers, now_iso, write_refreshed
from sec_edgar_client import (
    TICKER_CIK,
    company_facts,
    latest_filing,
    latest_revenue,
)


def refresh_one(ticker: str) -> dict | None:
    cik = TICKER_CIK.get(ticker)
    if not cik:
        return None
    print(f"  -{ticker} (CIK {cik}) ...", end=" ", flush=True)
    filing = latest_filing(cik)
    if not filing:
        print("no filings found")
        return None
    facts = company_facts(cik)
    rev = latest_revenue(facts) if facts else None
    snap = {
        "ticker": ticker,
        "cik": cik,
        "entityName": filing.get("entityName"),
        "sicDescription": filing.get("sicDescription"),
        "latestFiling": filing,
        "latestRevenue": rev,
        "fetchedAt": now_iso(),
        "source": "sec.gov/edgar",
    }
    write_refreshed("sec", ticker, snap)
    print(f"{filing['form']} filed {filing['filedAt']}")
    return snap


def main(argv: list[str]) -> int:
    if argv:
        tickers: Iterable[str] = argv
    else:
        all_tickers = {r.ticker for r in collect_tickers()}
        tickers = [t for t in all_tickers if t in TICKER_CIK]
    tickers = list(tickers)
    if not tickers:
        print("No SEC-registered tickers to refresh.")
        return 1
    print(f"Refreshing {len(tickers)} SEC filer(s)...")
    n_ok = sum(1 for t in tickers if refresh_one(t) is not None)
    print(f"Done. {n_ok}/{len(tickers)} succeeded.")
    return 0 if n_ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
