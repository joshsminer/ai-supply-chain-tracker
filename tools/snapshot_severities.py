"""Snapshot current bottleneck severities to data/history/severities.jsonl.

Idempotent on (slug, lastUpdated, severity). Run after editing a bottleneck
to capture severity transitions over time.

Usage:
    python tools/snapshot_severities.py
"""
from __future__ import annotations

import json
import sys

from _common import REFRESHED_DIR, load_bottlenecks, now_iso

HISTORY_DIR = REFRESHED_DIR.parent / "history"
SEVERITY_FILE = HISTORY_DIR / "severities.jsonl"


def load_existing() -> set[tuple]:
    if not SEVERITY_FILE.exists():
        return set()
    out: set[tuple] = set()
    for line in SEVERITY_FILE.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
            out.add((row["slug"], row["lastUpdated"], row["severity"]))
        except Exception:
            continue
    return out


def main() -> int:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    seen = load_existing()
    snapshot_at = now_iso()
    appended = 0
    with SEVERITY_FILE.open("a", encoding="utf-8") as f:
        for b in load_bottlenecks():
            key = (b["slug"], b["lastUpdated"], b["severity"])
            if key in seen:
                continue
            row = {
                "slug": b["slug"],
                "severity": b["severity"],
                "severityNote": b.get("severityNote"),
                "lastUpdated": b["lastUpdated"],
                "snapshotAt": snapshot_at,
            }
            f.write(json.dumps(row) + "\n")
            seen.add(key)
            appended += 1
    print(f"Wrote {appended} new severity rows to {SEVERITY_FILE.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
