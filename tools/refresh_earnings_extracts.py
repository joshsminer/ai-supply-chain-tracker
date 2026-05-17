"""Extract structured commentary from SEC filings via Anthropic tool-use.

For each US-listed ticker with a stored 10-Q/10-K/20-F snapshot, fetch the
primary document, strip HTML, and ask Claude (via tool-use forcing JSON output)
to surface findings tagged by category and topic.

Requires ANTHROPIC_API_KEY in .env. Uses SEC_USER_AGENT for the fetch.

Usage:
    python tools/refresh_earnings_extracts.py             # all tickers with filings
    python tools/refresh_earnings_extracts.py AXTI MU     # subset
    python tools/refresh_earnings_extracts.py --model claude-haiku-4-5
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Iterable, Optional

import requests
from dotenv import load_dotenv

from _common import REFRESHED_DIR, now_iso, write_refreshed
from sec_edgar_client import SEC_USER_AGENT

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None  # handled at runtime

SEC_REFRESHED = REFRESHED_DIR / "sec"
DEFAULT_MODEL = "claude-sonnet-4-6"
MAX_CHARS = 150_000  # trim filing text to keep input within reasonable limits

FINDINGS_TOOL = {
    "name": "record_findings",
    "description": (
        "Record the most material claims from this SEC filing relevant to AI "
        "hardware supply chain bottlenecks."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "findings": {
                "type": "array",
                "description": "Up to 8 highest-signal claims. Quality over quantity.",
                "items": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": [
                                "segmentRevenue",
                                "capacity",
                                "leadTime",
                                "qualification",
                                "pricing",
                                "supplyConstraint",
                                "demandSignal",
                                "competitiveContext",
                            ],
                        },
                        "claim": {
                            "type": "string",
                            "description": "One-sentence summary of the claim or development.",
                        },
                        "sourceQuote": {
                            "type": "string",
                            "description": "Exact quote from the filing, <= 300 characters.",
                        },
                        "topicTags": {
                            "type": "array",
                            "description": "Subset of: hbm, inp, optics, cowos, fab-capacity, ai-accelerator, transformers, gas-turbines, dlc-cooling, ree, photoresist, packaging-substrates, leading-edge-logic, high-na-euv, skilled-labor, interconnection.",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["category", "claim", "sourceQuote"],
                },
            },
            "summary": {
                "type": "string",
                "description": "One-sentence top-line characterization of the filing (e.g. \"HBM revenue accelerating, capacity tight through 2026\").",
            },
        },
        "required": ["findings", "summary"],
    },
}

SYSTEM_PROMPT = (
    "You are an equity research analyst extracting structured findings from "
    "SEC filings for an internal AI-hardware supply-chain tracker. Focus on "
    "claims that bear on bottlenecks in the chain: HBM memory, advanced "
    "packaging (CoWoS), optical transceivers, datacenter silicon, leading-edge "
    "foundry capacity, power equipment, raw materials. Ignore boilerplate, "
    "legal risk language, and stock-based compensation tables. Every finding "
    "MUST cite an exact short quote from the filing. Maximum 8 findings — "
    "pick the most material."
)


def fetch_filing_text(url: str) -> Optional[str]:
    """Fetch the filing primary doc, strip HTML, return text. ~150K chars max."""
    headers = {"User-Agent": SEC_USER_AGENT}
    try:
        r = requests.get(url, headers=headers, timeout=60)
        if r.status_code != 200:
            print(f"  ! filing fetch HTTP {r.status_code}")
            return None
    except requests.RequestException as exc:
        print(f"  ! filing fetch error: {exc}")
        return None
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(r.text, "lxml")
    for tag in soup(["script", "style", "head", "noscript"]):
        tag.decompose()
    text = soup.get_text(" ", strip=True)
    # Collapse whitespace
    text = " ".join(text.split())
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + "  [...truncated]"
    return text


def list_sec_tickers() -> list[str]:
    return sorted(p.stem for p in SEC_REFRESHED.glob("*.json"))


def load_sec_snapshot(ticker: str) -> dict | None:
    path = SEC_REFRESHED / f"{ticker}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def extract_one(client, ticker: str, model: str) -> dict | None:
    snap = load_sec_snapshot(ticker)
    if not snap:
        print(f"  - {ticker}: no SEC snapshot")
        return None
    filing = snap.get("latestFiling") or {}
    url = filing.get("url")
    if not url:
        print(f"  - {ticker}: no filing URL")
        return None
    print(f"  -{ticker}: fetching {filing.get('form')} ({filing.get('filedAt')}) ...", end=" ", flush=True)
    text = fetch_filing_text(url)
    if not text or len(text) < 1000:
        print("filing too short / unfetchable")
        return None
    print(f"{len(text):,} chars, extracting...", end=" ", flush=True)
    try:
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            system=[
                {"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}},
            ],
            tools=[FINDINGS_TOOL],
            tool_choice={"type": "tool", "name": "record_findings"},
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Ticker: {ticker}\n"
                        f"Entity: {snap.get('entityName')}\n"
                        f"Filing: {filing.get('form')} filed {filing.get('filedAt')}, "
                        f"period {filing.get('periodOfReport')}\n"
                        f"Source: {url}\n\n"
                        f"---BEGIN FILING TEXT---\n{text}\n---END FILING TEXT---"
                    ),
                }
            ],
        )
    except Exception as exc:  # noqa: BLE001
        print(f"API error: {exc}")
        return None
    tool_block = next((b for b in response.content if getattr(b, "type", None) == "tool_use"), None)
    if not tool_block:
        print("no tool_use block returned")
        return None
    findings = tool_block.input
    payload = {
        "ticker": ticker,
        "entityName": snap.get("entityName"),
        "filing": filing,
        "findings": findings.get("findings", []),
        "summary": findings.get("summary"),
        "model": model,
        "fetchedAt": now_iso(),
        "source": "anthropic.tool_use",
        "inputTokens": getattr(response.usage, "input_tokens", None),
        "outputTokens": getattr(response.usage, "output_tokens", None),
    }
    write_refreshed("extracts", ticker, payload)
    print(f"OK ({len(payload['findings'])} findings)")
    return payload


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--sleep", type=float, default=0.5, help="Pause between API calls")
    parser.add_argument("tickers", nargs="*")
    args = parser.parse_args(argv)

    if Anthropic is None:
        print("ERROR: anthropic SDK not installed. Run: pip install anthropic")
        return 2
    if not os.getenv("ANTHROPIC_API_KEY"):
        print(
            "ERROR: ANTHROPIC_API_KEY missing. Add it to .env and re-run.\n"
            "  See .env.example and workflows/refresh_earnings_extracts.md."
        )
        return 2

    client = Anthropic()
    tickers: Iterable[str] = args.tickers or list_sec_tickers()
    tickers = list(tickers)
    if not tickers:
        print("No SEC snapshots to process. Run refresh_sec_filings.py first.")
        return 1

    print(f"Extracting from {len(tickers)} filing(s) with model {args.model}...")
    n_ok = 0
    for t in tickers:
        if extract_one(client, t, args.model):
            n_ok += 1
        time.sleep(args.sleep)
    print(f"Done. {n_ok}/{len(tickers)} extracted.")
    return 0 if n_ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
