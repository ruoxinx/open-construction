// data/generate-updates.js
// Combine data/datasets.json + data/models.json into updates.xml at repo root.
// Run locally: node data/generate-updates.js

const fs = require('fs');
const path = require('path');

const SITE = 'https://ruoxinx.github.io/open-construction-test/';   // change if needed
const MAX_ITEMS = 10;                               // limit items in feed

// Helpers
const safeReadJSON = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    const here = path.resolve('.');
    throw new Error(
      `Cannot read ${p}. Current working dir: ${here}\n` +
      `Make sure the file exists and is committed to the repo.`
    );
  }
};
const toSlug = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item';

const toUTC = (d) => new Date(d || Date.now()).toUTCString();
const cdata = (s) => `<![CDATA[${String(s || '').trim()}]]>`;

// Resolve JSON paths RELATIVE TO THIS SCRIPT so Actions/local both work
const DS_JSON = path.join(__dirname, 'datasets.json');
const MD_JSON = path.join(__dirname, 'models.json');

const datasets = safeReadJSON(DS_JSON);
const models   = safeReadJSON(MD_JSON);

function normalize(items, type) {
  return (items || []).map((x) => {
    const title = x.title || `${type} item`;
    const slug  = x.slug || toSlug(title);
    // Prefer explicit added_date; fallback to year; else now
    const added = x.added_date || (x.year ? `${x.year}-01-01` : new Date().toISOString());
    const abstract = x.abstract || x.description || `New ${type.slice(0, -1)} added to OpenConstruction.`;

    const link = type === 'datasets'
      ? `${SITE}/datasets/detail.html?id=${slug}`
      : `${SITE}/models/detail.html?id=${slug}`;

    return {
      type,
      title,
      slug,
      link,
      pubDate: toUTC(added),
      guid: `${type}:${slug}:${added}`,     // unique & stable
      desc: abstract,
    };
  });
}

const items = [
  ...normalize(datasets, 'datasets'),
  ...normalize(models, 'models'),
]
  .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
  .slice(0, MAX_ITEMS);

const rssItems = items
  .map(
    (it) => `
  <item>
    <title>${cdata(`${it.type === 'datasets' ? 'Dataset' : 'Model'}: ${it.title}`)}</title>
    <link>${it.link}</link>
    <guid isPermaLink="false">${it.guid}</guid>
    <pubDate>${it.pubDate}</pubDate>
    <description>${cdata(it.desc)}</description>
  </item>`
  )
  .join('\n');

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

// Write to repo root so it's published by GitHub Pages
const OUT_PATH = path.resolve(__dirname, '..', 'updates.xml');
fs.writeFileSync(OUT_PATH, rss);
console.log(`✅ Wrote ${OUT_PATH} with ${items.length} item(s).`);
