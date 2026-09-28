#!/usr/bin/env python3
"""Validate the permanent Atlas knowledge source library."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from source_library import source_library_issues


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--fail-on-overdue", action="store_true")
    args = parser.parse_args()
    errors, warnings = source_library_issues(args.root)
    report = {
        "passed": not errors and not (args.fail_on_overdue and warnings),
        "errors": errors,
        "warnings": warnings,
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "passed": report["passed"],
        "errors": len(errors),
        "warnings": len(warnings),
    }, ensure_ascii=False))
    for error in errors:
        print(f"ERROR: {error}")
    for warning in warnings:
        print("WARNING: " + json.dumps(warning, ensure_ascii=False, sort_keys=True))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
