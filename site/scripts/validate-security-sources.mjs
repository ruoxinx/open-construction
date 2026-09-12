import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(siteRoot, "..");

function walk(dir, predicate) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath, predicate));
    else if (predicate(entry.name)) files.push(fullPath);
  }
  return files;
}

function fail(message) {
  console.error(`Security source check failed: ${message}`);
  process.exitCode = 1;
}

const htmlFiles = walk(siteRoot, (name) => name.endsWith(".html"));
const requiredMeta = [
  /<meta\b[^>]*http-equiv=["']Content-Security-Policy["']/i,
  /<meta\b[^>]*http-equiv=["']Permissions-Policy["']/i,
];
const pinnedIntegrity = new Map([
  ["https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css", "sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"],
  ["https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js", "sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"],
  ["https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js", "sha512-vc58qvvBdrDR4etbxMdlTt4GBQk1qjvyORR2nrsPsFPyrs+/u5c3+1Ct6upOgdZoIl7eq6k3a1UPDSNAQi/32A=="],
  ["https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.min.js", "sha512-KhIBJeCI4oTEeqOmRi2gDJ7m+JARImhUYgXWiOTIp9qqySpFUAJs09erGKem4E5IPuxxSTjavuurvBitBmwE0w=="],
  ["https://unpkg.com/@supabase/supabase-js@2.112.1/dist/umd/supabase.js", "sha384-0x8XPoHt08aHZj+RHs8ojmhZ5IDsTLjPgblgWdriayWriqv9dic3Vkv1K2+UqgZV"],
  ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="],
  ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="],
]);

for (const file of htmlFiles) {
  const relative = path.relative(repoRoot, file).split(path.sep).join("/");
  const html = fs.readFileSync(file, "utf8");
  for (const pattern of requiredMeta) {
    if (!pattern.test(html)) fail(`${relative} is missing ${pattern.source}`);
  }

  const externalTags = html.match(/<(?:script\b[^>]*\bsrc|link\b[^>]*\bhref)=["']https:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com)[^"']+["'][^>]*>/gi) ?? [];
  for (const tag of externalTags) {
    if (!/\bintegrity=["'][^"']+["']/i.test(tag)) {
      fail(`${relative} has a CDN asset without SRI: ${tag}`);
    }
    const url = tag.match(/(?:src|href)=["']([^"']+)["']/i)?.[1];
    if (url && !/(?:@|\/)\d+\.\d+\.\d+(?:[-+][^/]+)?\//.test(url)) {
      fail(`${relative} has a CDN asset without an exact semantic version: ${url}`);
    }
    const expectedHash = url ? pinnedIntegrity.get(url) : null;
    if (expectedHash && !tag.includes(expectedHash)) {
      fail(`${relative} has an unexpected SRI hash for ${url}`);
    }
  }
}

const workflowFiles = walk(path.join(repoRoot, ".github", "workflows"), (name) =>
  name.endsWith(".yml") || name.endsWith(".yaml")
);
for (const file of workflowFiles) {
  const relative = path.relative(repoRoot, file).split(path.sep).join("/");
  const workflow = fs.readFileSync(file, "utf8");
  for (const match of workflow.matchAll(/\buses:\s*([^\s#]+)/g)) {
    const reference = match[1];
    if (/^actions\//i.test(reference) && !/@[0-9a-f]{40}$/i.test(reference)) {
      fail(`${relative} uses a mutable GitHub Action reference: ${reference}`);
    }
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Security source checks passed for ${htmlFiles.length} HTML pages and ${workflowFiles.length} workflows.`);
