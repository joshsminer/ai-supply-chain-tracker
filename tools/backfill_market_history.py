"""Backfill N days of daily OHLC for every ticker in the bottleneck JSONs.

Usage:
    python tools/backfill_market_history.py             # default 30d, all tickers
    python tools/backfill_market_history.py --days 90   # 90 days, all tickers
    python tools/backfill_market_history.py AXTI MU     # subset, default days

Writes to data/history/market.jsonl. Idempotent: existing (ticker, date) rows
are preserved, new rows appended. Output is sorted on rewrite.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Iterable

import yfinance as yf

from _common import REFRESHED_DIR, collect_tickers, now_iso

HISTORY_DIR = REFRESHED_DIR.parent / "history"
MARKET_HISTORY = HISTORY_DIR / "market.jsonl"


def load_existing() -> set[tuple[str, str]]:
    """Return set of (ticker, date) keys already in the file."""
    if not MARKET_HISTORY.exists():
        return set()
    seen: set[tuple[str, str]] = set()
    for line in MARKET_HISTORY.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
            seen.add((row["ticker"], row["date"]))
        except Exception:
            continue
    return seen


def fetch_history(ticker: str, days: int) -> list[dict]:
    period = f"{days}d" if days <= 60 else "3mo" if days <= 90 else "1y"
    try:
        df = yf.Ticker(ticker).history(period=period, auto_adjust=False)
    except Exception as exc:  # noqa: BLE001
        print(f"  ! {ticker}: {exc}", file=sys.stderr)
        return []
    if df is None or df.empty:
        return []
    out: list[dict] = []
    for ts, row in df.iterrows():
        date = ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
        try:
            out.append(
                {
                    "ticker": ticker,
                    "date": date,
                    "close": float(row["Close"]),
                    "open": float(row.get("Open", 0)) or None,
                    "high": float(row.get("High", 0)) or None,
                    "low": float(row.get("Low", 0)) or None,
                    "volume": int(row.get("Volume", 0)) if row.get("Volume") else None,
                    "source": "yfinance.history",
                }
            )
        except (TypeError, ValueError):
            continue
    return out


def backfill(tickers: Iterable[str], days: int) -> int:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    seen = load_existing()
    rows_added = 0
    appended: list[dict] = []
    for t in tickers:
        print(f"  -{t}", end=" ", flush=True)
        rows = fetch_history(t, days)
        new = [r for r in rows if (r["ticker"], r["date"]) not in seen]
        for r in new:
            seen.add((r["ticker"], r["date"]))
        appended.extend(new)
        rows_added += len(new)
        print(f"+{len(new)} (of {len(rows)})")
    if appended:
        with MARKET_HISTORY.open("a", encoding="utf-8") as f:
            for r in appended:
                f.write(json.dumps(r) + "\n")
    return rows_added


def append_realtime(snapshot: dict) -> None:
    """Append the current price as a row stamped with today's date.

    Called from refresh_market_data.py after a successful fetch.
    """
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    fetched = snapshot.get("fetchedAt") or now_iso()
    date = str(fetched)[:10]
    row = {
        "ticker": snapshot["ticker"],
        "date": date,
        "close": snapshot.get("price"),
        "source": "yfinance.realtime",
        "fetchedAt": fetched,
    }
    if row["close"] is None:
        return
    # Dedupe: if this ticker+date already exists, skip (history backfill wins).
    if (row["ticker"], date) in load_existing():
        return
    with MARKET_HISTORY.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("tickers", nargs="*")
    args = parser.parse_args(argv)
    tickers = args.tickers or [r.ticker for r in collect_tickers()]
    print(f"Backfilling {args.days}d for {len(tickers)} ticker(s)...")
    added = backfill(tickers, args.days)
    print(f"Done. {added} new rows written to {MARKET_HISTORY}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
