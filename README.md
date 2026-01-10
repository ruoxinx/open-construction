# OpenConstruction Open Science Platform

![CI](https://github.com/ruoxinx/OpenConstruction-Datasets/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/ruoxinx/OpenConstruction-Datasets)
![Contributors](https://img.shields.io/github/contributors/ruoxinx/OpenConstruction-Datasets)
![Issues](https://img.shields.io/github/issues/ruoxinx/OpenConstruction-Datasets)

**OpenConstruction** is a **community-governed, open-source platform** that enables the
**distributed development, validation, and discovery** of datasets, AI models,
workflows, and open educational resources (OERs) for the
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
resources and focuses on the **platform and standards** that make them reusable,
interoperable, and sustainable.

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
│   ├── ISSUE_TEMPLATE/   # Structured contribution templates
│   └── workflows/        # CI/CD pipelines
└── README.md
```

---

## Contribution Model (Distributed Development)

OpenConstruction follows a **distributed development model** aligned with open-source
best practices and NSF POSE principles.

Anyone may participate by proposing contributions, reviewing changes, and helping
maintain both **the cataloged resources** and **the platform infrastructure**.

### Ways to Contribute

You can contribute by:
- Adding or updating dataset, model, workflow, or OER entries
- Improving metadata schemas or validation scripts
- Developing platform modules (ingestion helpers, evaluators, benchmarks)
- Improving documentation, tooling, or onboarding materials

---

## How to Contribute

1. Open an issue using the appropriate template.
2. Fork the repository and create a feature branch.
3. Add or modify files following schema and contribution standards.
4. Submit a pull request (PR) describing your changes.
5. Address review feedback; once approved, the PR is merged and credited.

All contributions undergo **peer review** and **automated CI checks**.

---

## Continuous Integration & Quality Assurance

All pull requests are validated through **CI/CD workflows**, including:
- JSON schema validation  
- Required metadata field checks  
- Lightweight link validation  
- Attribution and license checks  

These checks ensure that community contributions are
**consistent, interoperable, and sustainable**.

---

## Modular Extension System

OpenConstruction supports **community-maintained modules** that extend platform
capabilities without central bottlenecks.

Example module types include:
- Benchmark definitions and task packs
- Validation and enrichment utilities

Modules are registered and maintained independently
by contributors, enabling **co-development of platform capabilities**.

---

## Governance & Stewardship

The OpenConstruction ecosystem is sustained through **open, rotating,
community-driven roles**, including:

- **Core Maintainers** – platform-wide stewardship and governance
- **Module Maintainers** – oversight of specific catalogs or modules
- **Stewards & Reviewers** – quality assurance and contributor mentoring
- **Release Leads** – coordination of periodic releases and changelogs
- **Community Contributors** – anyone participating in development or review

Roles are **open, merit-based, and time-bound**, supporting long-term sustainability
beyond any single institution or individual.

---

## Licensing

OpenConstruction respects all intellectual property and does not redistribute
restricted or proprietary content.

---

## Acknowledgment

We thank the global community of researchers, educators, and practitioners whose
contributions advance open science and AI innovation in the AEC domain.
