#!/usr/bin/env python3
import json, sys, os
from jsonschema import Draft202012Validator

schema_path = os.path.join('site/data','dataset.schema.json')
data_path = os.path.join('site/data','datasets.json')

with open(schema_path, 'r', encoding='utf-8') as f:
    schema = json.load(f)
with open(data_path, 'r', encoding='utf-8') as f:
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
