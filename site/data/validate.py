#!/usr/bin/env python3
# Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
# SPDX-License-Identifier: Apache-2.0

import json, sys
from jsonschema import Draft202012Validator

with open('dataset.schema.json', 'r', encoding='utf-8') as f:
    schema = json.load(f)
with open('datasets.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

validator = Draft202012Validator(schema)
errors = sorted(validator.iter_errors(data), key=lambda e: e.path)

if errors:
    print("Schema validation failed:\n")
    for e in errors[:50]:
        path = ".".join(map(str, e.path)) or "<root>"
        print(f"- {path}: {e.message}")
    sys.exit(1)
else:
    print("datasets.json validated successfully.")
