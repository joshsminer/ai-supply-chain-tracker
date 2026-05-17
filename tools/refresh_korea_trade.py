"""Refresh Korea memory IC exports by destination (UN Comtrade Plus public preview).

We use HS code 854232 (Electronic ICs - memories), reporter Korea (410), monthly,
exports flow. The public preview endpoint is unauthenticated but rate-limited
and capped to 500 rows per call. UN Comtrade publishes Korea data with roughly
a 4-6 month lag.

Usage:
    python tools/refresh_korea_trade.py             # last 12 months ending at most recent available
    python tools/refresh_korea_trade.py --months 24

Writes data/refreshed/korea_trade/dram_exports.json with:
  - byPeriod: array of {period, totalUsd, byPartner:[{partner, partnerCode, valueUsd, netWeightKg}]}
  - fetchedAt, source, hsCode
"""
from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timezone
from typing import Iterable

import requests

from _common import now_iso, write_refreshed

ENDPOINT = "https://comtradeapi.un.org/public/v1/preview/C/M/HS"
KOREA_REPORTER = 410
HS_MEMORY_IC = "854232"
FLOW_EXPORT = "X"

# UN M49 country codes (subset relevant for memory-IC destinations).
PARTNER_NAME: dict[int, str] = {
    0: "World",
    156: "China",
    344: "Hong Kong SAR",
    158: "Taiwan",
    490: "Other Asia (incl. Taiwan)",
    842: "United States",
    704: "Vietnam",
    608: "Philippines",
    458: "Malaysia",
    702: "Singapore",
    392: "Japan",
    276: "Germany",
    528: "Netherlands",
    410: "Korea",  # appears only as reporter
    826: "United Kingdom",
    484: "Mexico",
    250: "France",
    36: "Australia",
    616: "Poland",
    203: "Czechia",
    348: "Hungary",
    372: "Ireland",
    784: "United Arab Emirates",
    682: "Saudi Arabia",
    124: "Canada",
    764: "Thailand",
    752: "Sweden",
    246: "Finland",
    643: "Russia",
    792: "Türkiye",
    356: "India",
    360: "Indonesia",
    634: "Qatar",
    554: "New Zealand",
    578: "Norway",
    300: "Greece",
    380: "Italy",
    724: "Spain",
    56: "Belgium",
    40: "Austria",
    756: "Switzerland",
}


def _periods(n_months: int, anchor_year: int, anchor_month: int) -> list[str]:
    """Return list of YYYYMM strings ending at anchor, descending then reversed to ascending."""
    out: list[str] = []
    year, month = anchor_year, anchor_month
    for _ in range(n_months):
        out.append(f"{year}{month:02d}")
        month -= 1
        if month == 0:
            year -= 1
            month = 12
    return list(reversed(out))


def fetch_period(period: str) -> dict | None:
    """Return {period, totalUsd, byPartner:[...]} or None on empty / error."""
    params = {
        "reporterCode": KOREA_REPORTER,
        "period": period,
        "cmdCode": HS_MEMORY_IC,
        "flowCode": FLOW_EXPORT,
        "partner2Code": 0,
        "customsCode": "C00",
        "motCode": 0,
    }
    try:
        r = requests.get(ENDPOINT, params=params, timeout=30)
    except requests.RequestException as exc:
        print(f"  ! {period}: {exc}")
        return None
    if r.status_code != 200:
        print(f"  ! {period}: HTTP {r.status_code} ({r.text[:160]})")
        return None
    body = r.json()
    rows = body.get("data") or []
    if not rows:
        return None
    total = None
    partners: list[dict] = []
    for row in rows:
        partner_code = row.get("partnerCode")
        value = row.get("primaryValue") or row.get("cifvalue") or row.get("fobvalue")
        weight = row.get("netWgt")
        name = PARTNER_NAME.get(partner_code, f"M49 {partner_code}")
        if partner_code == 0:
            total = value
            continue
        partners.append(
            {
                "partner": name,
                "partnerCode": partner_code,
                "valueUsd": value,
                "netWeightKg": weight,
            }
        )
    partners.sort(key=lambda p: p.get("valueUsd") or 0, reverse=True)
    return {
        "period": period,
        "totalUsd": total,
        "byPartner": partners[:15],  # top 15 destinations
    }


def find_anchor() -> tuple[int, int]:
    """Probe back from today to find the latest period with data."""
    now = datetime.now(timezone.utc)
    year, month = now.year, now.month - 1
    if month == 0:
        year, month = year - 1, 12
    for _ in range(18):  # try up to 18 months back
        period = f"{year}{month:02d}"
        rec = fetch_period(period)
        if rec:
            print(f"Anchor period: {period}")
            return year, month
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    raise RuntimeError("No data found in last 18 months — Comtrade may be offline.")


def refresh(periods: Iterable[str]) -> dict:
    by_period: list[dict] = []
    for p in periods:
        print(f"  -{p} ...", end=" ", flush=True)
        rec = fetch_period(p)
        if rec is None:
            print("none")
        else:
            total_b = (rec["totalUsd"] or 0) / 1e9
            print(f"{len(rec['byPartner'])} partners, ${total_b:.2f}B")
            by_period.append(rec)
        time.sleep(0.5)
    payload = {
        "reporter": "Korea",
        "hsCode": HS_MEMORY_IC,
        "hsLabel": "Electronic ICs - Memories",
        "flow": "Exports",
        "byPeriod": sorted(by_period, key=lambda r: r["period"]),
        "fetchedAt": now_iso(),
        "source": "UN Comtrade Plus public preview",
    }
    write_refreshed("korea_trade", "dram_exports", payload)
    return payload


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--months", type=int, default=12)
    args = parser.parse_args(argv)
    anchor_year, anchor_month = find_anchor()
    periods = _periods(args.months, anchor_year, anchor_month)
    print(f"Fetching {len(periods)} month(s) ending {anchor_year}-{anchor_month:02d}...")
    payload = refresh(periods)
    print(f"Wrote {len(payload['byPeriod'])} period(s) to data/refreshed/korea_trade/dram_exports.json")
    return 0 if payload["byPeriod"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
