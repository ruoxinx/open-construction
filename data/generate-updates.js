// data/generate-updates.js
// Robustly combine datasets + models into /updates.xml
// Supports arrays, container objects, keyed maps, or NDJSON lines.

const fs = require('fs');
const path = require('path');

const SITE = 'http://ruoxinx.github.io/open-construction-test'; // no trailing slash
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

/**
 * Coerce parsed JSON into an array of records.
 * Handles:
 *  - direct arrays
 *  - container objects: {datasets:[...]}, {models:[...]}, {items:[...]}, {data:[...]}, {records:[...]}, {results:[...]}, {list:[...]}
 *  - keyed maps: {"idA":{...}, "idB":{...}}
 *  - single object: {...}  (will return [object])
 */
function coerceToArray(x) {
  if (Array.isArray(x)) return x;

  if (x && typeof x === 'object') {
    // common container keys
    for (const k of ['datasets','models','items','data','records','results','list']) {
      if (Array.isArray(x[k])) return x[k];
    }

    // Heuristic: keyed map of records (values are objects with typical fields)
    const vals = Object.values(x);
    const looksLikeMap =
      vals.length > 1 &&
      vals.every(v => v && typeof v === 'object') &&
      vals.some(v => 'name' in v || 'title' in v || 'id' in v || 'slug' in v);

    if (looksLikeMap) return vals;

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

// Field helpers that tolerate multiple schemas
function getTitle(x) {
  return x.title || x.name || 'Untitled';
}
function getIdOrSlug(x, title) {
  return x.id || x.slug || toSlug(title);
}
function getAdded(x) {
  // prefer explicit added_date/date/created_at; fall back to year or now
  if (x.added_date || x.date || x.created_at) return x.added_date || x.date || x.created_at;
  if (x.year) return `${x.year}-01-01`;
  return new Date().toISOString();
}
function getAbstract(x, type) {
  return (
    x.abstract ||
    x.description ||
    x.summary ||
    (type === 'datasets'
      ? 'New dataset added to OpenConstruction.'
      : 'New model added to OpenConstruction.')
  );
}
function getLink(x, type, idOrSlug) {
  if (x.link) return x.link;
  const base = type === 'datasets' ? 'datasets' : 'models';
  return `${SITE}/${base}/detail.html?id=${encodeURIComponent(idOrSlug)}`;
}

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
    const title = getTitle(x);
    const slugOrId = getIdOrSlug(x, title);
    const added = getAdded(x);
    const abstract = getAbstract(x, type);
    const link = getLink(x, type, slugOrId);

    return {
      type,
      title,
      slug: slugOrId,
      link,
      pubDate: toUTC(added),
      guid: x.guid || `${type}:${slugOrId}:${added}`,  // unique & stable
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
