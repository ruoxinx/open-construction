import type { CatalogKey } from "./registry.js";

export type RecordLike = Record<string, any>;

export interface ClientOptions {
  /** Base URL where the site is hosted (e.g., https://www.openconstruction.org). */
  baseUrl?: string;

  /** If true, fetch() uses cache: "no-store" for always-fresh data. */
  noCache?: boolean;

  /** Optional fetch implementation for tests / Node environments. */
  fetchImpl?: typeof fetch;
}

export interface SearchOptions {
  /** Maximum number of results (default: 200). */
  limit?: number;

  /** If provided, search only these fields. Otherwise search full JSON string. */
  fields?: string[];

  /** Case sensitive search? default false. */
  caseSensitive?: boolean;
}

export type { CatalogKey };
