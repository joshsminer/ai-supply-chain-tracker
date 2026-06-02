"""Extract structured per-stage indicator signals from SEC filings via Claude.

For each bottleneck, gathers the latest filing text from its public tickers and
asks Claude (tool-use, forced JSON) to estimate the numeric indicators the
forecast model consumes: lead-time weeks + delta, capacity utilization, pricing
delta, capex guidance, node-mix note. Writes data/refreshed/signals/<slug>.json
matching the StructuredSignal interface in lib/forecast.ts.

This is what turns the forecast from "hand-curated projections" into something
fed by real filing data. Requires ANTHROPIC_API_KEY.

Usage:
    python tools/extract_signals.py                 # all bottlenecks with filings
    python tools/extract_signals.py hbm-memory cowos
    python tools/extract_signals.py --model claude-haiku-4-5
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from _common import REFRESHED_DIR, load_bottlenecks, now_iso, write_refreshed
from sec_edgar_client import SEC_USER_AGENT

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

SEC_REFRESHED = REFRESHED_DIR / "sec"
DEFAULT_MODEL = "claude-sonnet-4-6"
MAX_CHARS_PER_FILING = 60_000

SIGNAL_TOOL = {
    "name": "record_stage_signals",
    "description": (
        "Record numeric supply-chain indicator estimates for this bottleneck "
        "stage, derived ONLY from the provided filing text. Use null for any "
        "value the filings do not support — do not guess."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "leadTimeWeeks": {
                "type": ["number", "null"],
                "description": "Current quoted lead time in weeks for the binding component, if stated.",
            },
            "leadTimeDeltaWeeks": {
                "type": ["number", "null"],
                "description": "Change in lead time vs prior period in weeks (positive = lengthening).",
            },
            "utilizationPct": {
                "type": ["number", "null"],
                "description": "Capacity utilization percent (0-100) if disclosed or clearly implied (e.g. 'sold out' ~ 100).",
            },
            "pricingDeltaPct": {
                "type": ["number", "null"],
                "description": "Sequential or YoY price change percent for the key product (positive = rising).",
            },
            "capexGuidancePct": {
                "type": ["number", "null"],
                "description": "Capex guidance change percent (demand/expansion proxy), positive = increasing.",
            },
            "nodeMixNote": {
                "type": ["string", "null"],
                "description": "One short phrase on foundry/process node-mix shift if relevant, else null.",
            },
            "rationale": {
                "type": "string",
                "description": "One sentence citing which filing statement(s) support these numbers.",
            },
        },
        "required": ["rationale"],
    },
}

SYSTEM_PROMPT = (
    "You are an equity analyst extracting hard numeric supply-chain indicators "
    "from SEC filings for a constraint-forecast model. Only report numbers the "
    "filing text supports; use null otherwise. Never fabricate. Prefer the most "
    "recent period. Keep the rationale to one sentence with a concrete reference."
)


def fetch_filing_text(url: str) -> str | None:
    import warnings
    import requests
    from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

    warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

    try:
        r = requests.get(url, headers={"User-Agent": SEC_USER_AGENT}, timeout=60)
        if r.status_code != 200:
            return None
    except Exception:
        return None
    soup = BeautifulSoup(r.text, "lxml")
    for tag in soup(["script", "style", "head", "noscript"]):
        tag.decompose()
    text = " ".join(soup.get_text(" ", strip=True).split())
    return text[:MAX_CHARS_PER_FILING] if text else None


def tickers_for(b: dict) -> list[str]:
    seen: list[str] = []
    for s in b.get("supplyStructure", []):
        if s.get("ticker") and s["ticker"] not in seen:
            seen.append(s["ticker"])
    for c in b.get("companies", []):
        if c.get("ticker") and c["ticker"] not in seen:
            seen.append(c["ticker"])
    return seen


def gather_filing_text(b: dict, max_filings: int = 2) -> tuple[str, list[str]]:
    """Concatenate filing text from up to N of the stage's tickers."""
    chunks: list[str] = []
    used: list[str] = []
    for t in tickers_for(b):
        path = SEC_REFRESHED / f"{t}.json"
        if not path.exists():
            continue
        snap = json.loads(path.read_text(encoding="utf-8"))
        url = (snap.get("latestFiling") or {}).get("url")
        if not url:
            continue
        text = fetch_filing_text(url)
        if not text:
            continue
        chunks.append(f"--- {t} {snap['latestFiling'].get('form')} {snap['latestFiling'].get('filedAt')} ---\n{text}")
        used.append(t)
        if len(used) >= max_filings:
            break
    return "\n\n".join(chunks), used


