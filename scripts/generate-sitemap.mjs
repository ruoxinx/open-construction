// Usage: node scripts/generate-sitemap.mjs
import fs from "fs";
import path from "path";

/** ====== EDIT THESE ====== */
const baseUrl = "https://www.openconstruction.org";
const webRoot = ".";                   // repo root or the folder that contains your HTML (e.g., "./docs")
const outputPath = path.join(webRoot, "sitemap.xml");

// Public top-level pages you want indexed:
const staticPages = [
  "/", "/index.html",
  "/datasets.html", "/models.html", "/usecases.html", "/tools.html", "/oer.html",
  "/contributors.html", "/community.html", "/about.html", "/contact.html"
];

// Collections defined by JSON catalogs (add/remove as needed).
// If you don’t have per-item pages yet, keep these and the script will skip those URLs.
const collections = [
  // Example: items in data/datasets.json -> /datasets/<id>.html
  { jsonPath: "data/datasets.json", urlTemplate: "/datasets/:id.html", idKey: "id" },
  { jsonPath: "data/models.json",   urlTemplate: "/models/:id.html",   idKey: "id" },
  { jsonPath: "data/usecases.json", urlTemplate: "/usecases/:id.html", idKey: "id" },
  { jsonPath: "data/tools.json",    urlTemplate: "/tools/:id.html",    idKey: "id" },
  { jsonPath: "data/oer.json",      urlTemplate: "/oer/:id.html",      idKey: "id" },
];
/** ========================= */

const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

function fileExists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function htmlPathFor(urlPath) {
  // Map URL -> expected local file path for lastmod (adjust if your site builds to ./docs)
  const resolved = urlPath === "/" ? path.join(webRoot, "index.html") : path.join(webRoot, urlPath.replace(/^\//, ""));
  return resolved;
}

function lastmodFor(urlPath) {
  const p = htmlPathFor(urlPath);
  try {
    const stat = fs.statSync(p);
    return isoDate(stat.mtime);
  } catch {
    // Fallback to today if local file isn’t found (e.g., built by CI)
    return isoDate(Date.now());
  }
}

function slugify(v) {
  return String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildUrlFromTemplate(tpl, item, idKey) {
  const id = item[idKey] ?? item.id ?? item.slug ?? item.title;
  return tpl.replace(":id", slugify(id));
}

function collectStaticUrls() {
  return staticPages.map((u) => ({
    loc: new URL(u, baseUrl).toString(),
    lastmod: lastmodFor(u)
  }));
}

function collectCollectionUrls() {
  const out = [];
  for (const col of collections) {
    if (!fileExists(col.jsonPath)) continue;
    const raw = fs.readFileSync(col.jsonPath, "utf8");
    let data;
    try { data = JSON.parse(raw); } catch { continue; }

    // Support either array root or {resources:[...]}
    const items = Array.isArray(data) ? data : (Array.isArray(data.resources) ? data.resources : []);
    for (const it of items) {
      const urlPath = buildUrlFromTemplate(col.urlTemplate, it, col.idKey || "id");

      // Only include per-item URL if the page exists locally (avoids 404s if you don’t generate detail pages)
      if (fileExists(htmlPathFor(urlPath))) {
        out.push({
          loc: new URL(urlPath, baseUrl).toString(),
          lastmod: lastmodFor(urlPath)
        });
      }
    }
  }
  return out;
}

function buildXml(urls) {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
  ];
  for (const u of urls) {
    lines.push(`  <url>`);
    lines.push(`    <loc>${u.loc}</loc>`);
    if (u.lastmod) lines.push(`    <lastmod>${u.lastmod}</lastmod>`);
    // (Optional) add changefreq/priority here if you want
    lines.push(`  </url>`);
  }
  lines.push(`</urlset>`);
  return lines.join("\n");
}

(function main() {
  const urls = [...collectStaticUrls(), ...collectCollectionUrls()];
  // Deduplicate
  const byLoc = new Map();
  for (const u of urls) byLoc.set(u.loc, u);
  const xml = buildXml([...byLoc.values()].sort((a,b) => a.loc.localeCompare(b.loc)));

  fs.writeFileSync(outputPath, xml, "utf8");
  console.log(`✓ Wrote ${outputPath} with ${byLoc.size} URLs`);
})();
