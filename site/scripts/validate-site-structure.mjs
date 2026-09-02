import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteRoot = path.resolve(__dirname, "..");

const expectedTopLevelDirs = new Set([
  "assets",
  "auth",
  "data",
  "datasets",
  "docs",
  "models",
  "oers",
  "scripts",
  "workflows",
]);

// Local fixture folders may be present during development but are not required.
const allowedTopLevelDirs = new Set([
  "fixtures",
]);

const expectedTopLevelHtml = new Set([
  "account.html",
  "application.html",
  "index.html",
  "benchmarks.html",
  "benchmark_explorer.html",
  "benchmark_results.html",
  "benchmark_task.html",
  "contribute.html",
  "contributors.html",
  "credential-request.html",
  "dataset.html",
  "deployments.html",
  "guides.html",
  "maintainer.html",
  "models.html",
  "monthly-highlights.html",
  "object_class.html",
  "oer.html",
  "ontology-governance.html",
  "ontology.html",
  "schema.html",
  "taxonomy.html",
  "task.html",
  "tutorials.html",
  "references.html",
  "verify.html",
]);

// Local-only pages: allowed to exist on disk but not required in the repo.
const ignoredTopLevelHtml = new Set([
  "mcp.html",
  "tools.html",
]);

const expectedNestedHtml = new Set([
  "auth/callback.html",
  "auth/sign-in.html",
  "datasets/detail.html",
  "models/details.html",
  "oers/details.html",
  "workflows/details.html",
]);

const expectedDataFiles = new Set([
  "benchmark-results.json",
  "contributors.json",
  "dataset.schema.json",
  "datasets.json",
  "generate-updates.js",
  "geo-locations.json",
  "guides.json",
  "institutions.json",
  "models.json",
  "news-events.json",
  "object-label-mappings.json",
  "object_taxonomy_config.json",
  "object_vocab.json",
  "oer.json",
  "task-definitions.json",
  "task-vocabulary.json",
  "tools.json",
  "use-cases.json",
]);

function fail(message) {
  console.error(`Structure check failed: ${message}`);
  process.exitCode = 1;
}

function listRelativeFiles(dir, ext) {
  const out = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (!ext || entry.name.endsWith(ext)) {
        out.push(path.relative(siteRoot, fullPath).split(path.sep).join("/"));
      }
    }
  }
  walk(dir);
  return out.sort();
}

function navLabels(html) {
  const nav = html.match(/<nav\b[^>]*\boc-nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0];
  if (!nav) return null;
  return [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean);
}

const topLevelEntries = fs.readdirSync(siteRoot, { withFileTypes: true });
const topLevelDirs = new Set(topLevelEntries.filter((e) => e.isDirectory()).map((e) => e.name));
const topLevelHtml = new Set(topLevelEntries.filter((e) => e.isFile() && e.name.endsWith(".html")).map((e) => e.name));
const nestedHtml = new Set(
  listRelativeFiles(siteRoot, ".html").filter((relPath) => relPath.includes("/"))
);
const dataFiles = new Set(
  fs.readdirSync(path.join(siteRoot, "data"), { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
);

for (const dir of expectedTopLevelDirs) {
  if (!topLevelDirs.has(dir)) fail(`missing required top-level directory: site/${dir}`);
}

for (const dir of topLevelDirs) {
  if (!expectedTopLevelDirs.has(dir) && !allowedTopLevelDirs.has(dir)) fail(`unexpected top-level directory: site/${dir}`);
}

for (const file of expectedTopLevelHtml) {
  if (!topLevelHtml.has(file)) fail(`missing required top-level page: site/${file}`);
}

for (const file of topLevelHtml) {
  if (!expectedTopLevelHtml.has(file) && !ignoredTopLevelHtml.has(file)) fail(`unexpected top-level page: site/${file}`);
}

for (const file of expectedNestedHtml) {
  if (!nestedHtml.has(file)) fail(`missing required nested page: site/${file}`);
}

for (const file of nestedHtml) {
  if (!expectedNestedHtml.has(file)) fail(`unexpected nested page: site/${file}`);
}

for (const file of expectedDataFiles) {
  if (!dataFiles.has(file)) fail(`missing required data file: site/data/${file}`);
}

for (const file of [...topLevelHtml, ...nestedHtml]) {
  if (ignoredTopLevelHtml.has(file)) continue;
  const html = fs.readFileSync(path.join(siteRoot, file), "utf8");
  const labels = navLabels(html);
  if (!labels) continue;
  if (!labels.includes("Catalog") && !labels.includes("Libraries")) {
    fail(`site/${file} nav missing Catalog`);
  }
  for (const label of ["Learn", "Contribute", "Community"]) {
    if (!labels.includes(label)) fail(`site/${file} nav missing ${label}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Site structure looks consistent.");