def extract_one(client, b: dict, model: str) -> dict | None:
    slug = b["slug"]
    print(f"  -{slug}: gathering filings...", end=" ", flush=True)
    text, used = gather_filing_text(b)
    if not text:
        print("no filing text available")
        return None
    print(f"{len(used)} filer(s) ({', '.join(used)}), extracting...", end=" ", flush=True)
    messages = [
        {
            "role": "user",
            "content": (
                f"Bottleneck stage: {b['name']} ({slug}).\n"
                f"Binding component context: {b.get('description', '')[:500]}\n\n"
                f"Filing text from positioned companies:\n{text}"
            ),
        }
    ]
    resp = None
    for attempt in range(4):
        try:
            resp = client.messages.create(
                model=model,
                max_tokens=1024,
                system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
                tools=[SIGNAL_TOOL],
                tool_choice={"type": "tool", "name": "record_stage_signals"},
                messages=messages,
            )
            break
        except Exception as exc:  # noqa: BLE001
            msg = str(exc)
            if ("429" in msg or "rate_limit" in msg) and attempt < 3:
                wait = 65
                print(f"rate-limited, waiting {wait}s...", end=" ", flush=True)
                time.sleep(wait)
                continue
            print(f"API error: {exc}")
            return None
    if resp is None:
        return None
    block = next((b for b in resp.content if getattr(b, "type", None) == "tool_use"), None)
    if not block:
        print("no tool_use returned")
        return None
    data = block.input
    payload = {
        "slug": slug,
        "leadTimeWeeks": data.get("leadTimeWeeks"),
        "leadTimeDeltaWeeks": data.get("leadTimeDeltaWeeks"),
        "utilizationPct": data.get("utilizationPct"),
        "pricingDeltaPct": data.get("pricingDeltaPct"),
        "capexGuidancePct": data.get("capexGuidancePct"),
        "nodeMixNote": data.get("nodeMixNote"),
        "rationale": data.get("rationale"),
        "sourceTickers": used,
        "model": model,
        "fetchedAt": now_iso(),
        "source": "anthropic.tool_use + SEC filings",
    }
    write_refreshed("signals", slug, payload)
    print("OK")
    return payload


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--sleep", type=float, default=32.0, help="Seconds between calls (Tier 1 = ~30K TPM)")
    parser.add_argument("slugs", nargs="*")
    args = parser.parse_args(argv)

    if Anthropic is None:
        print("ERROR: anthropic SDK not installed. Run: pip install anthropic")
        return 2
    if not os.getenv("ANTHROPIC_API_KEY"):
        print(
            "ERROR: ANTHROPIC_API_KEY missing. Add it to .env and re-run.\n"
            "  The forecast model reads data/refreshed/signals/<slug>.json when present;\n"
            "  until then it scores on supplyDemand projections + concentration + severity."
        )
        return 2

    client = Anthropic()
    bottlenecks = load_bottlenecks()
    if args.slugs:
        bottlenecks = [b for b in bottlenecks if b["slug"] in set(args.slugs)]
    print(f"Extracting signals for {len(bottlenecks)} stage(s) with model {args.model}...")
    n_ok = 0
    for i, b in enumerate(bottlenecks):
        if extract_one(client, b, args.model):
            n_ok += 1
        if i < len(bottlenecks) - 1:
            time.sleep(args.sleep)  # pace under the per-minute token limit
    print(f"Done. {n_ok}/{len(bottlenecks)} stages got signals.")
    return 0 if n_ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
