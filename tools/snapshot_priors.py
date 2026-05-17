"""Snapshot current debate priors to data/history/priors.jsonl.

Idempotent: only appends rows where (slug, question, lastUpdated, probability)
is new. Run this whenever you edit a debate (or wire it into a hook).

Usage:
    python tools/snapshot_priors.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from _common import REFRESHED_DIR, load_bottlenecks, now_iso

HISTORY_DIR = REFRESHED_DIR.parent / "history"
PRIORS_FILE = HISTORY_DIR / "priors.jsonl"


def load_existing() -> set[tuple]:
    if not PRIORS_FILE.exists():
        return set()
    out: set[tuple] = set()
    for line in PRIORS_FILE.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
            out.add(
                (
                    row["slug"],
                    row["question"],
                    row["lastUpdated"],
                    round(float(row["probability"]), 4),
                )
            )
        except Exception:
            continue
    return out


def main() -> int:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    seen = load_existing()
    snapshot_at = now_iso()
    appended = 0
    with PRIORS_FILE.open("a", encoding="utf-8") as f:
        for b in load_bottlenecks():
            for d in b.get("debates") or []:
                key = (b["slug"], d["question"], d["lastUpdated"], round(float(d["probability"]), 4))
                if key in seen:
                    continue
                row = {
                    "slug": b["slug"],
                    "question": d["question"],
                    "probability": d["probability"],
                    "lastUpdated": d["lastUpdated"],
                    "snapshotAt": snapshot_at,
                }
                f.write(json.dumps(row) + "\n")
                seen.add(key)
                appended += 1
    print(f"Wrote {appended} new prior rows to {PRIORS_FILE.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
