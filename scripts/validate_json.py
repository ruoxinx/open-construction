#!/usr/bin/env python3
"""
Validate OpenConstruction JSON files against JSON Schemas.

Usage:
  python scripts/validate_json.py
  python scripts/validate_json.py --data data/datasets.json --schema schemas/datasets.schema.json
  python scripts/validate_json.py --report reports/validate.json

Exit codes:
  0 = OK
  1 = Validation errors or missing files
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from jsonschema import Draft202012Validator

REPO_ROOT = Path(__file__).resolve().parents[1]

DEFAULT_PAIRS: List[Tuple[str, str]] = [
    ("site/data/datasets.json", "schemas/datasets.schema.json"),
    ("site/data/models.json", "schemas/models.schema.json"),
    ("site/data/use-cases.json", "schemas/use-cases.schema.json"),
    ("site/data/oer.json", "schemas/oer.schema.json"),
]


@dataclass
class Issue:
    file: str
    schema: str
    path: str
    message: str


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _format_path(parts: List[Any]) -> str:
    if not parts:
        return "$"
    out = "$"
    for p in parts:
        if isinstance(p, int):
            out += f"[{p}]"
        else:
            out += f".{p}"
    return out


def validate_one(data_path: Path, schema_path: Path) -> List[Issue]:
    data = _load_json(data_path)
    schema = _load_json(schema_path)

    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))

    issues: List[Issue] = []
    for e in errors:
        issues.append(
            Issue(
                file=str(data_path.relative_to(REPO_ROOT)),
                schema=str(schema_path.relative_to(REPO_ROOT)),
                path=_format_path(list(e.path)),
                message=e.message,
            )
        )
    return issues


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", help="Validate only this data file (relative to repo root)")
    ap.add_argument("--schema", help="Schema file for --data (relative to repo root)")
    ap.add_argument(
        "--report",
        help="Write JSON report to this path (relative to repo root unless absolute)",
    )
    ap.add_argument(
        "--max-errors",
        type=int,
        default=50,
        help="Maximum errors printed per file (default: 50)",
    )
    args = ap.parse_args()

    pairs: List[Tuple[str, str]]
    if args.data or args.schema:
        if not (args.data and args.schema):
            raise SystemExit("ERROR: --data and --schema must be provided together.")
        pairs = [(args.data, args.schema)]
    else:
        pairs = DEFAULT_PAIRS

    all_issues: List[Issue] = []
    missing: List[str] = []

    for d_rel, s_rel in pairs:
        data_path = (REPO_ROOT / d_rel).resolve()
        schema_path = (REPO_ROOT / s_rel).resolve()

        if not data_path.exists():
            missing.append(f"Missing data file: {d_rel}")
            continue
        if not schema_path.exists():
            missing.append(f"Missing schema file: {s_rel}")
            continue

        issues = validate_one(data_path, schema_path)
        if issues:
            all_issues.extend(issues)

    ok = (not missing) and (not all_issues)

    # Print summary
    if missing:
        print("\n❌ Missing required files:")
        for m in missing:
            print(f" - {m}")

    # Group issues by file
    if all_issues:
        print("\n❌ Schema validation errors:")
        by_file: Dict[str, List[Issue]] = {}
        for it in all_issues:
            by_file.setdefault(it.file, []).append(it)

        for f, items in by_file.items():
            print(f"\nFile: {f}")
            # show corresponding schema (first)
            print(f"Schema: {items[0].schema}")
            for it in items[: args.max_errors]:
                print(f" - {it.path}: {it.message}")
            if len(items) > args.max_errors:
                print(f"   … ({len(items) - args.max_errors} more)")

    # Write report if requested
    if args.report:
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = REPO_ROOT / report_path
        report_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "ok": ok,
            "missing": missing,
            "issues": [
                {
                    "file": i.file,
                    "schema": i.schema,
                    "path": i.path,
                    "message": i.message,
                }
                for i in all_issues
            ],
        }
        report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"\n📝 Wrote report: {report_path}")

    if ok:
        print("\n✅ JSON schema validation passed.")
        raise SystemExit(0)
    else:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
