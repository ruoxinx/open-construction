import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteRoot = path.resolve(__dirname, "..");
const outputPath = path.join(siteRoot, "sitemap.xml");
const baseUrl = "https://www.openconstruction.org";
const ignoredTopLevelDirs = new Set(["assets", "data", "scripts"]);
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

function isoDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function toUrlPath(fullPath) {
  const relative = path.relative(siteRoot, fullPath).split(path.sep).join("/");
  return relative === "index.html" ? "/" : `/${relative}`;
}

function walkHtmlFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === siteRoot && ignoredTopLevelDirs.has(entry.name)) continue;
      walkHtmlFiles(fullPath, acc);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function buildXml(urls) {
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ];

  for (const url of urls) {
    lines.push(`  <url>`);
    lines.push(`    <loc>${url.loc}</loc>`);
    lines.push(`    <lastmod>${url.lastmod}</lastmod>`);
    lines.push(`  </url>`);
  }

  lines.push(`</urlset>`);
  lines.push("");
  return lines.join("\n");
}

const urls = walkHtmlFiles(siteRoot)
  .map((fullPath) => {
    const stat = fs.statSync(fullPath);
    const urlPath = toUrlPath(fullPath);
    return {
      loc: new URL(urlPath, baseUrl).toString(),
      lastmod: isoDate(stat.mtimeMs),
    };
  })
  .sort((a, b) => a.loc.localeCompare(b.loc));

const xml = buildXml(urls);

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== xml) {
    console.error("sitemap.xml is out of date. Run: node site/scripts/generate-sitemap.mjs");
    process.exit(1);
  }
  console.log(`sitemap.xml is up to date (${urls.length} URLs).`);
} else {
  fs.writeFileSync(outputPath, xml, "utf8");
  console.log(`Wrote ${outputPath} with ${urls.length} URLs.`);
}
