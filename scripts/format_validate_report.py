#!/usr/bin/env python3
"""
Format validation outputs into a Markdown report.

Typical usage in CI:
  python scripts/validate_json.py --report reports/validate.json
  python scripts/check_links.py --report reports/links.json
  python scripts/format_validate_report.py \
      --validate reports/validate.json \
      --links reports/links.json \
      --out reports/summary.md

Exit codes:
  0 = Report written (even if failures exist)
  1 = Report written but indicates failures (optional via --fail-on-errors)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]


def load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def md_escape(s: str) -> str:
    return s.replace("\n", " ").strip()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--validate", help="Path to validate.json produced by validate_json.py")
    ap.add_argument("--links", help="Path to links.json produced by check_links.py")
    ap.add_argument("--out", required=True, help="Output Markdown file path")
    ap.add_argument("--fail-on-errors", action="store_true", help="Exit 1 if any check failed")
    args = ap.parse_args()

    validate_data: Optional[Dict[str, Any]] = None
    links_data: Optional[Dict[str, Any]] = None

    if args.validate:
        vpath = Path(args.validate)
        if not vpath.is_absolute():
            vpath = REPO_ROOT / vpath
        if vpath.exists():
            validate_data = load_json(vpath)

    if args.links:
        lpath = Path(args.links)
        if not lpath.is_absolute():
            lpath = REPO_ROOT / lpath
        if lpath.exists():
            links_data = load_json(lpath)

    lines: List[str] = []
    lines.append("# OpenConstruction CI Report")
    lines.append("")
    lines.append("This report summarizes automated checks for schema compliance and link integrity.")
    lines.append("")

    any_failed = False

    # --- Schema validation section ---
    lines.append("## Schema Validation")
    if not validate_data:
        lines.append("_No schema validation report found._")
        lines.append("")
    else:
        ok = bool(validate_data.get("ok", False))
        any_failed = any_failed or (not ok)
        status = "✅ Passed" if ok else "❌ Failed"
        lines.append(f"**Status:** {status}")
        missing = validate_data.get("missing", []) or []
        issues = validate_data.get("issues", []) or []
        lines.append("")
        if missing:
            lines.append("**Missing files:**")
            for m in missing:
                lines.append(f"- {md_escape(m)}")
            lines.append("")
        if issues:
            # group by file
            by_file: Dict[str, List[Dict[str, Any]]] = {}
            for it in issues:
                by_file.setdefault(it.get("file", "unknown"), []).append(it)

            lines.append("**Validation errors (top 20 per file):**")
            for f, items in by_file.items():
                schema = items[0].get("schema", "")
                lines.append(f"- **{f}** (schema: `{schema}`)")
                for it in items[:20]:
                    path = it.get("path", "$")
                    msg = it.get("message", "")
                    lines.append(f"  - `{path}`: {md_escape(msg)}")
                if len(items) > 20:
                    lines.append(f"  - … ({len(items) - 20} more)")
            lines.append("")
        if ok and (not missing) and (not issues):
            lines.append("No schema issues found.")
            lines.append("")

    # --- Links section ---
    lines.append("## Link Check")
    if not links_data:
        lines.append("_No link check report found._")
        lines.append("")
    else:
        ok = bool(links_data.get("ok", False))
        any_failed = any_failed or (not ok)
        status = "✅ Passed" if ok else "❌ Failed"
        checked = links_data.get("checked", 0)
        broken_count = links_data.get("broken_count", 0)
        lines.append(f"**Status:** {status}")
        lines.append(f"- URLs checked: **{checked}**")
        lines.append(f"- Broken URLs: **{broken_count}**")
        lines.append("")
        broken = links_data.get("broken", []) or []
        if broken:
            lines.append("**Broken URLs (top 50):**")
            for b in broken[:50]:
                url = b.get("url", "")
                code = b.get("status", "")
                src = b.get("source_file", "")
                lines.append(f"- [{src}] {url} ({code})")
            if len(broken) > 50:
                lines.append(f"- … ({len(broken) - 50} more)")
            lines.append("")

    # Write output
    out_path = Path(args.out)
    if not out_path.is_absolute():
        out_path = REPO_ROOT / out_path
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"📝 Wrote Markdown report: {out_path}")

    if args.fail_on_errors and any_failed:
        raise SystemExit(1)
    raise SystemExit(0)


if __name__ == "__main__":
    main()
