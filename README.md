# OpenConstruction Open Science Platform

**OpenConstruction** is a **community-governed, open-source platform** that enables the
**distributed development, validation, and discovery** of datasets, AI models,
workflows (use cases), and open educational resources (OERs) for the
Architecture, Engineering, and Construction (AEC) domain.

🌐 Website: https://www.openconstruction.org  
💬 Community: https://github.com/ruoxinx/OpenConstruction-Datasets/discussions 
📧 Contact: support@openconstruction.org  

---

## Purpose

AI-ready resources in the AEC domain are often fragmented, inconsistently documented,
and difficult to reuse. OpenConstruction addresses this challenge by providing
**shared infrastructure, standards, and workflows** that support:

- Discoverability and comparison of AEC AI resources  
- Reproducible research and benchmarking  
- Community stewardship and long-term maintenance  
- Continuous, distributed platform development  

OpenConstruction **does not host datasets or models**. It indexes publicly available
resources and focuses on the **platform and standards** that make them reusable.

---

## Repository Structure

```text
.
├── data/                 # Catalog entries (datasets, models, workflows, OERs)
├── schemas/              # Versioned JSON metadata schemas
├── scripts/              # Validation and QA utilities
├── modules/              # Community-maintained platform extensions
│   ├── dataset_ingestion/
│   ├── model_evaluators/
│   ├── usecase_templates/
│   └── registry.json
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── CONTRIBUTING.md
├── GOVERNANCE.md
└── README.md
```text


---
## How to Contribute

OpenConstruction follows a distributed development model.

You can contribute by:

- Adding or updating catalog entries

- Improving metadata schemas or validation scripts

- Developing platform modules (ingestion helpers, evaluators, benchmarks)

- Improving documentation or tooling

👉 See CONTRIBUTING.md for details.


---
## Continuous Integration & Quality Assurance

All pull requests are validated through CI/CD workflows that include:

- JSON schema validation

- Required metadata checks

- Lightweight link validation

- Attribution and license checks

This ensures contributions are consistent, interoperable, and sustainable.

---
## Governance & Stewardship

OpenConstruction is sustained through open, rotating, community-driven roles
that support long-term maintenance and evolution.

👉 See GOVERNANCE.md for details.

---
## Acknowledgment

We thank the global community of researchers, educators, and practitioners whose
contributions advance open science and AI innovation in the AEC domain.