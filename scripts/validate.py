#!/usr/bin/env python3
# Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
# SPDX-License-Identifier: Apache-2.0

import argparse
import json
import os
import re
import sys
import unicodedata
from jsonschema import Draft202012Validator

schema_path = os.path.join('site/data','dataset.schema.json')
data_path = os.path.join('site/data','datasets.json')
geo_path = os.path.join('site/data','geo-locations.json')

DEFAULT_GEO_CONTEXT_TERMS = {
    "global": ["global", "worldwide"],
    "regional": ["africa", "asia", "europe", "north america", "south america", "oceania"],
    "virtual": ["virtual", "simulator", "synthetic"],
    "web": ["internet", "youtube", "wikipedia", "website", "web source", "open source"],
    "unspecified": ["not specified", "unspecified", "unknown", "none", "na", "n a"],
}


def load_json(path):
    with open(path, 'r', encoding='utf-8-sig') as f:
        return json.load(f)


def geo_base_key(value):
    text = "" if value is None else str(value).strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[.']", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def norm_list(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if value is None:
        return []
    text = str(value).strip()
    return [text] if text else []


def location_terms(item):
    out = []

    def add(value):
        if isinstance(value, list):
            for nested in value:
                add(nested)
            return
        text = "" if value is None else str(value).strip()
        if not text:
            return
        for term in re.split(r"[,;|/]+|\s+\+\s+|\s+and\s+|\s*&\s*", text, flags=re.I):
            term = term.strip()
            if term:
                out.append(term)

    for key in ("geographical_location", "geography", "location", "locations", "country", "countries"):
        add(item.get(key))
    return out


def has_context_term(key, term):
    escaped = re.escape(term).replace(r"\ ", r"\s+")
    return re.search(rf"(^|\s){escaped}(\s|$)", key) is not None


def geo_context_type(key, context_terms):
    if not key:
        return "unspecified"
    contains_types = {"global", "virtual", "web", "unspecified"}
    for context_type, terms in context_terms.items():
        if key in terms:
            return context_type
        if context_type in contains_types and any(has_context_term(key, term) for term in terms):
            return context_type
    return ""


def validate_geo_locations(data, data_file=data_path, geo_file=geo_path):
    issues = []
    if not os.path.exists(geo_file):
        return [{
            "file": geo_file,
            "schema": "controlled-vocabulary",
            "path": "$",
            "message": "Missing geo-locations.json for Dataset Geography validation.",
        }]

    geo = load_json(geo_file)
    location_keys = {
        geo_base_key(item.get("key") or item.get("label") or item.get("name"))
        for item in geo.get("locations", [])
        if isinstance(item, dict)
    }
    aliases = {
        geo_base_key(raw_key): geo_base_key(raw_value)
        for raw_key, raw_value in (geo.get("aliases") or {}).items()
        if geo_base_key(raw_key) and geo_base_key(raw_value)
    }
    context_terms = {}
    merged_context = {**DEFAULT_GEO_CONTEXT_TERMS, **(geo.get("context_terms") or {})}
    for context_type, terms in merged_context.items():
        context_terms[context_type] = [geo_base_key(term) for term in norm_list(terms) if geo_base_key(term)]

    for raw_key, raw_value in aliases.items():
        if raw_value not in location_keys and not geo_context_type(raw_value, context_terms):
            issues.append({
                "file": geo_file,
                "schema": "controlled-vocabulary",
                "path": f"$.aliases.{raw_key}",
                "message": f"Geo alias '{raw_key}' points to unknown target '{raw_value}'.",
            })

    for dataset_id, item in data.items():
        if not isinstance(item, dict):
            continue
        for raw_term in location_terms(item):
            key = aliases.get(geo_base_key(raw_term), geo_base_key(raw_term))
            if geo_context_type(key, context_terms):
                continue
            if key in location_keys:
                continue
            issues.append({
                "file": data_file,
                "schema": "controlled-vocabulary",
                "path": f"$.{dataset_id}.geographical_location",
                "message": (
                    f"Unknown geography term '{raw_term}'. Add a country/territory to "
                    "site/data/geo-locations.json, add an alias, or classify it as a context term."
                ),
            })
    return issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default=data_path, help="Dataset JSON file to validate")
    parser.add_argument("--schema", default=schema_path, help="Dataset JSON schema")
    parser.add_argument("--geo", default=geo_path, help="Dataset geography vocabulary JSON")
    parser.add_argument("--report", help="Write JSON validation report")
    parser.add_argument("--max-errors", type=int, default=50)
    args = parser.parse_args()

    schema = load_json(args.schema)
    data = load_json(args.data)

    validator = Draft202012Validator(schema)
    schema_errors = sorted(validator.iter_errors(data), key=lambda e: e.path)
    issues = [
        {
            "file": args.data,
            "schema": args.schema,
            "path": ".".join(map(str, e.path)) or "<root>",
            "message": e.message,
        }
        for e in schema_errors
    ]
    issues.extend(validate_geo_locations(data, args.data, args.geo))

    if issues:
        print("Validation failed:\n")
        for issue in issues[: args.max_errors]:
            print(f"- {issue['file']} {issue['path']}: {issue['message']}")
    else:
        print("datasets.json validated successfully.")
        print("Dataset geography vocabulary validated successfully.")

    if args.report:
        report = {
            "ok": not issues,
            "missing": [],
            "issues": issues,
        }
        report_dir = os.path.dirname(args.report)
        if report_dir:
            os.makedirs(report_dir, exist_ok=True)
        with open(args.report, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
            f.write("\n")
        print(f"Wrote report: {args.report}")

    sys.exit(0 if not issues else 1)


if __name__ == "__main__":
    main()
