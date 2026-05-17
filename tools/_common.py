"""Shared helpers for refresh tools."""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent
BOTTLENECK_DIR = ROOT / "data" / "bottlenecks"
REFRESHED_DIR = ROOT / "data" / "refreshed"


@dataclass(frozen=True)
class TickerRef:
    """A ticker as it appears inside a bottleneck JSON file."""

    ticker: str
    source: str  # e.g. "indium-phosphide.json"
    company_name: str
    role: str  # "supplier" or "company"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_bottlenecks() -> list[dict]:
    return [
        json.loads(p.read_text(encoding="utf-8"))
        for p in sorted(BOTTLENECK_DIR.glob("*.json"))
    ]


def collect_tickers() -> list[TickerRef]:
    """Walk every bottleneck JSON, return every unique (ticker, name) it references."""
    seen: dict[str, TickerRef] = {}
    for b in load_bottlenecks():
        source = f"{b['slug']}.json"
        for s in b.get("supplyStructure", []):
            t = s.get("ticker")
            if t and t not in seen:
                seen[t] = TickerRef(t, source, s["name"], "supplier")
        for c in b.get("companies", []):
            t = c.get("ticker")
            if t and t not in seen:
                seen[t] = TickerRef(t, source, c["name"], "company")
    return list(seen.values())


def write_refreshed(subdir: str, key: str, payload: dict) -> Path:
    out = REFRESHED_DIR / subdir
    out.mkdir(parents=True, exist_ok=True)
    safe = key.replace("/", "_").replace("\\", "_")
    path = out / f"{safe}.json"
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return path


def chunked(seq: Iterable, n: int):
    buf = []
    for x in seq:
        buf.append(x)
        if len(buf) >= n:
            yield buf
            buf = []
    if buf:
        yield buf
