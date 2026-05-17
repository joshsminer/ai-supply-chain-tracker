"""Post-edit hook: snapshot priors + severities when a bottleneck JSON is edited.

Wired into .claude/settings.json as a PostToolUse hook for Edit and Write.
Reads the tool input JSON from stdin, checks whether the file is a bottleneck
JSON, and runs both snapshot tools if so. Exits silently otherwise.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOTTLENECKS_DIR = ROOT / "data" / "bottlenecks"


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path") or tool_input.get("filePath") or ""
    if not file_path:
        return 0

    try:
        edited = Path(file_path).resolve()
    except Exception:
        return 0

    # Only fire when the edit is inside data/bottlenecks/ and ends in .json
    try:
        edited.relative_to(BOTTLENECKS_DIR.resolve())
    except ValueError:
        return 0
    if edited.suffix.lower() != ".json":
        return 0

    py = sys.executable
    env = {**__import__("os").environ, "PYTHONIOENCODING": "utf-8"}

    for script in ("tools/snapshot_priors.py", "tools/snapshot_severities.py"):
        try:
            subprocess.run(
                [py, script],
                cwd=str(ROOT),
                env=env,
                capture_output=True,
                timeout=15,
            )
        except Exception:
            pass

    return 0


if __name__ == "__main__":
    sys.exit(main())
