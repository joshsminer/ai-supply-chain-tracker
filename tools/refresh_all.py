"""Refresh every external data source + snapshot priors/severities.

Run this weekly (or before any investor meeting). Each step is independent —
a failure in one source does not abort the rest.

Usage:
    python tools/refresh_all.py                 # everything
    python tools/refresh_all.py --skip extracts # skip slow / paid steps
    python tools/refresh_all.py --skip korea_trade,extracts
    python tools/refresh_all.py --only market   # market data only

Steps (in order):
    market       — yfinance prices for every ticker (~30s)
    history      — append today's bar to data/history/market.jsonl
                   (handled inline by market refresh)
    sec          — EDGAR latest 10-Q / 10-K / 20-F / 6-K (~10s)
    korea_trade  — UN Comtrade monthly DRAM exports (~30s)
    extracts     — Claude tool-use 10-Q extraction (~$1 per run, ~3-5min,
                   requires ANTHROPIC_API_KEY)
    snapshots    — priors + severities from current bottleneck JSONs (idempotent)
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY = sys.executable

STEPS = [
    ("market", ["tools/refresh_market_data.py"]),
    ("sec", ["tools/refresh_sec_filings.py"]),
    ("korea_trade", ["tools/refresh_korea_trade.py"]),
    ("extracts", ["tools/refresh_earnings_extracts.py"]),
    ("priors", ["tools/snapshot_priors.py"]),
    ("severities", ["tools/snapshot_severities.py"]),
]


def run_step(name: str, argv: list[str]) -> tuple[bool, float]:
    t0 = time.time()
    print(f"\n=== {name} ===", flush=True)
    try:
        result = subprocess.run([PY, *argv], cwd=str(ROOT), env={**__import__("os").environ, "PYTHONIOENCODING": "utf-8"})
        ok = result.returncode == 0
    except KeyboardInterrupt:
        raise
    except Exception as exc:  # noqa: BLE001
        print(f"  ! step crashed: {exc}")
        ok = False
    return ok, time.time() - t0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip", default="", help="Comma-separated step names to skip")
    parser.add_argument("--only", default="", help="Comma-separated step names to run (overrides --skip)")
    args = parser.parse_args(argv)

    skip = {s.strip() for s in args.skip.split(",") if s.strip()}
    only = {s.strip() for s in args.only.split(",") if s.strip()}

    chosen = [(n, a) for (n, a) in STEPS if (n in only if only else n not in skip)]

    print(f"Refresh plan: {[n for n, _ in chosen]}")
    results: list[tuple[str, bool, float]] = []
    for name, cmd in chosen:
        ok, elapsed = run_step(name, cmd)
        results.append((name, ok, elapsed))

    print("\n=== Summary ===")
    for name, ok, elapsed in results:
        status = "OK " if ok else "FAIL"
        print(f"  {status}  {name:<12} {elapsed:5.1f}s")
    failures = [r for r in results if not r[1]]
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
