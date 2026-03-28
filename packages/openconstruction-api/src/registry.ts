// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

export const CATALOGS = {
  datasets: "data/datasets.json",
  models: "data/models.json",
  useCases: "data/use-cases.json",
  tools: "data/tools.json",
  guides: "data/guides.json",
  oer: "data/oer.json",
  contributors: "data/contributors.json",
  objectVocab: "data/object_vocab.json",
  objectTaxonomyConfig: "data/object_taxonomy_config.json"
} as const;

export type CatalogKey = keyof typeof CATALOGS;