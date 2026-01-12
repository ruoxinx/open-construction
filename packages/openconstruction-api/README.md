# @openconstruction/api

A lightweight JavaScript/TypeScript SDK for accessing OpenConstruction catalogs
(static JSON) hosted under `/data/*.json` on the OpenConstruction Open Science Platform.

This package provides a client for programmatic access to
datasets, models, tools, guides, use cases, educational resources, contributors,
and taxonomy metadata curated by OpenConstruction.


## Features

- Simple client for OpenConstruction catalogs
- Works with the hosted site **or** GitHub raw URLs
- Normalizes common JSON shapes:
  - Arrays
  - `{ id: record }` maps
  - Envelope objects (e.g., `{ datasets: [...] }`)
- Built-in keyword search helper
- Designed for browsers, Node.js, CI pipelines, and reproducible research


## Install

```bash
npm i @openconstruction/api
```

## Quick start (Hosted site)

```ts
import { OpenConstructionClient } from "@openconstruction/api";

const oc = new OpenConstructionClient({
  baseUrl: "https://www.openconstruction.org",
  noCache: true
});

const datasets = await oc.datasets();
const hits = await oc.search("models", "BIM", { limit: 50 });

console.log(datasets.length, hits.length);
```


## Quick start (GitHub raw)

This mode is useful for CI, reproducibility, or testing against a specific branch.

```ts
import { OpenConstructionClient } from "@openconstruction/api";

const oc = new OpenConstructionClient({
  baseUrl: "https://raw.githubusercontent.com/ruoxinx/open-construction/main/site",
  noCache: true
});

const vocab = await oc.objectVocab();
console.log(vocab);
```



## Catalog keys

Use these keys with `oc.list(key)`, `oc.get(key, id)`, or `oc.search(key, query, opts)`:

- `datasets`
- `models`
- `useCases`
- `tools`
- `guides`
- `oer`
- `contributors`
- `objectVocab`
- `objectTaxonomyConfig`



## Common methods

```ts
await oc.list("datasets");
await oc.get("models", "BIMgent");
await oc.search("tools", "annotation", { limit: 20 });
```



## Notes

- Setting `noCache: true` forces `fetch()` to use `cache: "no-store"` for always-fresh data.
- All catalogs are **read-only** and served as static JSON.
- This SDK performs no authentication and makes no assumptions about backend services.
- The SDK is optional — OpenConstruction catalogs can always be accessed directly via `fetch()`.
