// data/generate-updates.js
// Robustly combine datasets + models into /updates.xml
// Supports arrays, {datasets:[...]}, {models:[...]}, {items:[...]}, {data:[...]}, or NDJSON lines.

const fs = require('fs');
const path = require('path');

const SITE = 'http://ruoxinx.github.io/open-construction-test/'; // change to your domain
const MAX_ITEMS = 10;

// ---------- helpers ----------
const readText = p => fs.readFileSync(p, 'utf8');

function parsePossiblyNDJSON(text) {
  // Try JSON parse first
  try { return JSON.parse(text); } catch {}
  // Try NDJSON: one JSON per line
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  try {
    const arr = lines.map(l => JSON.parse(l));
    if (arr.length) return arr;
  } catch {}
  throw new Error('Unsupported JSON format (not JSON or NDJSON).');
}

function coerceToArray(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === 'object') {
    // common container keys
    for (const k of ['datasets','models','items','data','records','results','list']) {
      if (Array.isArray(x[k])) return x[k];
    }
    // single object -> wrap
    return [x];
  }
  // fallback
  return [];
}

function loadJSONArray(absPath) {
  const raw = readText(absPath);
  const parsed = parsePossiblyNDJSON(raw);
  const arr = coerceToArray(parsed);
  if (!Array.isArray(arr)) {
    throw new Error(`Parsed data at ${absPath} is not an array-like structure.`);
  }
  return arr;
}

const toSlug = s =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item';

const toUTC = d => new Date(d || Date.now()).toUTCString();
const cdata = s => `<![CDATA[${String(s || '').trim()}]]>`;

// ---------- load inputs ----------
const DS_JSON = path.join(__dirname, 'datasets.json');
const MD_JSON = path.join(__dirname, 'models.json');

if (!fs.existsSync(DS_JSON)) throw new Error(`Missing file: ${DS_JSON}`);
if (!fs.existsSync(MD_JSON)) throw new Error(`Missing file: ${MD_JSON}`);

const datasetsRaw = loadJSONArray(DS_JSON);
const modelsRaw   = loadJSONArray(MD_JSON);

// ---------- normalize ----------
function normalize(items, type) {
  return items.map(x => {
    const title = x.title || `${type} item`;
    const slug  = x.slug || toSlug(title);
    const added = x.added_date || x.date || x.created_at || (x.year ? `${x.year}-01-01` : new Date().toISOString());
    const abstract = x.abstract || x.description || x.summary || `New ${type.slice(0, -1)} added to OpenConstruction.`;
    const link = x.link || (
      type === 'datasets'
        ? `${SITE}/datasets/detail.html?id=${slug}`
        : `${SITE}/models/detail.html?id=${slug}`
    );

    return {
      type,
      title,
      slug,
      link,
      pubDate: toUTC(added),
      guid: x.guid || `${type}:${slug}:${added}`,  // unique & stable
      desc: abstract
    };
  });
}

const items = [
  ...normalize(datasetsRaw, 'datasets'),
  ...normalize(modelsRaw,   'models'),
]
  .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
  .slice(0, MAX_ITEMS);

// ---------- build RSS ----------
const rssItems = items.map(it => `
  <item>
    <title>${cdata(`${it.type === 'datasets' ? 'Dataset' : 'Model'}: ${it.title}`)}</title>
    <link>${it.link}</link>
    <guid isPermaLink="false">${it.guid}</guid>
    <pubDate>${it.pubDate}</pubDate>
    <description>${cdata(it.desc)}</description>
  </item>`).join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenConstruction — Updates</title>
    <link>${SITE}/</link>
    <description>Newest datasets and models from OpenConstruction</description>
    <language>en-US</language>
${rssItems}
  </channel>
</rss>
`;

const OUT_PATH = path.resolve(__dirname, '..', 'updates.xml');
fs.writeFileSync(OUT_PATH, rss);
console.log(`✅ Wrote ${OUT_PATH} with ${items.length} item(s).`);
