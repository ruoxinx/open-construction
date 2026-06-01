#!/usr/bin/env python3
"""Sync public GitHub contribution events into Supabase.

This job intentionally stays narrow:
  - GitHub pull requests are synced automatically when they map to a signed-in
    profile's GitHub username.
  - Catalog, OER, workflow, and practitioner contributions are verified by
    maintainers and recognized with direct badges in Supabase.

Required env:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Optional env:
  GITHUB_REPOSITORY (defaults to ruoxinx/open-construction)
  GITHUB_TOKEN
  DRY_RUN=1
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request


REPO = os.environ.get("GITHUB_REPOSITORY", "ruoxinx/open-construction")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
DRY_RUN = os.environ.get("DRY_RUN") == "1"


def request_json(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, body=None):
    data = None
    req_headers = {
        "Accept": "application/json",
        "User-Agent": "openconstruction-contribution-sync",
    }
    if headers:
        req_headers.update(headers)
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else None


def github_headers():
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def supabase_headers():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "resolution=merge-duplicates",
    }


def fetch_merged_prs():
    query = urllib.parse.quote(f"repo:{REPO} is:pr is:merged", safe="")
    url = f"https://api.github.com/search/issues?q={query}&sort=updated&order=desc&per_page=100"
    payload = request_json(url, headers=github_headers())
    return payload.get("items", [])


def fetch_profiles_by_github_username():
    url = f"{SUPABASE_URL}/rest/v1/profiles?select=user_id,github_username&github_username=not.is.null"
    rows = request_json(url, headers=supabase_headers()) or []
    return {
        str(row.get("github_username", "")).lower().lstrip("@"): row.get("user_id")
        for row in rows
        if row.get("github_username") and row.get("user_id")
    }


def upsert_contribution_events(rows):
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/contribution_events?on_conflict=external_id"
    request_json(url, method="POST", headers=supabase_headers(), body=rows)


def upsert_badges(rows):
    user_ids = sorted({row.get("user_id") for row in rows if row.get("user_id")})
    if not user_ids:
        return
    badge_rows = [
        {
            "user_id": user_id,
            "badge_key": "contributor",
            "badge_label": "Contributor",
            "badge_description": "Verified OpenConstruction platform contribution.",
            "public": True,
        }
        for user_id in user_ids
    ]
    url = f"{SUPABASE_URL}/rest/v1/user_badges?on_conflict=user_id,badge_key"
    request_json(url, method="POST", headers=supabase_headers(), body=badge_rows)


def github_contribution_events(profile_by_username):
    rows = []
    for pr in fetch_merged_prs():
        number = pr.get("number")
        author = str(pr.get("user", {}).get("login", "")).lower()
        rows.append({
            "user_id": profile_by_username.get(author),
            "provider": "github",
            "external_id": f"github:{REPO}:pull_request:{number}",
            "contribution_type": "pull_request",
            "title": pr.get("title"),
            "url": pr.get("html_url"),
            "public": True,
            "occurred_at": pr.get("closed_at") or pr.get("updated_at"),
        })
    return rows


def main() -> int:
    profile_by_username = {} if DRY_RUN else fetch_profiles_by_github_username()
    rows = github_contribution_events(profile_by_username)

    if DRY_RUN:
        print(json.dumps(rows[:20], indent=2))
        print(f"Dry run prepared {len(rows)} GitHub contribution events.")
        return 0

    upsert_contribution_events(rows)
    upsert_badges(rows)
    print(f"Synced {len(rows)} GitHub contribution events from {REPO}.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"sync_contributions.py failed: {exc}", file=sys.stderr)
        raise
