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
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

REPO_ROOT = Path(__file__).resolve().parents[1]

# ✅ Canonical validation targets (NOT site/)
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
        out += f"[{p}]" if isinstance(p, int) else f".{p}"
    return out


# ✅ Build registry so schema.common.json resolves correctly
def build_schema_registry(schemas_dir: Path) -> Registry:
    registry: Registry = Registry()

    for schema_file in schemas_dir.glob("*.json"):
        schema = _load_json(schema_file)

        schema_id = schema.get("$id", schema_file.name)
        resource = Resource.from_contents(schema, default_specification=DRAFT202012)

        # Register by $id (preferred)
        registry = registry.with_resource(schema_id, resource)
        # Register by filename (supports relative refs)
        registry = registry.with_resource(schema_file.name, resource)

    return registry


def validate_one(data_path: Path, schema_path: Path, registry: Registry) -> List[Issue]:
    data = _load_json(data_path)
    schema = _load_json(schema_path)

    validator = Draft202012Validator(schema, registry=registry)
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))

    return [
        Issue(
            file=str(data_path.relative_to(REPO_ROOT)),
            schema=str(schema_path.relative_to(REPO_ROOT)),
            path=_format_path(list(e.path)),
            message=e.message,
        )
        for e in errors
    ]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", help="Validate only this data file (relative to repo root)")
    ap.add_argument("--schema", help="Schema file for --data (relative to repo root)")
    ap.add_argument("--report", help="Write JSON report")
    ap.add_argument("--max-errors", type=int, default=50)
    args = ap.parse_args()

    if args.data or args.schema:
        if not (args.data and args.schema):
            raise SystemExit("ERROR: --data and --schema must be provided together.")
        pairs = [(args.data, args.schema)]
    else:
        pairs = DEFAULT_PAIRS

    registry = build_schema_registry(REPO_ROOT / "schemas")

    all_issues: List[Issue] = []
    missing: List[str] = []

    for d_rel, s_rel in pairs:
        data_path = REPO_ROOT / d_rel
        schema_path = REPO_ROOT / s_rel

        if not data_path.exists():
            missing.append(f"Missing data file: {d_rel}")
            continue
        if not schema_path.exists():
            missing.append(f"Missing schema file: {s_rel}")
            continue

        all_issues.extend(validate_one(data_path, schema_path, registry))

    ok = not missing and not all_issues

    if missing:
        print("\n❌ Missing required files:")
        for m in missing:
            print(f" - {m}")

    if all_issues:
        print("\n❌ Schema validation errors:")
        by_file: Dict[str, List[Issue]] = {}
        for it in all_issues:
            by_file.setdefault(it.file, []).append(it)

        for f, items in by_file.items():
            print(f"\nFile: {f}")
            print(f"Schema: {items[0].schema}")
            for it in items[: args.max_errors]:
                print(f" - {it.path}: {it.message}")

    if args.report:
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = REPO_ROOT / report_path
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(
            json.dumps(
                {
                    "ok": ok,
                    "missing": missing,
                    "issues": [i.__dict__ for i in all_issues],
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\n📝 Wrote report: {report_path}")

    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
