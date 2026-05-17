"""Refresh share price & market cap for every ticker referenced by bottlenecks.

Usage:
    python tools/refresh_market_data.py
    python tools/refresh_market_data.py AXTI MU  # subset

Writes data/refreshed/market/<ticker>.json per ticker.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Iterable

import yfinance as yf

from _common import collect_tickers, now_iso, write_refreshed
from backfill_market_history import append_realtime


def fetch_one(ticker: str) -> dict | None:
    """Pull a snapshot via yfinance. Returns None on failure."""
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        if not info or info.get("regularMarketPrice") is None:
            # Fall back to fast_info which is leaner
            fi = getattr(t, "fast_info", None)
            if fi is None:
                return None
            price = getattr(fi, "last_price", None)
            mcap = getattr(fi, "market_cap", None)
            currency = getattr(fi, "currency", None)
            if price is None:
                return None
            return {
                "ticker": ticker,
                "price": float(price),
                "marketCap": float(mcap) if mcap is not None else None,
                "currency": currency,
                "name": None,
                "exchange": getattr(fi, "exchange", None),
                "fetchedAt": now_iso(),
                "source": "yfinance.fast_info",
            }

        return {
            "ticker": ticker,
            "name": info.get("longName") or info.get("shortName"),
            "exchange": info.get("exchange"),
            "currency": info.get("currency"),
            "price": info.get("regularMarketPrice"),
            "previousClose": info.get("regularMarketPreviousClose"),
            "dayChangePct": info.get("regularMarketChangePercent"),
            "marketCap": info.get("marketCap"),
            "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
            "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
            "trailingPE": info.get("trailingPE"),
            "fetchedAt": now_iso(),
            "source": "yfinance.info",
        }
    except Exception as exc:  # noqa: BLE001
        print(f"  ! {ticker}: {exc}", file=sys.stderr)
        return None


def refresh(tickers: Iterable[str]) -> int:
    n_ok = 0
    for t in tickers:
        print(f"  -{t} ...", end=" ", flush=True)
        snap = fetch_one(t)
        if snap is None:
            print("FAIL")
            continue
        path = write_refreshed("market", t, snap)
        append_realtime(snap)
        n_ok += 1
        price = snap.get("price")
        currency = snap.get("currency") or ""
        print(f"OK {price} {currency} -> {path.name}")
    return n_ok


def main(argv: list[str]) -> int:
    if argv:
        tickers = argv
    else:
        tickers = [r.ticker for r in collect_tickers()]
    print(f"Refreshing {len(tickers)} ticker(s)...")
    n = refresh(tickers)
    print(f"Done. {n}/{len(tickers)} succeeded.")
    return 0 if n > 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
