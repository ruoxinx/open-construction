# OpenConstruction Ontology Governance

This document defines how OpenConstruction should resolve inconsistent dataset labels such as `human`, `people`, `worker`, `helmet`, `hardhat`, `vehicle`, and `excavator` into a shared semantic layer.

## Goal

- each canonical concept has a stable URI in `https://openconstruction.org/ontology/`
- each concept has one canonical preferred label
- dataset-specific synonyms are captured as alternative labels or external mappings
- broader and narrower relations are explicit and machine-readable

The ontology in `ontology/*.ttl` is the semantic source of truth. Website taxonomies and JSON vocabularies should be generated from it or validated against it.

## Source Of Truth

Use these layers for different responsibilities:

- `ontology/*.ttl`: canonical concepts, preferred labels, synonyms safe for reuse, and concept hierarchy
- dataset label mapping files: map raw dataset labels to canonical ontology URIs
- website taxonomy and object vocab JSON: generated or derived presentation artifacts

Do not treat display taxonomies or regex category buckets as the authoritative ontology.

## Canonical Label Rules

Canonical preferred labels should be:

- singular where possible: `Worker`, `Excavator`, `Hard Hat`
- stable across tasks and datasets
- domain-appropriate rather than paper-specific
- readable by humans and durable in URIs

Avoid making every raw dataset label a canonical concept. Canonical concepts should represent domain meaning, not annotation noise.

## Decision Rules

When a new raw label appears, classify it using the following order.

### 1. Exact synonym

Use `skos:altLabel` when the raw label means the same thing as an existing concept.

Examples:

- `hardhat` -> `oc:Hardhat`
- `helmet` -> `oc:Hardhat` when the dataset clearly means construction PPE
- `people-no-helmet` -> `oc:NoHardhat`

### 2. Narrower concept

Create a narrower concept when the raw label is more specific than an existing canonical concept.

Examples:

- `tower crane` -> `oc:TowerCrane`, broader `oc:Crane`
- `colored-hardhat-blue` -> `oc:HardhatBlue`, broader `oc:Hardhat`
- `cmu-wall` -> `oc:CMUWall`, broader `oc:Wall`

### 3. Broader or parent-only dataset label

If a dataset uses a broad parent that is semantically weaker than the object class, map the raw label to the correct canonical concept and preserve the dataset parent in mapping metadata.

Example:

- dataset path `vehicles > excavator`
- canonical concept: `oc:Excavator`
- canonical broader concept: `oc:ConstructionEquipment`
- raw dataset parent path is retained only as dataset evidence, not as ontology truth

### 4. Ambiguous term

Do not auto-collapse ambiguous labels without context.

Examples:

- `pedestrian` is not always `oc:Worker`
- `hat` is not always `oc:Hardhat`
- `hook` is not always `oc:CraneHook`

These should remain separate concepts or require reviewed mappings with notes.

## Mapping Review States

Each dataset-to-canonical mapping should carry a review status:

- `proposed`: machine-suggested or curator-added but not reviewed
- `reviewed`: checked by a domain curator
- `approved`: accepted for production use
- `rejected`: intentionally not mapped

## Recommended Mapping Workflow

1. Normalize the raw label string for matching.
2. Check for an existing canonical URI.
3. Decide whether the raw label is exact, narrower, broader-context, or ambiguous.
4. Record the mapping in a dataset label mapping file.
5. If the concept is new, add it to `ontology/*.ttl`.
6. Regenerate downstream website and JSON vocabulary artifacts.

## Modeling Boundaries

Use the ontology for domain semantics, not every annotation pattern.

Keep these out of the core ontology unless they are broadly reusable concepts:

- dataset-specific typos
- annotation-phase artifacts
- one-off composite labels with embedded workflow state
- temporary regex categories used only for visualization

Those belong in mapping metadata or preprocessing.

## Alignment Strategy

OpenConstruction should align with external standards where useful:

- `schema.org` for general web metadata exposure
- IFC and related AEC standards for building element interoperability

Use `skos:exactMatch` or `skos:closeMatch` only when the semantics really line up.

## Current High-Risk Terms

The following labels require careful review before normalization:

- `pedestrian`
- `hat`
- `hook`
- `vehicle`
- `operator`
- `person`
- `wall`

## Practical Outcome

For contributors, the rule is simple:

- add concepts in Turtle
- map dataset labels in mapping files
- do not invent new canonicals just because a dataset uses a new string

This keeps semantic interoperability stable even when raw dataset labels remain inconsistent.
