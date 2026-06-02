"""SEC EDGAR API client. Adapted from C:/claude-code/10Q Scrape/tools/sec_edgar_client.py."""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

SEC_USER_AGENT = os.getenv(
    "SEC_USER_AGENT", "AI-Supply-Chain-Tracker contact@example.com"
)
DATA_BASE = "https://data.sec.gov"
WWW_BASE = "https://www.sec.gov"
REQUEST_DELAY = 0.15  # 150ms between requests; SEC limit is 10/s

_last_req = 0.0


# CIKs for the public tickers referenced by the seeded bottlenecks.
# Each entry: ticker -> (cik as int-string, optional friendly name)
TICKER_CIK: dict[str, str] = {
    # Optical / InP
    "AXTI": "1051627",
    "COHR": "820318",
    "LITE": "1633978",
    # Memory
    "MU": "723125",
    # Advanced packaging
    "TSM": "1046179",
    "AMKR": "1047127",
    "ASX": "1122411",
    "AMAT": "6951",
    "LRCX": "707549",
    # WFE
    "ASML": "937966",
    # Power equipment / interconnection
    "ETN": "1551182",
    "CMI": "26172",
    "VST": "1692819",
    "CEG": "1868275",
    "NEE": "753308",
    "BE": "1664703",
    # Skilled labor (electrical / mechanical EPCs)
    "PWR": "1050915",
    "MTZ": "15615",
    "EME": "105634",
    "FIX": "1035983",
    "ACM": "868857",
    "STRL": "874238",
    # Thermal & rack
    "VRT": "1674101",
    "NVT": "1474735",
    "MOD": "67347",
    # Datacenter silicon
    "NVDA": "1045810",
    "AMD": "2488",
    "AVGO": "1730168",
    "MRVL": "1835632",
    "INTC": "50863",
    # EDA / tools cross-reference
    "SNPS": "883241",
    "CDNS": "813672",
    # Raw materials
    "MP": "1801368",
    "LIN": "1707925",
    # GE Vernova (GEV) and Talen Energy (TLN) — recently spun/emerged; CIKs need
    # verification on EDGAR full-text search before re-enabling. Removed for now
    # so refresh runs cleanly.
    # Foreign filers (LSE, KRX, TWSE, JP, German, etc.) are not in EDGAR.
    # ENR.DE, 6501.T, 6503.T, 7011.T, 267260.KS, 4062.T, 3037.TW, 6967.T, 2802.T,
    # 3189.TW, 8035.T, 4185.T, IQE.L are reachable via market data only.
}


def _rate_limit() -> None:
    global _last_req
    elapsed = time.time() - _last_req
    if elapsed < REQUEST_DELAY:
        time.sleep(REQUEST_DELAY - elapsed)
    _last_req = time.time()


def _get(url: str, max_retries: int = 3) -> Optional[dict]:
    headers = {"User-Agent": SEC_USER_AGENT, "Accept": "application/json"}
    for attempt in range(max_retries):
        _rate_limit()
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 404:
                return None
            if r.status_code == 429:
                time.sleep((2**attempt) * 2)
                continue
            print(f"SEC error {r.status_code}: {url}")
            return None
        except requests.RequestException as exc:
            print(f"SEC request failed ({attempt + 1}/{max_retries}): {exc}")
            if attempt < max_retries - 1:
                time.sleep(2**attempt)
    return None


def pad_cik(cik: str) -> str:
    return str(cik).zfill(10)


def get_submissions(cik: str) -> Optional[dict]:
    """Return the company's submissions index (filings list + metadata)."""
    return _get(f"{DATA_BASE}/submissions/CIK{pad_cik(cik)}.json")


def latest_filing(
    cik: str,
    form_types: tuple[str, ...] = ("10-Q", "10-K", "20-F", "6-K"),
) -> Optional[dict]:
    """Return metadata for the most recent filing of any matching form type."""
    data = get_submissions(cik)
    if not data:
        return None
    recent = data.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    dates = recent.get("filingDate", [])
    accns = recent.get("accessionNumber", [])
    docs = recent.get("primaryDocument", [])
    periods = recent.get("periodOfReport", [])
    for i, form in enumerate(forms):
        if form in form_types:
            accn_clean = accns[i].replace("-", "")
            return {
                "form": form,
                "filedAt": dates[i],
                "periodOfReport": periods[i] if i < len(periods) else None,
                "accessionNumber": accns[i],
                "primaryDocument": docs[i] if i < len(docs) else None,
                "url": f"{WWW_BASE}/Archives/edgar/data/{int(cik)}/{accn_clean}/{docs[i]}"
                if i < len(docs)
                else None,
                "entityName": data.get("name"),
                "sicDescription": data.get("sicDescription"),
            }
    return None


def company_facts(cik: str) -> Optional[dict]:
    """Return the companyfacts JSON (all XBRL-tagged facts)."""
    return _get(f"{DATA_BASE}/api/xbrl/companyfacts/CIK{pad_cik(cik)}.json")


def latest_revenue(facts: dict) -> Optional[dict]:
    """Pick the most recent us-gaap Revenues value from companyfacts."""
    if not facts:
        return None
    us_gaap = facts.get("facts", {}).get("us-gaap", {})
    # Try common revenue tags in order.
    for tag in (
        "Revenues",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "SalesRevenueNet",
    ):
        fact = us_gaap.get(tag)
        if not fact:
            continue
        usd = fact.get("units", {}).get("USD") or []
        if not usd:
            continue
        # Sort by end date descending and prefer Q-type periods.
        usd_sorted = sorted(usd, key=lambda x: x.get("end", ""), reverse=True)
        top = usd_sorted[0]
        return {
            "tag": tag,
            "value": top.get("val"),
            "currency": "USD",
            "periodEnd": top.get("end"),
            "fy": top.get("fy"),
            "fp": top.get("fp"),
            "form": top.get("form"),
            "filed": top.get("filed"),
        }
    return None
