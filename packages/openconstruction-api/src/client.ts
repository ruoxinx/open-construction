import { CATALOGS, type CatalogKey } from "./registry.js";
import type { ClientOptions, RecordLike, SearchOptions } from "./types.js";

const DEFAULT_BASE = "https://www.openconstruction.org";

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function normalizeToArray(raw: any): RecordLike[] {
  if (Array.isArray(raw)) return raw;

  // envelope: { datasets: [...] } or { models: [...] } etc.
  if (raw && typeof raw === "object") {
    for (const v of Object.values(raw)) {
      if (Array.isArray(v)) return v as RecordLike[];
    }
    // map: { ID: {...}, ... }
    return Object.values(raw) as RecordLike[];
  }
  return [];
}

function getByIdFromRaw(raw: any, id: string): RecordLike | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const direct = raw[id];
    if (direct && typeof direct === "object") return direct as RecordLike;
  }
  const arr = normalizeToArray(raw);
  return arr.find(r => r?.id === id) ?? null;
}

function includesQuery(haystack: string, needle: string, caseSensitive: boolean) {
  return caseSensitive
    ? haystack.includes(needle)
    : haystack.toLowerCase().includes(needle.toLowerCase());
}

export class OpenConstructionClient {
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private noCache: boolean;

  constructor(opts: ClientOptions = {}) {
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.noCache = !!opts.noCache;
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetchJSON<T = any>(path: string): Promise<T> {
    const url = joinUrl(this.baseUrl, path);
    const res = await this.fetchImpl(url, { cache: this.noCache ? "no-store" : "default" });
    if (!res.ok) throw new Error(`OpenConstruction fetch failed (${res.status}): ${url}`);
    return (await res.json()) as T;
  }

  /** Load raw catalog JSON */
  async catalog<T = any>(key: CatalogKey): Promise<T> {
    return this.fetchJSON<T>(CATALOGS[key]);
  }

  /** Normalize catalog to array (supports array, envelope, or map form) */
  async list(key: CatalogKey): Promise<RecordLike[]> {
    const raw = await this.catalog<any>(key);
    return normalizeToArray(raw);
  }

  /** Get record by ID (supports map + array forms) */
  async get(key: CatalogKey, id: string): Promise<RecordLike | null> {
    const raw = await this.catalog<any>(key);
    return getByIdFromRaw(raw, id);
  }

  /** Keyword search */
  async search(key: CatalogKey, query: string, opts: SearchOptions = {}): Promise<RecordLike[]> {
    const q = (query ?? "").trim();
    if (!q) return [];

    const limit = opts.limit ?? 200;
    const caseSensitive = !!opts.caseSensitive;
    const fields = opts.fields;

    const rows = await this.list(key);
    const out: RecordLike[] = [];

    for (const r of rows) {
      let blob: string;

      if (fields?.length) {
        blob = fields
          .map(f => r?.[f])
          .filter(v => v != null)
          .map(String)
          .join(" ");
      } else {
        blob = JSON.stringify(r);
      }

      if (includesQuery(blob, q, caseSensitive)) {
        out.push(r);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  /* Convenience helpers */
  datasets() { return this.list("datasets"); }
  models() { return this.list("models"); }
  useCases() { return this.list("useCases"); }
  tools() { return this.list("tools"); }
  guides() { return this.list("guides"); }
  oer() { return this.list("oer"); }
  contributors() { return this.list("contributors"); }

  objectVocab() { return this.catalog("objectVocab"); }
  objectTaxonomyConfig() { return this.catalog("objectTaxonomyConfig"); }
}
