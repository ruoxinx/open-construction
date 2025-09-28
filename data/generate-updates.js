// Combine datasets.json + models.json into updates.xml (latest 10)
// Run: node scripts/generate-updates.js
const fs = require('fs');

const SITE = 'https://ruoxinx.github.io/open-construction-test/'; // ← change if needed
const MAX_ITEMS = 10;

// Safe helpers
const toSlug = s => String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'item';
const toUTC = d => new Date(d || Date.now()).toUTCString();
const cdata = s => `<![CDATA[${String(s||'').trim()}]]>`;

// Load JSON (adjust paths if needed)
const datasets = JSON.parse(fs.readFileSync('datasets.json','utf8'));
const models   = JSON.parse(fs.readFileSync('models.json','utf8'));

// Map to a unified schema
function normalize(items, type){
  return (items||[]).map(x=>{
    const title = x.title || `${type} item`;
    const slug  = x.slug || toSlug(title);
    // Prefer explicit added_date, else try year, else now
    const added = x.added_date || (x.year ? `${x.year}-01-01` : new Date().toISOString());
    const abstract = x.abstract || x.description || `New ${type.slice(0,-1)} added to OpenConstruction.`;
    const link = type==='datasets'
      ? `${SITE}/datasets/detail.html?id=${slug}`
      : `${SITE}/models/detail.html?id=${slug}`;
    return {
      type,
      slug,
      title,
      link,
      pubDate: toUTC(added),
      guid: `${type}:${slug}:${added}`,
      desc: abstract
    };
  });
}

const items = [
  ...normalize(datasets,'datasets'),
  ...normalize(models,'models')
]
  // newest first by pubDate
  .sort((a,b)=> new Date(b.pubDate) - new Date(a.pubDate))
  .slice(0, MAX_ITEMS);

// Build RSS
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

fs.writeFileSync('updates.xml', rss);
console.log('✅ Wrote updates.xml with', items.length, 'items');
