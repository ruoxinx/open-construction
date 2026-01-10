#!/usr/bin/env python3
"""
Lightweight link checker for URLs inside OpenConstruction JSON.

Usage:
  python scripts/check_links.py
  python scripts/check_links.py --max-urls 300 --report reports/links.json
  python scripts/check_links.py --files data/datasets.json data/models.json

Exit codes:
  0 = OK
  1 = Too many broken links / request failures
"""

from __future__ import annotations

import argparse
import json
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]

DEFAULT_FILES = [
    "data/datasets.json",
    "data/models.json",
    "data/use-cases.json",
    "data/oer.json",
]

# Common fields that often contain URLs
URL_KEYS = {
    "url",
    "homepage",
    "repo",
    "repo_url",
    "code_url",
    "paper",
    "paper_url",
    "doi",
    "dataset_url",
    "model_url",
    "contributor_url",
    "link_url",
    "github",
    "website",
}

# Treat these as OK (frequent false positives)
IGNORE_PATTERNS = [
    r"^mailto:",
    r"^tel:",
    r"^#",
]

# Some sites block HEAD; we fallback to GET automatically
TIMEOUT = 12
USER_AGENT = "OpenConstructionLinkChecker/1.0 (+https://www.openconstruction.org)"


@dataclass
class LinkResult:
    url: str
    ok: bool
    status: str
    source_file: str


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def is_ignored(url: str) -> bool:
    return any(re.search(p, url, re.IGNORECASE) for p in IGNORE_PATTERNS)


def iter_urls(obj: Any) -> Iterable[str]:
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str):
                if (k in URL_KEYS or k.endswith("_url") or k.endswith("Url")) and v.strip():
                    yield v.strip()
                elif v.startswith("http://") or v.startswith("https://"):
                    # catch URLs even if key isn't in URL_KEYS
                    yield v.strip()
            else:
                yield from iter_urls(v)
    elif isinstance(obj, list):
        for x in obj:
            yield from iter_urls(x)


def normalize(url: str) -> Optional[str]:
    u = url.strip()
    if not u:
        return None
    if is_ignored(u):
        return None
    if u.startswith("http://") or u.startswith("https://"):
        return u
    # Allow DOI URLs like "10.1234/abcd" only if you store raw DOI strings
    if u.startswith("10.") and "/" in u:
        return "https://doi.org/" + u
    return None


def check_one(url: str) -> Tuple[bool, str]:
    headers = {"User-Agent": USER_AGENT}
    try:
        r = requests.head(url, allow_redirects=True, timeout=TIMEOUT, headers=headers)
        code = r.status_code
        if code == 405 or code == 403 or code >= 500:
            # fallback to GET for servers that block HEAD or behave poorly
            r = requests.get(url, allow_redirects=True, timeout=TIMEOUT, headers=headers, stream=True)
            code = r.status_code
        if 200 <= code < 400:
            return True, str(code)
        return False, str(code)
    except Exception:
        return False, "error"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--files", nargs="*", default=DEFAULT_FILES, help="JSON files to scan")
    ap.add_argument("--max-urls", type=int, default=250, help="Max URLs checked in total (default: 250)")
    ap.add_argument("--fail-threshold", type=int, default=1, help="Fail if broken links >= threshold (default: 1)")
    ap.add_argument("--report", help="Write JSON report to this path")
    ap.add_argument("--sleep", type=float, default=0.0, help="Sleep seconds between requests (default: 0)")
    args = ap.parse_args()

    files = args.files
    all_urls: List[Tuple[str, str]] = []  # (source_file, url)
    seen: Set[str] = set()

    for f_rel in files:
        p = (REPO_ROOT / f_rel).resolve()
        if not p.exists():
            print(f"⚠️  Skipping missing file: {f_rel}")
            continue
        data = load_json(p)
        for raw in iter_urls(data):
            u = normalize(raw)
            if not u:
                continue
            if u in seen:
                continue
            seen.add(u)
            all_urls.append((f_rel, u))

    # cap to keep CI fast
    all_urls = all_urls[: args.max_urls]

    results: List[LinkResult] = []
    broken: List[LinkResult] = []

    print(f"🔎 Checking {len(all_urls)} URLs (max={args.max_urls})")

    for source_file, url in all_urls:
        ok, status = check_one(url)
        res = LinkResult(url=url, ok=ok, status=status, source_file=source_file)
        results.append(res)
        if not ok:
            broken.append(res)
        if args.sleep > 0:
            time.sleep(args.sleep)

    if broken:
        print("\n❌ Broken links found:")
        for b in broken[:50]:
            print(f" - [{b.source_file}] {b.url} ({b.status})")
        if len(broken) > 50:
            print(f"   … ({len(broken) - 50} more)")

    ok = len(broken) < args.fail_threshold

    if args.report:
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = REPO_ROOT / report_path
        report_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "ok": ok,
            "checked": len(results),
            "broken_count": len(broken),
            "broken": [
                {"url": b.url, "status": b.status, "source_file": b.source_file}
                for b in broken
            ],
        }
        report_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"\n📝 Wrote report: {report_path}")

    if ok:
        print("\n✅ Link check passed.")
        raise SystemExit(0)
    else:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
