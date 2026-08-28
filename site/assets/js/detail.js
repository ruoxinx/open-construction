// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

/* ==============================
   Dataset Detail Page Script
   ============================== */

/* ========== helpers ========== */
function doiHref(doiVal){
  if (!doiVal) return null;
  const raw = String(doiVal).trim();
  try { return new URL(raw).href; } catch { return `https://doi.org/${raw}`; }
}

function formatDoi(doiVal){
  const href = doiHref(doiVal);
  if (!href) return '—';
  try {
    const u = new URL(href);
    if (/doi\.org$/i.test(u.hostname) || /dx\.doi\.org$/i.test(u.hostname)) {
      return `<a href="${href}" target="_blank" rel="noopener">${u.pathname.replace(/^\/+/, '')}</a>`;
    }
  } catch {}
  return `<a href="${href}" target="_blank" rel="noopener">${href}</a>`;
}

function safeFormatInt(v){
  if (typeof formatInt === 'function') return formatInt(v);
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toLocaleString();
}

/** Normalizes text fields: null/empty/'Not Specified' -> '—' */
function safeText(val){
  if (!val && val !== 0) return '—';
  const txt = String(val).trim();
  if (!txt || /^not\s*specified$/i.test(txt)) return '—';
  return txt;
}

function formatSourceStatus(val){
  const txt = safeText(val);
  if (txt === '—') return '';
  const labels = {
    'peer-reviewed': 'Peer-reviewed',
    'preprint': 'Preprint',
    'community-contributed': 'Community-contributed',
    'unknown': 'Unknown'
  };
  const key = String(txt).trim().toLowerCase();
  return labels[key] || txt;
}

// Authors can be provided as:
// 1) string: "A, B, C"
// 2) array of strings: ["A", "B"]
// 3) array of objects: [{ name:"A", url:"https://..." }, ...]
// 4) string/array + ds.author_urls as a map: {"A":"https://..."}
// 5) string/array + ds.author_urls as an aligned array: ["https://...", "", ...]
function authorListHtml(authorsVal, authorUrls){
  const txt = safeText(authorsVal);
  if (txt === '—') return '';

  // Case (3): array of objects
  if (Array.isArray(authorsVal) && authorsVal.length && typeof authorsVal[0] === 'object' && authorsVal[0] !== null) {
    const items = authorsVal
      .map(a => ({ name: safeText(a?.name), url: a?.url ? String(a.url).trim() : '' }))
      .filter(a => a.name && a.name !== '—');
    if (!items.length) return '';
    return items.map(({name, url}) => {
      const safeName = escapeHtml(name);
      const safeUrl = safeHref(url);
      return `<div class="mb-1">${safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener">${safeName}</a>` : safeName}</div>`;
    }).join('');
  }

  const names = Array.isArray(authorsVal) ? authorsVal : String(authorsVal).split(',');
  const clean = names.map(n => String(n).trim()).filter(Boolean);
  if (!clean.length) return '';

  // Build name -> url resolver from authorUrls
  const urlByName = new Map();
  if (authorUrls && typeof authorUrls === 'object') {
    if (Array.isArray(authorUrls)) {
      // aligned list
      clean.forEach((name, i) => {
        const u = authorUrls[i];
        if (u) urlByName.set(name, String(u).trim());
      });
    } else {
      // map
      Object.entries(authorUrls).forEach(([k, v]) => {
        if (!k) return;
        if (!v) return;
        urlByName.set(String(k).trim(), String(v).trim());
      });
    }
  }

  return clean.map((name) => {
    const safeName = escapeHtml(name);
    const safeUrl = safeHref(urlByName.get(name) || '');
    return `<div class="mb-1">${safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener">${safeName}</a>` : safeName}</div>`;
  }).join('');
}

// ---------- tiny sanitizers ----------
function escapeHtml(s){
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function safeHref(href){
  if (!href) return '';
  const raw = String(href).trim();
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {}
  return '';
}

function publicationDoiHref(doi){
  if (!doi) return '';
  const raw = String(doi).trim();
  return safeHref(raw.startsWith('http') ? raw : `https://doi.org/${raw}`);
}

function normalizePublicationEntry(pub){
  if (!pub) return null;
  if (typeof pub === 'string') {
    const title = pub.trim();
    return title ? { title } : null;
  }
  if (typeof pub !== 'object') return null;
  const title = String(pub.title || pub.paper || pub.name || pub.publication || '').trim();
  const doi = String(pub.doi || '').trim();
  const url = safeHref(pub.url || pub.paper_url || pub.link || pub.href || '') || publicationDoiHref(doi);
  if (!title && !url) return null;
  return {
    title: title || url,
    authors: pub.authors || pub.author || [],
    year: pub.year || pub.publication_year || '',
    venue: pub.venue || pub.journal || pub.conference || '',
    volume: pub.volume || '',
    issue: pub.issue || '',
    pages: pub.pages || '',
    doi,
    url,
    location: pub.location || ''
  };
}

function recordPublications(record){
  const pubs = Array.isArray(record?.publications)
    ? record.publications.map(normalizePublicationEntry).filter(Boolean)
    : [];
  const legacyTitle = String(record?.paper || record?.Paper || record?.paper_title || record?.paper_name || record?.publication || '').trim();
  const legacyUrl = safeHref(record?.paper_url || record?.paper_link || '') || (safeHref(legacyTitle) ? safeHref(legacyTitle) : '');
  if (legacyTitle || legacyUrl) {
    const legacyPub = normalizePublicationEntry({ title: safeHref(legacyTitle) ? legacyUrl : legacyTitle, url: legacyUrl, doi: record?.doi || '' });
    const duplicate = legacyPub && pubs.some(pub =>
      (legacyPub.url && pub.url === legacyPub.url) ||
      (legacyPub.title && pub.title && legacyPub.title.toLowerCase() === pub.title.toLowerCase())
    );
    if (legacyPub && !duplicate) pubs.unshift(legacyPub);
  }
  return pubs;
}

function publicationsListHtml(publications){
  if (!Array.isArray(publications) || !publications.length) return '';
  return `
    <ol class="publication-list mb-0">
      ${publications.map(pub => {
        const title = pub.url
          ? `<a href="${pub.url}" target="_blank" rel="noopener">${escapeHtml(pub.title)}</a>`
          : escapeHtml(pub.title);
        return `
          <li class="publication-item">
            <div class="publication-title">${title}</div>
          </li>
        `;
      }).join('')}
    </ol>
  `;
}

function detailPageUrl(){
  try {
    return window.location.href;
  } catch {
    return '';
  }
}

async function copyTextValue(text){
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    window.prompt('Copy link: Ctrl/Cmd+C, Enter', text);
    return true;
  } catch {}
  return false;
}

async function shareResourceLink({ title, text, url }){
  const shareUrl = url || detailPageUrl();
  try {
    if (navigator.share) {
      await navigator.share({
        title: title || document.title,
        text: text || '',
        url: shareUrl
      });
      return 'shared';
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
  }
  return (await copyTextValue(shareUrl)) ? 'copied' : 'failed';
}

function shareCardHtml(label){
  return `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body">
        <h2 class="h6 text-uppercase text-muted mb-3">Share</h2>
        <div class="d-grid gap-2">
          <button type="button" class="btn btn-outline-secondary btn-sm btn-with-icon" data-oc-share data-share-label="${escapeHtml(label)}">${actionButtonContent('share', 'Share or Copy Link')}</button>
        </div>
      </div>
    </div>
  `;
}

function actionButtonIcon(icon){
  const icons = {
    access: '<path d="M7 7h10v10"></path><path d="M7 17 17 7"></path><path d="M5 21h14a2 2 0 0 0 2-2V5"></path>',
    paper: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path><path d="M8 13h8"></path><path d="M8 17h6"></path>',
    code: '<path d="m9 18-6-6 6-6"></path><path d="m15 6 6 6-6 6"></path>',
    share: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 10.5 6.8-4"></path><path d="m8.6 13.5 6.8 4"></path>'
  };
  const paths = icons[icon] || icons.paper;
  return `<svg class="btn-action-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function actionButtonContent(icon, label){
  return `${actionButtonIcon(icon)}<span class="btn-label">${escapeHtml(label)}</span>`;
}

function setActionButtonLabel(button, label){
  const labelEl = button?.querySelector?.('.btn-label');
  if (labelEl) labelEl.textContent = label;
  else if (button) button.textContent = label;
}

function bookmarkInlineHtml(type, id, label){
  if (!window.OCBookmark || !id) return '';
  return window.OCBookmark.buttonHtml({
    type,
    id,
    title: label,
    url: detailPageUrl()
  });
}

function normalizeList(val){
  if (!val && val !== 0) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  return String(val).split(',').map(v => v.trim()).filter(Boolean);
}

function modalityFamilies(val){
  const raw = normalizeList(val).join(' ').toLowerCase();
  if (!raw) return [];

  const families = new Set();
  const add = (label, pattern) => { if (pattern.test(raw)) families.add(label); };

  add('point-cloud', /point\s*cloud|lidar|laser\s*scan|3d\s*scan/);
  add('bim-model', /\bbim\b|\bifc\b|revit|lod\d|building model|building models/);
  add('mesh-model', /\bmesh\b|geometry model|surface model/);
  add('ground-rgb', /ground\s*rgb|street\s*view|smartphone|camera|photo|image/);
  add('aerial-rgb', /aerial\s*rgb|drone|uav|satellite|orthophoto/);
  add('rgbd-depth', /rgb-?d|depth|stereo/);
  add('thermal', /thermal|infrared|\bir\b/);
  add('document-text', /document|text|pdf|report|specification|contract/);
  add('tabular-timeseries', /timeseries|time\s*series|sensor|tabular|table|csv|database|sql|imu|inertial\s*measurement/);
  add('geospatial', /geospatial|gis|geojson|shapefile|dem|dsm|dtm/);

  return Array.from(families);
}

function prettyTermLabel(raw){
  if (window.OCTerms?.prettyTermLabel) return window.OCTerms.prettyTermLabel(raw);
  const vocabLabel = window.ocPreferredTaskLabel ? window.ocPreferredTaskLabel(raw) : '';
  if (vocabLabel) return vocabLabel;
  const key = normKey(raw).replace(/[_-]+/g, ' ');
  if (!key) return '';
  const preferred = {
    'object detection': 'Object Detection',
    'semantic segmentation': 'Semantic Segmentation',
    'object segmentation': 'Object Segmentation',
    'image captioning': 'Image Captioning',
    'action recognition': 'Action Recognition',
    'crew activity recognition': 'Crew Activity Recognition',
    'simultaneous localization and mapping': 'Simultaneous Localization and Mapping',
    'pose estimation': 'Pose Estimation',
    'object tracking': 'Object Tracking',
    'point cloud segmentation': 'Point Cloud Segmentation',
    'point cloud generation': 'Point Cloud Generation',
    'point cloud visualization': 'Point Cloud Visualization',
    '3d reconstruction': '3D Reconstruction',
    '3d registration': '3D Registration',
    '3d rendering': '3D Rendering',
    'image to image translation': 'Image-to-Image Translation',
    'image synthesis': 'Image Synthesis',
    'knowledge reasoning': 'Knowledge Reasoning',
    'knowledge graph construction': 'Knowledge Graph Construction',
    'information retrieval': 'Information Retrieval',
    'question answering': 'Question Answering',
    'visual question answering': 'Visual Question Answering',
    'video qa': 'Video QA',
    'vision language reasoning': 'Vision-Language Reasoning',
    'scan to bim': 'Scan-to-BIM',
    'text to bim': 'Text-to-BIM',
    'floorplan to bim': 'Floorplan-to-BIM',
    '2d to bim reconstruction': '2D-to-BIM Reconstruction',
    'bim object classification': 'BIM Object Classification',
    'bim alignment': 'BIM Alignment',
    'semantic bim change detection': 'Semantic BIM Change Detection',
    'cad generation': 'CAD Generation',
    'model context protocol': 'Model Context Protocol',
    'building localization': 'Building Localization',
    'damage classification': 'Damage Classification',
    'sewer defect classification': 'Sewer Defect Classification',
    'safety monitoring': 'Safety Monitoring',
    'site understanding': 'Site Understanding',
    'structural condition monitoring': 'Structural Condition Monitoring',
    'site mapping and navigation': 'Site Mapping and Navigation',
    'automated structural design': 'Automated Structural Design',
    'conceptual design': 'Conceptual Design',
    'compliance checking': 'Compliance Checking',
    'quality control': 'Quality Control',
    'shear wall layout generation': 'Shear Wall Layout Generation',
    'plan recognition': 'Plan Recognition',
    'as built bim generation': 'As-Built BIM Generation',
    'ergonomic assessment': 'Ergonomic Assessment',
    'productivity monitoring': 'Productivity Monitoring',
    'floorplan generation': 'Floorplan Generation',
    'building energy analysis': 'Building Energy Analysis',
    '3d building mesh generation': '3D Building Mesh Generation',
    'design brief automation': 'Design Brief Automation',
    'historic digital survey': 'Historic Digital Survey',
    'progress monitoring': 'Progress Monitoring',
    'knowledge management': 'Knowledge Management',
    'change detection': 'Change Detection',
    'lod3 building model generation': 'LOD3 Building Model Generation',
    'digital twin enrichment': 'Digital Twin Enrichment',
    'digital twin generation': 'Digital Twin Generation',
    'computer aided design': 'Computer-Aided Design',
    'video based ui understanding': 'Video-Based UI Understanding',
    'work package generation': 'Work Package Generation',
    'bim authoring assistance': 'BIM Authoring Assistance',
    'blockchain enabled bim management': 'Blockchain-Enabled BIM Management',
    'design change auditing': 'Design Change Auditing',
    'cross platform bim data exchange': 'Cross-Platform BIM Data Exchange',
    'asset management': 'Asset Management',
    'post disaster damage assessment': 'Post-Disaster Damage Assessment',
    'post disaster assessment': 'Post-Disaster Assessment',
    'building performance simulation': 'Building Performance Simulation',
    'energy modelling': 'Energy Modelling',
    'hvac model generation': 'HVAC Model Generation',
    'life cycle assessment': 'Life Cycle Assessment',
    'structural defect detection': 'Structural Defect Detection',
    'pipeline leakage detection': 'Pipeline Leakage Detection',
    'subsurface infrastructure monitoring': 'Subsurface Infrastructure Monitoring'
  };
  if (preferred[key]) return preferred[key];
  const minorWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'vs', 'with']);
  const acronymPattern = /^(2d|3d|4d|rgb|rgbd|rgb-d|slam|lidar|cnn|rnn|gan|svm|ml|ai|nlp|uav|imu|sar|bim|ifc|gpr|mep|teaser|vlm|llm|qa|hvac|lod3|ui|pcd|fob|cif|dap)$/i;
  const tokens = key.split(/\s+/).filter(Boolean);
  return tokens.map((token, index) => {
    const parts = token.match(/^([^a-z0-9]*)([a-z0-9-]+)([^a-z0-9]*)$/i);
    if (!parts) return token;
    const [, prefix, core, suffix] = parts;
    if (acronymPattern.test(core)) return `${prefix}${core.toUpperCase()}${suffix}`;
    if (index > 0 && minorWords.has(core)) return `${prefix}${core}${suffix}`;
    const titleCore = core
      .split('-')
      .map(part => acronymPattern.test(part) ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join('-');
    return `${prefix}${titleCore}${suffix}`;
  }).join(' ');
}

function uniquePrettyTerms(val){
  if (window.OCTerms?.uniquePrettyTerms) return window.OCTerms.uniquePrettyTerms(val);
  const seen = new Set();
  const output = [];
  normalizeList(val).forEach(item => {
    const pretty = prettyTermLabel(item) || String(item || '').trim();
    const key = normKey(pretty);
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(pretty);
  });
  return output;
}

function taskFamilies(val){
  const rawTerms = normalizeList(val);
  const families = new Set();

  rawTerms.forEach(term => {
    const raw = normKey(term);
    if (!raw) return;
    if (/segment/.test(raw)) families.add('segmentation');
    if (/reconstruction|structure from motion|scan to bim|2d to bim|bim reconstruction|model generation/.test(raw)) families.add('reconstruction');
    if (/detect/.test(raw)) families.add('detection');
    if (/classif/.test(raw)) families.add('classification');
    if (/caption|retrieval/.test(raw)) families.add('vision-language');
    if (/slam|localization|mapping/.test(raw)) families.add('spatial-mapping');
    if (/change detection|change segmentation/.test(raw)) families.add('change-analysis');
    if (/pose/.test(raw)) families.add('pose');
    if (/question answering|qa|querying/.test(raw)) families.add('qa');
  });

  return Array.from(families);
}

function applicationFamilies(val){
  const rawTerms = normalizeList(val);
  const families = new Set();

  rawTerms.forEach(term => {
    const raw = normKey(term);
    if (!raw) return;
    if (/building model|mesh generation|digital twin generation|bim authoring|bim reconstruction|scan to bim|text to bim|floorplan to bim|design brief automation|lod3|lod4/.test(raw)) families.add('building-generation');
    if (/structural condition monitoring|damage|defect|inspection|assessment|bridge inspection/.test(raw)) families.add('inspection-monitoring');
    if (/safety/.test(raw)) families.add('safety');
    if (/site understanding|progress monitoring|productivity monitoring|knowledge management/.test(raw)) families.add('site-operations');
    if (/mapping|navigation|localization/.test(raw)) families.add('mapping-navigation');
    if (/energy|hvac|building performance simulation|energy modelling/.test(raw)) families.add('energy-performance');
    if (/design|cad|conceptual design|automated structural design|layout generation|plan recognition/.test(raw)) families.add('design-automation');
    if (/compliance/.test(raw)) families.add('compliance');
    if (/asset management/.test(raw)) families.add('asset-management');
    if (/post-disaster/.test(raw)) families.add('disaster-response');
  });

  return Array.from(families);
}

function domainFamilies(val){
  const raw = Array.isArray(val)
    ? normKey(val.map(item => String(item || '')).join(' '))
    : normKey(val);
  if (!raw.trim()) return [];

  const families = new Set();
  const add = (label, pattern) => { if (pattern.test(raw)) families.add(label); };

  add('building', /\bbuilding(s)?\b|facade|roof(s)?|storey|indoor|outdoor built environment/);
  add('bridge', /\bbridge(s)?\b/);
  add('dam', /\bdam(s)?\b/);
  add('road', /\broad(s)?\b|highway|pavement|asphalt|street/);
  add('pipe-mep', /\bpiping\b|\bpipe(s)?\b|\bmep\b|\bhvac\b|\bduct(s)?\b/);
  add('construction-site', /\bconstruction site\b|\bsite\b|\bjobsite\b/);
  add('damage-defect', /\bdamage\b|\bdefect\b|\bcrack\b|\bspalling\b|\brust\b|\binspection\b|\bmaintenance\b/);
  add('digital-twin-bim', /\bdigital twin\b|\bbim\b|\bifc\b|\bas-built\b/);

  return Array.from(families);
}

function datasetCountLabel(modalityVal){
  const modalities = normalizeList(modalityVal).map(v => v.toLowerCase());
  if (!modalities.length) return 'Samples';

  const has = (pattern) => modalities.some(v => pattern.test(v));

  if (has(/point\s*cloud|lidar|laser\s*scan|3d\s*scan/)) return 'Point Clouds';
  if (has(/video|clip/)) return 'Videos';
  if (has(/document|text|pdf|report|specification|contract/)) return 'Documents';
  if (has(/audio|speech|sound/)) return 'Audio Files';
  if (has(/bim|ifc|cad|mesh|graph/)) return 'Models';
  if (has(/timeseries|time\s*series|sensor|tabular|table|csv/)) return 'Records';
  if (has(/image|rgb|thermal|satellite|aerial|depth/)) return 'Images';

  return 'Samples';
}

function datasetCountSummary(ds){
  const count = ds?.num_images;
  const classes = ds?.num_classes;
  if (!(count || classes)) return '';

  const countLabel = datasetCountLabel(ds?.data_modality).toLowerCase();
  const parts = [];
  if (count) parts.push(`${safeFormatInt(count)} ${countLabel}`);
  if (classes) parts.push(`${safeFormatInt(classes)} classes`);
  return parts.join(' · ');
}

function normKey(val){
  if (window.OCTerms?.key) return window.OCTerms.key(val);
  return String(val || '').trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

function truncateText(val, max = 180){
  const text = String(val || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;
}


/* ---------- abstract show more/less (model detail) ---------- */
function abstractToggleHtml(text, opts = {}){
  let t = (text == null) ? '' : String(text).trim();
  if (!t) return '';

  // remove leading indentation on each line (common in scraped abstracts)
  t = t.replace(/^\s+/gm, '');

  const collapsedLines = Number.isFinite(opts.collapsedLines) ? opts.collapsedLines : 6;
  const minCharsForToggle = Number.isFinite(opts.minCharsForToggle) ? opts.minCharsForToggle : 320;

  // Short abstracts: render as-is (no toggle)
  if (t.length < minCharsForToggle){
    return `<div class="abs small">${escapeHtml(t)}</div>`;
  }

  return `
    <div class="oc-abs-wrap" data-oc-abs>
      <div class="oc-abs-text abs small is-collapsed" style="--oc-abs-lines:${collapsedLines}">
        ${escapeHtml(t)}
      </div>
      <button type="button" class="btn btn-link btn-sm p-0 oc-abs-toggle" data-oc-abs-toggle aria-expanded="false">
        Show more
      </button>
    </div>
  `;
}

function isCustomLicense(licVal){
  const key = String(licVal || '').trim().toUpperCase();
  if (!key) return false;
  return (
    /\bCUSTOM\b/.test(key) ||
    /\bMIXED LICENSE\b/.test(key) ||
    /\bCOMMONS CLAUSE\b/.test(key) ||
    /\bACADEMIC USE ONLY\b/.test(key) ||
    /\bRESEARCH AND EDUCATIONAL? PURPOSES? ONLY\b/.test(key) ||
    /\bPROPRIETARY\b/.test(key) ||
    /^FI-NCA?L$/.test(key) ||
    /^MODIFIED BSD$/.test(key) ||
    /^BSD-3-CLAUSE-STYLE LICENSE\b/.test(key)
  );
}

function licenseDisplayLabel(licVal){
  const norm = safeText(licVal);
  if (norm === '—') return '';
  if (isCustomLicense(licVal)) return 'Custom License';
  const key = String(licVal).trim().toUpperCase();
  const labels = {
    'CC0': 'Creative Commons CC0 Public Domain Dedication',
    'CC BY 4.0': 'Creative Commons Attribution 4.0 International',
    'CC-BY 4.0': 'Creative Commons Attribution 4.0 International',
    'CC BY-NC 3.0': 'Creative Commons Attribution-NonCommercial 3.0',
    'CC-BY-NC 3.0': 'Creative Commons Attribution-NonCommercial 3.0',
    'CC BY NC 3.0': 'Creative Commons Attribution-NonCommercial 3.0',
    'CC BY-NC 4.0': 'Creative Commons Attribution-NonCommercial 4.0 International',
    'CC-BY-NC': 'Creative Commons Attribution-NonCommercial 4.0 International',
    'CC BY-SA 4.0': 'Creative Commons Attribution-ShareAlike 4.0 International',
    'CC BY-NC-ND 3.0': 'Creative Commons Attribution-NonCommercial-NoDerivatives 3.0',
    'CC BY-NC-ND 4.0': 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International',
    'CC BY-NC-SA 4.0': 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International'
  };
  return labels[key] || norm;
}


function recordLicenseHref(record){
  if (!record) return '';
  const fields = [
    record.license_url,
    record.licence_url,
    record.license_link,
    record.licence_link,
    record.terms_url,
    record.access_terms_url,
    record.usage_terms_url
  ];
  for (const value of fields) {
    const href = safeHref(value);
    if (href) return href;
  }
  return '';
}

function recordSourceHref(record){
  if (!record) return '';
  const fields = [
    record.source_url,
    record.source,
    record.code_url,
    record.code,
    record.data_url,
    record.access,
    record.url,
    record.link,
    record.paper_url,
    record.paper
  ];
  for (const value of fields) {
    const href = safeHref(value);
    if (href) return href;
  }
  return '';
}

function formatLicense(licVal, record){
  const norm = safeText(licVal);
  if (norm === '—') return '';

  const displayLabel = licenseDisplayLabel(licVal);
  const key = String(licVal).trim().toUpperCase();
  const licenseMap = {
    'APACHE-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'APACHE 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'CC0': 'https://creativecommons.org/public-domain/cc0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-NC 3.0': 'https://creativecommons.org/licenses/by-nc/3.0/',
    'CC-BY-NC 3.0': 'https://creativecommons.org/licenses/by-nc/3.0/',
    'CC BY NC 3.0': 'https://creativecommons.org/licenses/by-nc/3.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC-BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'MIT': 'https://opensource.org/licenses/MIT',
    'ODC-BY': 'https://opendatacommons.org/licenses/by/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC-ND 3.0': 'https://creativecommons.org/licenses/by-nc-nd/3.0/',
    'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'AGPL 3.0': 'https://spdx.org/licenses/AGPL-3.0-or-later.html',
    'MIT LICENSE WITH COMMONS CLAUSE RESTRICTION': 'https://github.com/zhu-xlab/GlobalBuildingAtlas/blob/main/LICENSE',
    'LGPL-3.0': 'https://www.gnu.org/licenses/lgpl-3.0.html',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en',
    'GNU 3.0': 'https://www.gnu.org/licenses/gpl-3.0.en.html',
    'BSD 3-CLAUSE': 'https://opensource.org/license/bsd-3-clause',
    'GNU 2.1': 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html',
    'MODIFIED BSD': 'https://github.com/LBNL-ETA/EnergyPlus-MCP/blob/main/License.txt',
    'BSD-3-CLAUSE-STYLE LICENSE (COPYRIGHT 2019 CARNEGIE MELLON UNIVERSITY)': 'https://github.com/DIUx-xView/xView2_baseline/blob/master/LICENSE.md',
    'ACADEMIC USE ONLY (UNIVERSITY OF CAMBRIDGE)': 'https://github.com/mac137/ConSLAM/blob/main/LICENCE.txt',
    'FI-NCAL': 'https://github.com/fraunhofer-italia/AID-AI-Infraction-Detection/blob/main/LICENSE.md',
    'CUSTOM MIT LICENSE (UNIVERSITY OF STUTTGART)': 'https://darus.uni-stuttgart.de/api/datasets/:persistentId/versions/1.0/customlicense?persistentId=doi:10.18419/DARUS-5676',
    'MIXED LICENSE, SEE HTTPS://XVIEW2.ORG/TERMS': 'https://xview2.org/terms'
  };

  const licenseUrl = licenseMap[key] || licenseHrefFor(licVal, record);
  if (licenseUrl) {
    return `<span class="license-inline">${licenseIconStripHtml(licVal)}<span class="license-title-line"><a href="${licenseUrl}" target="_blank" rel="noopener">${escapeHtml(displayLabel)}</a></span></span>`;
  }
  return `<span class="license-inline"><span class="license-title-line">${escapeHtml(displayLabel)}</span></span>`;
}

function licenseHrefFor(licVal, record){
  const norm = safeText(licVal);
  if (norm === '—') return '';
  const key = String(licVal).trim().toUpperCase();
  const recordUrl = recordLicenseHref(record);
  if (recordUrl) return recordUrl;
  const licenseMap = {
    'APACHE-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'APACHE 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'CC0': 'https://creativecommons.org/public-domain/cc0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-NC 3.0': 'https://creativecommons.org/licenses/by-nc/3.0/',
    'CC-BY-NC 3.0': 'https://creativecommons.org/licenses/by-nc/3.0/',
    'CC BY NC 3.0': 'https://creativecommons.org/licenses/by-nc/3.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC-BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC-ND 3.0': 'https://creativecommons.org/licenses/by-nc-nd/3.0/',
    'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'AGPL 3.0': 'https://spdx.org/licenses/AGPL-3.0-or-later.html',
    'MIT': 'https://opensource.org/licenses/MIT',
    'MIT LICENSE WITH COMMONS CLAUSE RESTRICTION': 'https://github.com/zhu-xlab/GlobalBuildingAtlas/blob/main/LICENSE',
    'LGPL-3.0': 'https://www.gnu.org/licenses/lgpl-3.0.html',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    'GNU 3.0': 'https://www.gnu.org/licenses/gpl-3.0.en.html',
    'BSD 3-CLAUSE': 'https://opensource.org/license/bsd-3-clause',
    'GNU 2.1': 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html',
    'MODIFIED BSD': 'https://github.com/LBNL-ETA/EnergyPlus-MCP/blob/main/License.txt',
    'BSD-3-CLAUSE-STYLE LICENSE (COPYRIGHT 2019 CARNEGIE MELLON UNIVERSITY)': 'https://github.com/DIUx-xView/xView2_baseline/blob/master/LICENSE.md',
    'ACADEMIC USE ONLY (UNIVERSITY OF CAMBRIDGE)': 'https://github.com/mac137/ConSLAM/blob/main/LICENCE.txt',
    'FI-NCAL': 'https://github.com/fraunhofer-italia/AID-AI-Infraction-Detection/blob/main/LICENSE.md',
    'CUSTOM MIT LICENSE (UNIVERSITY OF STUTTGART)': 'https://darus.uni-stuttgart.de/api/datasets/:persistentId/versions/1.0/customlicense?persistentId=doi:10.18419/DARUS-5676',
    'MIXED LICENSE, SEE HTTPS://XVIEW2.ORG/TERMS': 'https://xview2.org/terms'
  };
  if (licenseMap[key]) return licenseMap[key];
  const embeddedUrl = String(licVal || '').match(/https?:\/\/\S+/i)?.[0];
  const embeddedHref = safeHref(embeddedUrl);
  if (embeddedHref) return embeddedHref;
  return isCustomLicense(licVal) ? recordSourceHref(record) : '';
}

function licenseNoticeFor(licVal){
  const norm = safeText(licVal);
  const key = norm === '—' ? '' : String(licVal).trim().toUpperCase();
  const genericNotice = [
    'This summary is provided for convenience and is not legal advice.',
    'License terms may be updated or supplemented by the original provider. Review the source page before downloading, reproducing, adapting, or redistributing the resource.',
    'If any license term is unclear, please contact the authors or the original provider before using the material.'
  ];

  const unspecified = {
    title: 'License not specified',
    intro: 'OpenConstruction does not have a clear license recorded for this resource.',
    freedoms: [],
    terms: [
      'Do not assume permission to download, reuse, adapt, redistribute, or use the resource for research, teaching, commercial, or public-facing purposes.',
      'If you would like to know more about permitted usage, please contact the authors or the original provider before using this resource.'
    ],
    notices: [
      'The external source may include access terms, data use agreements, citation requirements, privacy restrictions, or other conditions not captured in this catalog record.',
      'OpenConstruction indexes metadata and links to the original source; it does not grant additional rights to third-party resources.'
    ]
  };

  const notices = [
    'No warranties are given. The license may not give you all permissions necessary for your intended use; other rights such as publicity, privacy, or moral rights may limit how you use the material.',
    'This summary highlights key license features for convenience and has no legal value. Review the original license terms before using the material.'
  ];

  const creativeCommons = {
    'CC BY 4.0': {
      title: 'Creative Commons Attribution 4.0 International',
      intro: 'This resource is made available under Creative Commons Attribution 4.0 International. The following summary highlights key permissions and conditions from the license deed.',
      freedoms: [
        'Share — copy and redistribute the material in any medium or format for any purpose, even commercially.',
        'Adapt — remix, transform, and build upon the material for any purpose, even commercially.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — Give appropriate credit, provide a link to the license, and indicate if changes were made.',
        'No additional restrictions — Do not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC-BY 4.0': null,
    'CC BY-NC 4.0': {
      title: 'Creative Commons Attribution-NonCommercial 4.0 International',
      intro: 'This resource is made available under Creative Commons Attribution-NonCommercial 4.0 International. The following summary highlights key permissions and conditions from the license deed.',
      freedoms: [
        'Share — copy and redistribute the material in any medium or format.',
        'Adapt — remix, transform, and build upon the material.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — Give appropriate credit, provide a link to the license, and indicate if changes were made.',
        'NonCommercial — You may not use the material for commercial purposes.',
        'No additional restrictions — Do not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-NC 3.0': {
      title: 'Creative Commons Attribution-NonCommercial 3.0',
      intro: 'This resource is made available under Creative Commons Attribution-NonCommercial 3.0. The following summary highlights key permissions and conditions from the license deed.',
      freedoms: [
        'Share — copy and redistribute the material in any medium or format.',
        'Adapt — remix, transform, and build upon the material.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.',
        'NonCommercial — You may not use the material for commercial purposes.',
        'No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC-BY-NC': null,
    'CC BY-SA 4.0': {
      title: 'Creative Commons Attribution-ShareAlike 4.0 International',
      intro: 'This resource is made available under Creative Commons Attribution-ShareAlike 4.0 International. The following summary highlights key permissions and conditions from the license deed.',
      freedoms: [
        'Share — copy and redistribute the material in any medium or format for any purpose, even commercially.',
        'Adapt — remix, transform, and build upon the material for any purpose, even commercially.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — Give appropriate credit, provide a link to the license, and indicate if changes were made.',
        'ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.',
        'No additional restrictions — Do not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-NC-SA 4.0': {
      title: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International',
      intro: 'This resource is made available under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International. The following summary highlights key permissions and conditions from the license deed.',
      freedoms: [
        'Share — copy and redistribute the material in any medium or format.',
        'Adapt — remix, transform, and build upon the material.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — Give appropriate credit, provide a link to the license, and indicate if changes were made.',
        'NonCommercial — You may not use the material for commercial purposes.',
        'ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.',
        'No additional restrictions — Do not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-NC-ND 4.0': {
      title: 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International',
      intro: 'This resource is made available under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International. The following summary highlights key permissions and conditions from the license deed.',
      freedoms: [
        'Share — copy and redistribute the material in any medium or format.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.',
        'NonCommercial — You may not use the material for commercial purposes.',
        'NoDerivatives — If you remix, transform, or build upon the material, you may not distribute the modified material.',
        'No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-NC-ND 3.0': {
      title: 'Creative Commons Attribution-NonCommercial-NoDerivatives 3.0',
      intro: 'This resource is made available under Creative Commons Attribution-NonCommercial-NoDerivatives 3.0. The following summary highlights key permissions and conditions from the license deed.',
      freedoms: [
        'Share — copy and redistribute the material in any medium or format.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.',
        'NonCommercial — You may not use the material for commercial purposes.',
        'NoDerivatives — If you remix, transform, or build upon the material, you may not distribute the modified material.',
        'No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    }
  };
  creativeCommons['CC-BY 4.0'] = creativeCommons['CC BY 4.0'];
  creativeCommons['CC-BY-NC'] = creativeCommons['CC BY-NC 4.0'];
  creativeCommons['CC-BY-NC 3.0'] = creativeCommons['CC BY-NC 3.0'];
  creativeCommons['CC BY NC 3.0'] = creativeCommons['CC BY-NC 3.0'];

  if (!key || /UNSPECIFIED|UNKNOWN|NOT SPECIFIED/.test(key)) return unspecified;
  if (creativeCommons[key]) return creativeCommons[key];
  if (key === 'CC0') {
    return {
      title: 'Creative Commons CC0 Public Domain Dedication',
      intro: 'This resource is marked with the Creative Commons CC0 Public Domain Dedication. The following summary highlights the practical reuse status indicated by CC0.',
      freedoms: [
        'You may copy, modify, distribute, and perform the work, including for commercial purposes, without asking permission.'
      ],
      terms: [
        'Although attribution may not be legally required under CC0, scholarly and professional norms may still require citation of the original authors or source.',
        'Review the source page for any additional access, privacy, or data-use notes.'
      ],
      notices: genericNotice
    };
  }

  return {
    title: norm,
    intro: 'This resource is listed with the license shown below. Please review the original license text and source page before using it.',
    freedoms: [],
    terms: [
      'Follow the permissions, conditions, attribution requirements, redistribution rules, and warranty disclaimers stated by the original license.',
      'Some licenses may restrict commercial use, redistribution, derivative works, sublicensing, patent rights, or use of associated trademarks.'
    ],
    notices: genericNotice
  };
}

function listHtml(items){
  if (!items || !items.length) return '';
  return `<ul class="license-list">${items.map(item => {
    const [label, ...rest] = String(item).split(' — ');
    const detail = rest.join(' — ');
    const icon = licenseTermIconHtml(label);
    const className = icon ? ' class="has-license-icon"' : '';
    return detail
      ? `<li${className}>${icon}<div class="license-list-copy"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span></div></li>`
      : `<li><span>${escapeHtml(item)}</span></li>`;
  }).join('')}</ul>`;
}

function licenseBadgeHtml(kind, label){
  return `<img class="license-badge license-badge-${kind}" src="../assets/img/licenses/${kind}.svg" alt="" title="${escapeHtml(label)}" aria-hidden="true" loading="lazy" decoding="async">`;
}

function licenseIconStripHtml(licenseValue){
  const upper = String(licenseValue || '').trim().toUpperCase();
  const normalized = upper.replace(/[-_/]+/g, ' ');
  if (!upper || (!/\bCC\b/.test(normalized) && !/\bCC0\b/.test(normalized))) return '';

  const badges = [{ kind: 'cc', label: 'Creative Commons' }];
  if (upper === 'CC0' || /\bCC0\b/.test(normalized)) {
    badges.push({ kind: 'zero', label: 'Public Domain Dedication' });
  } else {
    if (/\bBY\b/.test(normalized)) badges.push({ kind: 'by', label: 'Attribution' });
    if (/\bNC\b/.test(normalized)) badges.push({ kind: 'nc', label: 'NonCommercial' });
    if (/\bSA\b/.test(normalized)) badges.push({ kind: 'sa', label: 'ShareAlike' });
    if (/\bND\b/.test(normalized)) badges.push({ kind: 'nd', label: 'NoDerivatives' });
  }

  const label = badges.map(badge => badge.label).join(', ');
  return `<span class="license-icon-strip" role="img" aria-label="${escapeHtml(label)}">${badges.map(badge => licenseBadgeHtml(badge.kind, badge.label)).join('')}</span>`;
}

function licenseTermIconHtml(label){
  const normalized = String(label || '').trim().toLowerCase();
  const terms = {
    share: { kind: 'share', label: 'Share' },
    adapt: { kind: 'remix', label: 'Adapt' },
    attribution: { kind: 'by', label: 'Attribution' },
    noncommercial: { kind: 'nc', label: 'NonCommercial' },
    sharealike: { kind: 'sa', label: 'ShareAlike' },
    noderivatives: { kind: 'nd', label: 'NoDerivatives' }
  };
  const term = terms[normalized];
  return term ? licenseBadgeHtml(term.kind, term.label) : '';
}

function resourceLicenseModalHtml({ license, resource, resourceType = 'resource', modalTitle = 'Review resource license', actionLabel = 'Open resource source' } = {}){
  const licenseLabel = safeText(license) === '—' ? 'Unspecified license' : licenseDisplayLabel(license);
  const notice = licenseNoticeFor(license);
  const licenseUrl = licenseHrefFor(license, resource);
  const licenseTerms = licenseUrl
    ? `<a href="${licenseUrl}" target="_blank" rel="noopener">${escapeHtml(licenseLabel)}</a>`
    : escapeHtml(licenseLabel);
  return `
    <div class="modal fade" id="licenseDownloadModal" tabindex="-1" aria-labelledby="licenseDownloadTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content license-modal">
          <div class="modal-header">
            <div>
              <div class="detail-kicker mb-1">Before you continue</div>
              <h2 class="modal-title h5 mb-0" id="licenseDownloadTitle">${escapeHtml(modalTitle)}</h2>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="license-summary">
              <div class="license-summary-row">
                <div class="license-summary-label">License terms</div>
                <div class="license-summary-value">
                  ${licenseIconStripHtml(license)}
                  <span class="license-title-line">${licenseTerms}</span>
                </div>
              </div>
            </div>
            ${notice.freedoms.length ? `
              <section class="license-section">
                <h3>You are free to</h3>
                ${listHtml(notice.freedoms)}
              </section>` : ''}
            <section class="license-section">
              <h3>Under the following terms</h3>
              ${listHtml(notice.terms)}
            </section>
            <section class="license-section">
              <h3>Notices</h3>
              ${listHtml(notice.notices)}
              <p class="small text-muted mb-0">If any license item is unclear, please contact the authors or the original provider before using this resource.</p>
            </section>
          </div>
          <div class="modal-footer license-footer">
            <div class="form-check text-start me-auto">
              <input class="form-check-input" type="checkbox" value="" id="licenseDownloadCheck">
              <label class="form-check-label" for="licenseDownloadCheck">
                I have reviewed the license terms for this ${escapeHtml(resourceType)}.
              </label>
            </div>
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" data-license-continue disabled>${escapeHtml(actionLabel)}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function datasetLicenseModalHtml(ds){
  return resourceLicenseModalHtml({
    license: ds?.license,
    resource: ds,
    resourceType: 'dataset',
    modalTitle: 'Review dataset license',
    actionLabel: 'Open dataset source'
  });
}

function modelLicenseModalHtml(model){
  return resourceLicenseModalHtml({
    license: model?.license,
    resource: model,
    resourceType: 'model',
    modalTitle: 'Review model license',
    actionLabel: 'Open model source'
  });
}

function wireLicenseGate(root){
  const modalEl = root.querySelector('#licenseDownloadModal');
  if (!modalEl) return;
  const checkbox = modalEl.querySelector('#licenseDownloadCheck');
  const continueBtn = modalEl.querySelector('[data-license-continue]');
  let pendingUrl = '';

  root.querySelectorAll('[data-license-gate]').forEach(link => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href') || '';
      if (!href || href === '#') return;
      event.preventDefault();
      pendingUrl = href;
      if (checkbox) checkbox.checked = false;
      if (continueBtn) continueBtn.disabled = true;
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    });
  });

  if (checkbox && continueBtn) {
    checkbox.addEventListener('change', () => {
      continueBtn.disabled = !checkbox.checked;
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      if (!pendingUrl || continueBtn.disabled) return;
      window.open(pendingUrl, '_blank', 'noopener');
      bootstrap.Modal.getInstance(modalEl)?.hide();
    });
  }
}

function wireDatasetLicenseGate(root){
  wireLicenseGate(root);
}

/* ---------- publication badges (Altmetric / Dimensions) ---------- */
function ensureExternalScript(src, id){
  if (!src) return;
  if (id && document.getElementById(id)) return;
  // If same src already present, don't add again
  const exists = Array.from(document.scripts || []).some(s => s?.src === src);
  if (exists) return;

  const s = document.createElement('script');
  if (id) s.id = id;
  s.src = src;
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
}

function parseScholarlyId(idVal){
  // Returns: { kind: 'doi'|'arxiv'|'pmid'|'dimensions_id'|'unknown', value: string }
  if (!idVal) return { kind: 'unknown', value: '' };
  const raw = String(idVal).trim();
  if (!raw) return { kind: 'unknown', value: '' };

  // 1) URL-based parsing
  try {
    const u = new URL(raw);
    const host = (u.hostname || '').toLowerCase();

    // DOI resolvers
    if (host === 'doi.org' || host === 'dx.doi.org') {
      const doi = (u.pathname || '').replace(/^\/+/, '');
      return doi ? { kind: 'doi', value: doi } : { kind: 'unknown', value: raw };
    }

    // arXiv URLs
    if (host.endsWith('arxiv.org')) {
      // /abs/1911.09296 or /abs/1911.09296v2 or /pdf/1911.09296.pdf
      const mAbs = (u.pathname || '').match(/^\/abs\/([^\/?#]+)/i);
      if (mAbs && mAbs[1]) return { kind: 'arxiv', value: mAbs[1].replace(/\.pdf$/i, '') };

      const mPdf = (u.pathname || '').match(/^\/pdf\/([^\/?#]+)/i);
      if (mPdf && mPdf[1]) return { kind: 'arxiv', value: mPdf[1].replace(/\.pdf$/i, '') };
    }

    // If it's some other URL, we don't treat it as a DOI for badges
    return { kind: 'unknown', value: raw };
  } catch {
    // not a URL, continue
  }

  // 2) Raw identifiers

  // Dimensions internal publication id (if you ever store it): pub.1234567890
  if (/^pub\.\d+$/i.test(raw)) return { kind: 'dimensions_id', value: raw };

  // PMID (all digits, typical length)
  if (/^\d{6,10}$/.test(raw)) return { kind: 'pmid', value: raw };

  // arXiv bare id: 1911.09296 or 1911.09296v2
  if (/^\d{4}\.\d{4,5}(v\d+)?$/i.test(raw)) return { kind: 'arxiv', value: raw };

  // arXiv prefixed: arXiv:1911.09296
  const mArxiv = raw.match(/^arxiv:\s*(\d{4}\.\d{4,5}(v\d+)?)$/i);
  if (mArxiv) return { kind: 'arxiv', value: mArxiv[1] };

  // Otherwise, assume it’s a DOI-like string (fallback).
  return { kind: 'doi', value: raw };
}

function publicationBadgesHtml(doiVal, cfg){
  const id = parseScholarlyId(doiVal);
  if (!id.value) return '';

  // Config precedence:
  // - If cfg.altmetric / cfg.dimensions is boolean, respect it.
  // - If cfg.altmetric / cfg.dimensions is 0 or "0", treat as disabled (hide badges for zero metrics).
  // - Otherwise default to true when identifier exists.
  const asBool = v => (v === true || v === false) ? v : undefined;
  const isZero = v => v === 0 || v === '0' || v === '0.0';

  const altmetricOn  = isZero(cfg?.altmetric)  ? false : (asBool(cfg?.altmetric)  ?? true);
  const dimensionsOn = isZero(cfg?.dimensions) ? false : (asBool(cfg?.dimensions) ?? true);

  const blocks = [];

  // ----- Altmetric (supports DOI + arXiv IDs + PMID) -----
  if (altmetricOn) {
    let altAttr = '';
    if (id.kind === 'arxiv') altAttr = `data-arxiv-id="${escapeHtml(id.value)}"`;
    else if (id.kind === 'pmid') altAttr = `data-pmid="${escapeHtml(id.value)}"`;
    else altAttr = `data-doi="${escapeHtml(id.value)}"`; // default DOI

    blocks.push(`
      <div class="mb-2">
        <div class="altmetric-embed" data-badge-type="donut" ${altAttr}></div>
      </div>
    `);
  }

  // ----- Dimensions badge -----
  // Official embed supports data-doi / data-pmid / data-id (Dimensions internal id like pub.123...)
  if (dimensionsOn) {
    let dimAttr = '';
    if (id.kind === 'doi') dimAttr = `data-doi="${escapeHtml(id.value)}"`;
    else if (id.kind === 'pmid') dimAttr = `data-pmid="${escapeHtml(id.value)}"`;
    else if (id.kind === 'dimensions_id') dimAttr = `data-id="${escapeHtml(id.value)}"`;

    if (dimAttr) {
      blocks.push(`
        <div class="mb-1">
          <span class="__dimensions_badge_embed__" ${dimAttr} data-style="small_rectangle"></span>
        </div>
      `);
    }
  }

  if (!blocks.length) return '';

  // Ensure scripts are loaded once when the blocks exist.
  if (altmetricOn) ensureExternalScript('https://d1bxh8uas1mnw7.cloudfront.net/assets/embed.js', 'oc-altmetric-embed');
  if (dimensionsOn) ensureExternalScript('https://badge.dimensions.ai/badge.js', 'oc-dimensions-badge');

  return `<div class="mt-2">${blocks.join('')}</div>`;
}

/* ---------- chip helpers ---------- */
function isNotSpecified(s){
  return typeof s === 'string' && /^not\s*specified$/i.test(s.trim());
}
function tokenize(list){
  if (list == null) return [];
  let arr;
  if (Array.isArray(list)) {
    arr = list.map(String);
  } else {
    const s = String(list);
    arr = s.includes(',') ? s.split(',').map(t => t.trim()) : [s.trim()];
  }
  return arr.map(x => x.trim()).filter(x => x && !isNotSpecified(x));
}
function chipLane(list){
  const items = tokenize(list);
  if (!items.length) return '';
  return `<div class="chip-lane">${items.map(x => `<span class="chip">${x}</span>`).join('')}</div>`;
}

function taskChipLabel(label){
  return prettyTermLabel(label) || String(label || '').trim();
}

function getTaskVocabularyEntry(raw){
  const key = normalizeOcTaskKey(raw);
  if (!key) return null;
  return window.OC_TASK_VOCAB?.aliasToTask?.get(key) || null;
}

function taskBenchmarkHref(raw){
  const entry = getTaskVocabularyEntry(raw);
  const key = entry?.canonical_key || normalizeOcTaskKey(raw);
  if (!key) return '';
  return `../benchmark_task.html?key=${encodeURIComponent(key)}`;
}

function linkedTaskChipLane(list){
  const items = tokenize(list);
  if (!items.length) return '';
  return `<div class="chip-lane">${items.map(rawLabel => {
    const label = taskChipLabel(rawLabel);
    const href = taskBenchmarkHref(rawLabel);
    if (!href) return `<span class="chip">${escapeHtml(label)}</span>`;
    return `<a class="chip chip-link" href="${href}" title="View insight page for ${escapeHtml(label)}">${escapeHtml(label)}</a>`;
  }).join('')}</div>`;
}

function applicationBenchmarkHref(raw){
  const key = normKey(raw);
  if (!key) return '';
  return `../benchmark_application.html?key=${encodeURIComponent(key)}&label=${encodeURIComponent(String(raw).trim())}`;
}

function linkedApplicationChipLane(list){
  const items = tokenize(list);
  if (!items.length) return '';
  return `<div class="chip-lane">${items.map(label => {
    const href = applicationBenchmarkHref(label);
    if (!href) return `<span class="chip">${escapeHtml(label)}</span>`;
    return `<a class="chip chip-link" href="${href}" title="View insight page for ${escapeHtml(label)}">${escapeHtml(label)}</a>`;
  }).join('')}</div>`;
}

/* ---------- conditional meta-row ---------- */
function metaRow(label, valueHTML) {
  if (!valueHTML || valueHTML === '—' || !valueHTML.trim()) return '';
  return `
    <div class="meta-row">
      <dt class="meta-label">${label}</dt>
      <dd class="meta-val">${valueHTML}</dd>
    </div>
  `;
}

/* ========== page ========== */

function getDetailType(){
  const t = document.body?.getAttribute('data-oc-detail') || document.documentElement?.getAttribute('data-oc-detail') || '';
  if (t) return String(t).toLowerCase();
  const p = (location.pathname || '').toLowerCase();
  if (p.includes('/models/')) return 'model';
  return 'dataset';
}

function normalizeModelPayload(payload){
  // models.json may be: array, {models:[...]}, or keyed object
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.models)) return payload.models;
  if (payload && typeof payload === 'object') return Object.values(payload);
  return [];
}

function findModelById(modelsArr, id){
  if (!id) return null;
  // Prefer exact id match
  let m = modelsArr.find(x => String(x?.id || '').trim() === id);
  if (m) return m;

  // Fallback: some records might use "name" or "title" as id-ish
  const idNorm = String(id).trim().toLowerCase();
  return modelsArr.find(x => String(x?.title || x?.name || '').trim().toLowerCase() === idNorm) || null;
}

async function loadBenchmarkPayload(){
  const candidates = [
    '../data/benchmark-results.json',
    '/open-construction/data/benchmark-results.json'
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res?.ok) return await res.json();
    } catch {}
  }
  return { benchmarks: [] };
}

function datasetBenchmarkBoards(benchmarkPayload, ds){
  const wanted = normKey(ds?.id || ds?.name || '');
  if (!wanted) return [];
  return (Array.isArray(benchmarkPayload?.benchmarks) ? benchmarkPayload.benchmarks : [])
    .filter(board => normKey(board?.dataset_id) === wanted);
}

function benchmarkLinksCardHtml(boards){
  if (!Array.isArray(boards) || !boards.length) return '';
  return `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body">
        <h2 class="h6 text-uppercase text-muted mb-3">Reported Results</h2>
        <div class="d-grid gap-2">
          ${boards.map(board => {
            const isExternal = !!board.results_url;
            const href = isExternal
              ? board.results_url
              : `../benchmark_results.html?id=${encodeURIComponent(board.id || '')}`;
            const label = isExternal ? 'Open leaderboard' : 'View reported results';
            const title = board.page_title || board.name || label;
            return href
              ? `<a class="btn btn-outline-secondary btn-sm" href="${escapeHtml(href)}" ${isExternal ? 'target="_blank" rel="noopener"' : ''}>${escapeHtml(label)}</a><div class="small text-muted">${escapeHtml(title)}</div>`
              : '';
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

async function initDetail(){
  const type = getDetailType();
  if (window.loadTaskVocabulary) await window.loadTaskVocabulary();

  const id = decodeURIComponent((typeof getParam === 'function'
    ? getParam('id')
    : new URL(window.location.href).searchParams.get('id')) || '');

  const root = document.getElementById('detailRoot');
  if (!root) return;

  try{
    if (type === 'model') {
      const [modelsRes, datasetsRes] = await Promise.all([
        fetch('../data/models.json', { cache: 'no-cache' }).catch(() => null),
        fetch('../data/datasets.json', { cache: 'no-cache' }).catch(() => null)
      ]);
      const payload = modelsRes?.ok
        ? await modelsRes.json()
        : await (await fetch('/open-construction/data/models.json', { cache: 'no-cache' })).json();
      const datasetPayload = datasetsRes?.ok
        ? await datasetsRes.json()
        : await (await fetch('/open-construction/data/datasets.json', { cache: 'no-cache' })).json();
      const arr = normalizeModelPayload(payload);
      const datasets = Object.values(datasetPayload || {});
      const m = findModelById(arr, id);

      if (!m){
        root.innerHTML = '<div class="alert alert-warning">Model not found.</div>';
        window.OC?.clearSkeleton?.();
        return;
      }

      if (typeof incViews === 'function') incViews(id);

      // Badges
      const modality = m.data_modality || m.modalities || m.modality || m.data_modalities || '';
      const tasks = m.tasks || m.potential_tasks || m.task || '';
      const applications = m.applications || m.application || '';
      const license = safeText(m.license) === '—' ? '' : m.license;

      window.OC?.setBadges?.({
        modality: safeText(modality) === '—' ? '' : modality,
        tasks: uniquePrettyTerms(tasks).join(', '),
        applications: uniquePrettyTerms(applications).join(', '),
        license
      });

      const modelTitle = m.title || m.name || 'Untitled';
      const year = (m.year !== undefined && m.year !== null) ? m.year : '—';

      const codeUrl  = (m.code_url  || m.code  || '').trim();
      const imgCandidates = getModelImageCandidates(m, id, codeUrl);
      const imgPlaceholder = `../assets/img/models/_placeholder.png`;
      const captionText = m.sample_caption || m.caption || 'Media from public websites are © their respective creators unless otherwise noted.';
      const rawPaperField = safeText(m.paper || '');
      const paperFieldIsUrl = rawPaperField !== '—' && !!safeHref(rawPaperField);
      const publications = recordPublications(m);
      const primaryPublication = publications[0] || null;
      const primaryPublicationUrl = primaryPublication?.url || '';
      const paperUrl = primaryPublicationUrl || safeHref(m.paper_url || m.paper_link || '') || (paperFieldIsUrl ? safeHref(rawPaperField) : '');
      const modelSourceUrl = safeHref(codeUrl);
      const doiSource = primaryPublication?.doi || m.doi || (paperUrl && paperUrl.includes('doi.org/') ? paperUrl : '');
      const doiUrl = doiSource
        ? (String(doiSource).startsWith('http') ? String(doiSource).trim() : `https://doi.org/${String(doiSource).trim()}`)
        : '';
      const showDoiButton = !!doiUrl && doiUrl !== paperUrl;
      const doiBlock = doiSource ? `<div class="mb-2"><span class="text-muted">DOI:</span> ${formatDoi(doiSource)}</div>` : '';
      const licenseBlock = m.license ? `<div class="mb-0"><span class="text-muted">License:</span> ${formatLicense(m.license, m)}</div>` : '';
      const authorBlock = authorListHtml(m.authors, m.author_urls || m.authors_url || m.author_links);
      const badgeIdSource = doiSource || paperUrl;
      const pubBadgesBlock = publicationBadgesHtml(badgeIdSource, {
        altmetric: (m.altmetric !== undefined) ? m.altmetric : undefined,
        dimensions: (m.dimensions !== undefined) ? m.dimensions : undefined
      });
      const modelPaperTitle = safeText(
        primaryPublication?.title ||
        (rawPaperField !== '—' && !paperFieldIsUrl ? rawPaperField : '') ||
        m.Paper ||
        m.paper_title ||
        m.paper_name ||
        m.publication ||
        m.title ||
        m.name ||
        ''
      );
      const taskList = uniquePrettyTerms(tasks);
      const taskFamilyList = taskFamilies(tasks);
      const appList = uniquePrettyTerms(applications);
      const appFamilyList = applicationFamilies(applications);
      const modalityList = normalizeList(modality);
      const modalityFamilyList = modalityFamilies(modality);
      const trainingList = normalizeList(m.training_data || m.datasets || m.dataset || '');
      const quickFacts = [
        { label: 'Year', value: escapeHtml(safeText(year)) },
        { label: 'Tasks', value: taskList.length ? linkedTaskChipLane(taskList) : '—' },
        { label: 'Primary Application', value: appList.length ? linkedApplicationChipLane(appList.slice(0, 1)) : '—' },
        { label: 'Modality', value: modalityList.length ? escapeHtml(modalityList[0]) : '—' },
        { label: 'License', value: formatLicense(m.license, m) || '—' }
      ];

      function datasetHref(ds){
        return `../datasets/detail.html?id=${encodeURIComponent(ds.id || ds.name || '')}`;
      }
      function modelHref(model){
        return `details.html?id=${encodeURIComponent(model.id || model.title || '')}`;
      }
    function scoreOverlap(a, b){
      const setA = new Set(normalizeList(a).map(normKey));
      const setB = new Set(normalizeList(b).map(normKey));
      let score = 0;
      setA.forEach(v => { if (setB.has(v)) score += 1; });
      return score;
    }
    const relatedDatasets = datasets
      .map(ds => {
        const trainMatch = trainingList.some(name => {
          const target = normKey(name);
          return target && [ds.id, ds.name].some(v => normKey(v) === target);
        });
        const taskScore = scoreOverlap(taskList, uniquePrettyTerms(ds.potential_tasks));
        const taskFamilyScore = scoreOverlap(taskFamilyList, taskFamilies(ds.potential_tasks || ds.tasks || ds.task));
        const applicationScore = scoreOverlap(appList, uniquePrettyTerms(ds.applications || ds.application || ds.use_cases || ds.use_case));
        const applicationFamilyScore = scoreOverlap(appFamilyList, applicationFamilies(ds.applications || ds.application || ds.use_cases || ds.use_case));
        const modalityScore = scoreOverlap(modalityList, ds.data_modality);
        const modalityFamilyScore = scoreOverlap(modalityFamilyList, modalityFamilies(ds.data_modality || ds.data_modalities));
        const score = (trainMatch ? 10 : 0) + taskScore * 4 + taskFamilyScore * 2 + applicationScore * 2 + applicationFamilyScore + modalityFamilyScore * 2 + modalityScore;
        const hasStrongSignal =
          trainMatch ||
          (taskScore > 0 && modalityFamilyScore > 0) ||
          (taskScore > 0 && applicationScore > 0) ||
          (taskFamilyScore > 0 && modalityFamilyScore > 0) ||
          (applicationScore > 0 && modalityFamilyScore > 0);
        return hasStrongSignal ? { ds, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (b.ds.year || 0) - (a.ds.year || 0))
      .slice(0, 3)
      .map(({ ds }) => ds);

      const relatedModels = arr
        .filter(other => other && other !== m)
        .map(other => {
          const taskScore = scoreOverlap(taskList, uniquePrettyTerms(other.tasks || other.task));
          const taskFamilyScore = scoreOverlap(taskFamilyList, taskFamilies(other.tasks || other.task || other.potential_tasks));
          const applicationScore = scoreOverlap(appList, uniquePrettyTerms(other.applications || other.application));
          const applicationFamilyScore = scoreOverlap(appFamilyList, applicationFamilies(other.applications || other.application));
          const modalityScore = scoreOverlap(modalityList, other.modalities || other.modality || other.data_modalities);
          const modalityFamilyScore = scoreOverlap(modalityFamilyList, modalityFamilies(other.modalities || other.modality || other.data_modalities));
          const sharedTrainingScore = scoreOverlap(trainingList, other.training_data || other.datasets || other.dataset);
          const score = sharedTrainingScore * 6 + taskScore * 4 + taskFamilyScore * 2 + applicationScore * 2 + applicationFamilyScore + modalityFamilyScore * 2 + modalityScore;
          const hasStrongSignal =
            sharedTrainingScore > 0 ||
            (taskScore > 0 && modalityFamilyScore > 0) ||
            (taskScore > 0 && applicationScore > 0) ||
            (taskFamilyScore > 0 && modalityFamilyScore > 0) ||
            (applicationScore > 0 && modalityFamilyScore > 0);
          return hasStrongSignal ? { other, score } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || (b.other.year || 0) - (a.other.year || 0))
        .slice(0, 3)
        .map(({ other }) => other);

      const relatedItemsHtml = `
        <div class="row g-4">
          <div class="col-lg-6">
            <div class="detail-subcard h-100">
              <div class="detail-subhead">Related models</div>
              ${relatedModels.length ? relatedModels.map(other => `
                <a class="related-link" href="${modelHref(other)}">
                  <span class="related-link-type">Model</span>
                  <span class="related-link-title">${escapeHtml(other.title || other.id || 'Untitled model')}</span>
                  <span class="related-link-meta">${escapeHtml(truncateText([uniquePrettyTerms(other.tasks || other.task)[0], uniquePrettyTerms(other.applications || other.application)[0]].filter(Boolean).join(' • ') || 'Similar task or application area', 90))}</span>
                </a>
              `).join('') : '<p class="text-muted small mb-0">No related models were identified from the current catalog.</p>'}
            </div>
          </div>
          <div class="col-lg-6">
            <div class="detail-subcard h-100">
              <div class="detail-subhead">Related datasets</div>
              ${relatedDatasets.length ? relatedDatasets.map(ds => `
                <a class="related-link" href="${datasetHref(ds)}">
                  <span class="related-link-type">Dataset</span>
                  <span class="related-link-title">${escapeHtml(ds.name || ds.id || 'Untitled dataset')}</span>
                  <span class="related-link-meta">${escapeHtml(truncateText([uniquePrettyTerms(ds.potential_tasks)[0], normalizeList(ds.data_modality)[0]].filter(Boolean).join(' • ') || 'Relevant training or evaluation dataset', 90))}</span>
                </a>
              `).join('') : '<p class="text-muted small mb-0">No related datasets were identified from the current catalog.</p>'}
            </div>
          </div>
        </div>
      `;

      const mainHero = `
        <style>
          .ds-card,.detail-section,.detail-subcard,.quickfact-card{ border:1px solid var(--oc-border); border-radius:16px; box-shadow:var(--oc-shadow); background:#fff; }
          .ds-img{ width:100%; height:auto; max-height:clamp(260px,48vh,560px); object-fit:contain; display:block; border-radius:10px; background:#fff; cursor:zoom-in; }
          .ds-cap{ line-height:1.25; }
          .ds-body{ padding:24px 28px; }
          .ds-figure{ border-bottom:1px solid var(--oc-border); background:#f8fbff; }
          .ds-title{ font-size:clamp(1.35rem,1.05rem + 1.2vw,2rem); font-weight:700; color:var(--oc-ink); margin-bottom:.25rem; }
          .ds-year{ color:var(--oc-sub); margin-bottom:1rem; }
          .ds-meta-line{ color:var(--oc-sub); margin-bottom:.9rem; line-height:1.45; }
          .meta{ margin:0; }
          .meta-row{ display:grid; grid-template-columns: 180px 1fr; gap:14px; padding:10px 0; align-items:start; }
          .meta-row + .meta-row{ border-top:1px solid var(--oc-border); }
          .meta-label{ color:var(--oc-sub); font-size:.92rem; white-space:nowrap; }
          .meta-val{ font-weight:600; line-height:1.4; }
          .chip-lane{ display:flex; flex-wrap:wrap; align-items:center; gap:.5rem .5rem; }
          .chip{ display:inline-flex; align-items:center; padding:.28rem .6rem; background:var(--oc-muted); border:1px solid var(--oc-border); border-radius:999px; font-weight:600; font-size:.82rem; color:var(--oc-text);}
          .btn-with-icon{ display:inline-flex; align-items:center; justify-content:center; gap:.45rem; }
          .btn-action-icon{ width:1rem; height:1rem; flex:0 0 auto; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
          .abs{ white-space:pre-line; }
          .detail-section{ padding:1.25rem 1.35rem; margin-bottom:1rem; }
          .detail-kicker{ color:var(--oc-sub); font-size:.76rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; margin-bottom:.45rem; }
          .detail-heading{ font-size:1.1rem; font-weight:700; color:var(--oc-ink); margin:0 0 .85rem; }
          .detail-section p:last-child{ margin-bottom:0; }
          .section-nav a{ color:var(--oc-link); text-decoration:none; }
          .section-nav a:hover{ text-decoration:underline; }
          .quickfact-card .card-body{ padding:1.35rem 1.4rem; }
          .quickfact-grid{ display:grid; gap:0; }
          .quickfact-row{
            display:grid;
            gap:.16rem;
            padding:.55rem 0;
          }
          .quickfact-row + .quickfact-row{ border-top:1px solid var(--oc-border); }
          .quickfact-label{ color:var(--oc-sub); font-size:.8rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
          .quickfact-value{ font-weight:700; line-height:1.35; }
          .detail-subcard{ padding:1rem; }
          .detail-subhead{ font-size:.92rem; font-weight:700; color:var(--oc-ink); margin-bottom:.8rem; }
          .publications-disclosure summary{ display:flex; align-items:center; justify-content:space-between; gap:1rem; cursor:pointer; list-style:none; }
          .publications-disclosure summary::-webkit-details-marker{ display:none; }
          .publications-disclosure .publication-toggle{ width:1.65rem; height:1.65rem; flex:0 0 1.65rem; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--oc-border); border-radius:999px; color:var(--oc-link); font-weight:800; line-height:1; }
          .publications-disclosure .publication-toggle::before{ content:"+"; }
          .publications-disclosure[open] .publication-toggle::before{ content:"-"; }
          .publication-list{ display:grid; gap:.75rem; padding-left:1.25rem; margin-top:1rem; }
          .publication-item{ padding-left:.15rem; }
          .publication-title{ font-weight:700; line-height:1.4; }
          .related-link{ display:flex; flex-direction:column; gap:.18rem; padding:.8rem 0; color:inherit; text-decoration:none; }
          .related-link + .related-link{ border-top:1px solid var(--oc-border); }
          .related-link:hover .related-link-title{ color:var(--oc-link); }
          .related-link-type{ color:var(--oc-sub); font-size:.75rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
          .related-link-title{ font-weight:700; color:var(--oc-ink); transition:color .15s ease; }
          .related-link-meta{ color:var(--oc-sub); font-size:.9rem; }
          .chip-link{ display:inline-flex; align-items:center; color:var(--oc-text); text-decoration:none !important; transition:background .15s ease, border-color .15s ease, color .15s ease; }
          .chip-link:hover, .chip-link:focus, .chip-link:active, .chip-link:visited{ text-decoration:none !important; }
          .chip-link:hover, .chip-link:focus{ color:var(--oc-link); border-color:#cfe0f3; background:#f5f9ff; }
          .license-modal{ border:0; border-radius:14px; box-shadow:0 22px 64px rgba(15,46,75,.2); overflow:hidden; }
          .license-modal .modal-header{ align-items:flex-start; border-bottom:1px solid var(--oc-border); padding:1.25rem 1.4rem 1.1rem; background:#fff; }
          .license-modal .modal-body{ padding:1.15rem 1.4rem 1.1rem; }
          .license-summary{ border:1px solid #d8e4ef; border-radius:10px; background:#f8fbff; margin-bottom:1.1rem; overflow:hidden; }
          .license-summary-row{ display:grid; grid-template-columns:132px 1fr; gap:1rem; padding:.82rem .95rem; align-items:center; }
          .license-summary-row + .license-summary-row{ border-top:1px solid var(--oc-border); }
          .license-summary-label{ color:var(--oc-sub); font-size:.8rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
          .license-summary-value{ display:flex; flex-wrap:wrap; align-items:center; gap:.55rem; min-width:0; }
          .license-inline{ display:inline-flex; flex-wrap:wrap; align-items:center; gap:.45rem; min-width:0; }
          .license-title-line{ display:inline-flex; align-items:center; min-width:0; }
          .license-icon-strip{ display:inline-flex; flex:0 0 auto; align-items:center; gap:.28rem; }
          .license-badge{ display:block; width:1.55rem; min-width:1.55rem; height:1.55rem; object-fit:contain; }
          .license-section{ margin-top:1rem; padding-top:1rem; border-top:1px solid var(--oc-border); }
          .license-summary + .license-section{ border-top:0; padding-top:0; }
          .license-section h3{ color:var(--oc-ink); font-size:.94rem; font-weight:700; margin:0 0 .55rem; }
          .license-list{ display:grid; gap:.68rem; margin:0; padding:0; color:var(--oc-text); list-style:none; }
          .license-list li{ display:grid; gap:.12rem; line-height:1.45; padding:0; }
          .license-list li.has-license-icon{ grid-template-columns:auto 1fr; column-gap:.62rem; align-items:flex-start; }
          .license-list-copy{ display:grid; gap:.12rem; min-width:0; }
          .license-list li.has-license-icon .license-badge{ margin-top:.06rem; width:1.45rem; min-width:1.45rem; height:1.45rem; }
          .license-list li strong{ color:var(--oc-ink); font-size:.9rem; }
          .license-list li span{ color:#334155; }
          .license-footer{ gap:.75rem; align-items:center; border-top:1px solid var(--oc-border); padding:1rem 1.4rem; background:#f8fafc; }
          .license-footer .form-check{ max-width:520px; }
          .license-footer .form-check-label{ color:#334155; font-size:.92rem; }
          @media (max-width: 991.98px){
            .meta-row{ grid-template-columns:1fr; gap:.35rem; }
            .ds-body{ padding:20px 18px; }
            .detail-section{ padding:1.05rem 1rem; }
            .detail-subcard{ padding:.9rem; }
            .quickfact-card .card-body,
            .section-nav.card .card-body,
            .card.border-0.shadow-sm .card-body{ padding:1rem; }
            .license-summary-row{ grid-template-columns:1fr; gap:.2rem; }
            .license-footer{ align-items:stretch; }
            .license-footer .form-check{ width:100%; max-width:none; }
          }
          @media (max-width: 575.98px){
            .ds-img{ max-height:240px; }
            .ds-cap{ padding-inline:1rem; }
            .quickfact-label{ font-size:.76rem; }
            .related-link{ padding:.7rem 0; }
          }

/* Abstract show more/less */
.oc-abs-wrap{ position:relative; }
.oc-abs-text{ white-space:pre-line; text-align:left; font-weight:400; } /* non-bold + no indent look */
.oc-abs-text.is-collapsed{
  display:-webkit-box;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:var(--oc-abs-lines, 6);
  overflow:hidden;
  position:relative;
}
.oc-abs-text.is-collapsed::after{
  content:"";
  position:absolute;
  left:0; right:0; bottom:0;
  height:2.2em;
  background:linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1));
  pointer-events:none;
}
.oc-abs-toggle{ font-weight:600; text-decoration:none; }
.oc-abs-toggle:hover{ text-decoration:underline; }
        </style>

        <div class="ds-card mb-3 bg-white">
          <figure class="m-0 ds-figure">
            <img src="" data-oc-img="model" alt="${escapeHtml(modelTitle)} preview"
                 class="ds-img" data-zoom-src="" data-oc-zoom="model">
            <figcaption class="text-muted small text-center py-2 ds-cap">${escapeHtml(captionText)}</figcaption>
          </figure>
          <div class="ds-body">
            <h1 class="ds-title">${escapeHtml(modelTitle)}</h1>
            <div class="ds-meta-line">${escapeHtml(
              [
                Array.isArray(m.authors) ? m.authors.join(', ') : safeText(m.authors || ''),
                year && year !== '—' ? year : ''
              ].filter(Boolean).join(' • ') || 'Author and publication information not yet available'
            )}</div>
            <div class="chip-lane">
              ${chipLane(modality).replace(/^<div class="chip-lane">|<\/div>$/g, '')}
              ${chipLane(taskList.slice(0, 2)).replace(/^<div class="chip-lane">|<\/div>$/g, '')}
              ${chipLane(appList.slice(0, 2)).replace(/^<div class="chip-lane">|<\/div>$/g, '')}
              ${bookmarkInlineHtml('model', m.id || id || modelTitle, modelTitle)}
            </div>
          </div>
        </div>

        <section id="overview" class="detail-section">
          <div class="detail-kicker">Overview</div>
          <h2 class="detail-heading">What this model is for</h2>
          ${m.abstract ? abstractToggleHtml(m.abstract, { collapsedLines: 7, minCharsForToggle: 320 }) : '<p class="text-muted mb-0">No abstract is available for this model yet.</p>'}
        </section>

        <section id="technical-profile" class="detail-section">
          <div class="detail-kicker">Technical Profile</div>
          <h2 class="detail-heading">Key implementation details</h2>
          <dl class="meta mb-0">
            ${metaRow('Framework', escapeHtml(safeText(m.framework || m.library || m.backbone || '')))}
            ${metaRow('Parameters', escapeHtml(safeText(m.parameters || m.num_parameters || '')))}
            ${metaRow('Modalities', chipLane(modalityList))}
            ${metaRow('Training data', chipLane(m.training_data || m.datasets || m.dataset || ''))}
            ${metaRow('Associated paper', modelPaperTitle !== '—' ? ((doiUrl || safeHref(paperUrl || '')) ? `<a href="${doiUrl || safeHref(paperUrl || '')}" target="_blank" rel="noopener">${escapeHtml(modelPaperTitle)}</a>` : escapeHtml(modelPaperTitle)) : '—')}
            ${metaRow('Source status', escapeHtml(formatSourceStatus(m.source_status)))}
            ${metaRow('Code URL', modelSourceUrl ? `<a href="${modelSourceUrl}" target="_blank" rel="noopener" data-license-gate>${escapeHtml(codeUrl)}</a>` : '—')}
            ${metaRow('DOI', doiSource ? formatDoi(doiSource) : '—')}
            ${metaRow('License', formatLicense(m.license, m) || '—')}
          </dl>
        </section>

        ${publications.length > 1 ? `
        <section id="publications" class="detail-section">
          <details class="publications-disclosure" open>
            <summary>
              <h2 class="detail-heading mb-0">Related publications</h2>
              <span class="publication-toggle" aria-hidden="true"></span>
            </summary>
            ${publicationsListHtml(publications)}
          </details>
        </section>` : ''}

        <section id="related-resources" class="detail-section">
          <div class="detail-kicker">Related Resources</div>
          <h2 class="detail-heading">Keep exploring from here</h2>
          ${relatedItemsHtml}
        </section>

        <div class="modal fade" id="imgModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered modal-xl">
            <div class="modal-content border-0">
              <div class="modal-body text-center p-2">
                <img src="" alt="Full preview" class="modal-img" style="max-height:calc(100vh - 7rem); width:auto; max-width:100%; object-fit:contain;">
              </div>
            </div>
          </div>
        </div>
      `;

      if (modalityList.length) {
        quickFacts[3] = { label: 'Modalities', value: chipLane(modalityList) };
      }

      const sidebar = `
        <div class="position-sticky" style="top:88px">
          <div class="quickfact-card mb-3">
            <div class="card-body" style="padding:1.4rem 1.5rem;">
              <h2 class="h6 text-uppercase text-muted mb-3">Quick Facts</h2>
              <div class="quickfact-grid">
                ${quickFacts.map(item => `
                  <div class="quickfact-row">
                    <div class="quickfact-label">${escapeHtml(item.label)}</div>
                    <div class="quickfact-value">${item.value}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
              <h2 class="h6 text-uppercase text-muted mb-3">Model Links</h2>
              <div class="d-grid gap-2">
                ${modelSourceUrl ? `<a class="btn btn-primary btn-sm btn-with-icon" href="${modelSourceUrl}" target="_blank" rel="noopener" data-license-gate>${actionButtonContent('code', 'View Code')}</a>` : ''}
                ${paperUrl ? `<a class="btn btn-outline-secondary btn-sm btn-with-icon" href="${paperUrl}" target="_blank" rel="noopener">${actionButtonContent('paper', 'View Paper')}</a>` : ''}
                ${publications.length > 1 ? `<a class="btn btn-outline-secondary btn-sm" href="#publications">View all publications</a>` : ''}
                ${showDoiButton ? `<a class="btn btn-outline-secondary btn-sm" href="${doiUrl}" target="_blank" rel="noopener">DOI</a>` : ''}
              </div>
            </div>
          </div>

          ${shareCardHtml(modelTitle)}

          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body section-nav">
              <h2 class="h6 text-uppercase text-muted mb-3">On This Page</h2>
              <div class="d-grid gap-2 small">
                <a href="#overview">Overview</a>
                <a href="#technical-profile">Technical Profile</a>
                ${publications.length > 1 ? '<a href="#publications">Publications</a>' : ''}
                <a href="#related-resources">Related Resources</a>
              </div>
            </div>
          </div>

          ${(doiBlock || licenseBlock) ? `
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
              <h2 class="h6 text-uppercase text-muted mb-3">Reference</h2>
              <div class="small">${doiBlock}${licenseBlock}</div>
            </div>
          </div>` : ''}

          ${authorBlock ? `
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
              <h2 class="h6 text-uppercase text-muted mb-3">Authors</h2>
              <div class="small">${authorBlock}</div>
            </div>
          </div>` : ''}

          ${pubBadgesBlock ? `
          <div class="card border-0 shadow-sm">
            <div class="card-body">
			<h2 class="h6 text-uppercase text-muted mb-2">Citation &amp; Attention</h2>
			<div class="text-muted small mb-2">
			  Data source:
			  <a href="https://www.altmetric.com" target="_blank" rel="noopener">Altmetric</a> and
			  <a href="https://www.dimensions.ai" target="_blank" rel="noopener">Dimensions</a>
			  <span class="ms-1">(records may be incomplete and coverage varies by venue and year)</span>
			</div>
              ${pubBadgesBlock}
            </div>
          </div>` : ''}
        </div>
      `;

      root.innerHTML = `
        <div class="row g-4">
          <div class="col-lg-8">${mainHero}</div>
          <div class="col-lg-4">${sidebar}</div>
        </div>
        ${modelLicenseModalHtml(m)}
      `;

      // Abstract toggle wiring (model detail)
      root.querySelectorAll('[data-oc-abs]').forEach(wrap => {
        const textEl = wrap.querySelector('.oc-abs-text');
        const btn = wrap.querySelector('[data-oc-abs-toggle]');
        if (!textEl || !btn) return;

        btn.addEventListener('click', () => {
          const collapsed = textEl.classList.toggle('is-collapsed');
          btn.textContent = collapsed ? 'Show more' : 'Show less';
          btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        });
      });

      const shareBtn = root.querySelector('[data-oc-share]');
      if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
          const original = shareBtn.querySelector('.btn-label')?.textContent || shareBtn.textContent;
          const label = shareBtn.getAttribute('data-share-label') || modelTitle;
          const result = await shareResourceLink({
            title: label,
            text: `OpenConstruction resource: ${label}`
          });
          if (result === 'cancelled') return;
          setActionButtonLabel(shareBtn, result === 'shared' ? 'Shared' : (result === 'copied' ? 'Link Copied' : 'Copy Failed'));
          window.setTimeout(() => { setActionButtonLabel(shareBtn, original); }, 1800);
        });
      }
      wireLicenseGate(root);
      window.OCBookmark?.mount(root);

      const imgEl = root.querySelector('.ds-img');
      const modalEl = root.querySelector('#imgModal');
      if (imgEl) setImgWithFallback(imgEl, imgCandidates, imgPlaceholder);
      if (imgEl && modalEl) {
        imgEl.addEventListener('click', () => {
          const modalImg = modalEl.querySelector('.modal-img');
          if (modalImg) modalImg.src = imgEl.getAttribute('data-zoom-src') || imgEl.src;
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        });
      }

      window.OC?.clearSkeleton?.();
      return;
    }

    // ---------- dataset (existing behavior) ----------
    let dataObj = {};
    let modelArr = [];
    let benchmarkPayload = { benchmarks: [] };
    try{
      const [datasetRes, modelRes, benchmarkData] = await Promise.all([
        fetch('../data/datasets.json', { cache: 'no-cache' }).catch(() => null),
        fetch('../data/models.json', { cache: 'no-cache' }).catch(() => null),
        loadBenchmarkPayload()
      ]);
      dataObj = datasetRes?.ok ? await datasetRes.json() : await (await fetch('/open-construction/data/datasets.json', { cache: 'no-cache' })).json();
      const modelPayload = modelRes?.ok ? await modelRes.json() : await (await fetch('/open-construction/data/models.json', { cache: 'no-cache' })).json();
      modelArr = normalizeModelPayload(modelPayload);
      benchmarkPayload = benchmarkData || benchmarkPayload;
    }catch(e){
      if (typeof showErrorBanner === 'function') showErrorBanner('Could not load data/datasets.json for detail page.');
      console.error(e);
    }

    const ds = dataObj?.[id];
    if(!ds){
      root.innerHTML = '<div class="alert alert-warning">Dataset not found.</div>';
      window.OC?.clearSkeleton?.();
      return;
    }

    if (typeof incViews === 'function') incViews(id);

    window.OC?.setBadges?.({
      modality: safeText(ds.data_modality) === '—' ? '' : ds.data_modality,
      tasks: uniquePrettyTerms(ds.potential_tasks).join(', '),
      license: (safeText(ds.license) === '—') ? '' : ds.license
    });

    const imgSrc = `../assets/img/datasets/${encodeURIComponent(id)}.png`;
    const captionText = ds.sample_caption || ds.caption || 'Media from public websites are © their respective creators unless otherwise noted.';
    const noteText = safeText(ds.note);
    const noteInline = (noteText !== '—')
      ? `<div class="ds-note-inline"><span class="ds-note-label">Note:</span> ${escapeHtml(noteText)}</div>`
      : '';
    const datasetTaskList = uniquePrettyTerms(ds.potential_tasks);
    const datasetTaskFamilies = taskFamilies(ds.potential_tasks);
    const datasetApplicationList = uniquePrettyTerms(ds.applications || ds.application || ds.use_cases || ds.use_case);
    const datasetApplicationFamilies = applicationFamilies(ds.applications || ds.application || ds.use_cases || ds.use_case);
    const datasetClassList = normalizeList(ds.classes);
    const datasetModalityList = normalizeList(ds.data_modality);
    const datasetModalityFamilies = modalityFamilies(ds.data_modality);
    const datasetFocusDomains = domainFamilies([
      ds.id,
      ds.name,
      ds.paper,
      ds.paper_title,
      ...(normalizeList(ds.data_modality))
    ]);
    const datasetDomainFamilies = domainFamilies([
      ds.id,
      ds.name,
      ds.paper,
      ds.paper_title,
      ...(normalizeList(ds.classes)),
      ...(normalizeList(ds.annotation_types)),
      ...(normalizeList(ds.data_modality))
    ]);
    const datasetSampleLabel = datasetCountLabel(ds.data_modality);
    const datasetPaperTitle = safeText(ds.paper || ds.paper_title || ds.publication || '');
    const datasetPaperUrl = doiHref(ds.doi || '') || safeHref(ds.paper_url || ds.paper_link || ds.source || '');
    const datasetAccessUrl = safeHref(ds.access || '');
    const datasetCodeValue = ds.code || ds.code_url || '';
    const datasetCodeUrl = safeHref(datasetCodeValue);
    const quickFacts = [
      { label: 'Year', value: escapeHtml(safeText(ds.year ?? '')) },
      { label: datasetSampleLabel, value: escapeHtml(safeFormatInt(ds.num_images)) },
      { label: 'Classes', value: escapeHtml(safeFormatInt(ds.num_classes)) },
      { label: 'Primary Task', value: datasetTaskList.length ? escapeHtml(datasetTaskList[0]) : '—' },
      { label: 'Modality', value: datasetModalityList.length ? escapeHtml(datasetModalityList[0]) : '—' },
      { label: 'License', value: formatLicense(ds.license, ds) || '—' }
    ];
    quickFacts[3] = { label: 'Tasks', value: datasetTaskList.length ? linkedTaskChipLane(datasetTaskList) : '—' };
    quickFacts[4] = { label: 'Modalities', value: datasetModalityList.length ? chipLane(datasetModalityList) : '—' };

    function datasetHref(item){
      return `../datasets/detail.html?id=${encodeURIComponent(item.id || item.name || '')}`;
    }
    function modelHref(model){
      return `../models/details.html?id=${encodeURIComponent(model.id || model.title || '')}`;
    }
    function scoreOverlap(a, b){
      const setA = new Set(normalizeList(a).map(normKey));
      const setB = new Set(normalizeList(b).map(normKey));
      let score = 0;
      setA.forEach(v => { if (setB.has(v)) score += 1; });
      return score;
    }
    const relatedDatasets = Object.values(dataObj || {})
      .filter(other => other && other !== ds)
      .map(other => {
        const otherTaskList = uniquePrettyTerms(other.potential_tasks);
        const otherTaskFamilies = taskFamilies(other.potential_tasks || other.tasks || other.task);
        const sharedTasks = datasetTaskList.filter(task => otherTaskList.some(otherTask => normKey(otherTask) === normKey(task)));
        const taskScore = sharedTasks.length;
        const taskFamilyScore = scoreOverlap(datasetTaskFamilies, otherTaskFamilies);
        const applicationScore = scoreOverlap(datasetApplicationList, uniquePrettyTerms(other.applications || other.application || other.use_cases || other.use_case));
        const modalityScore = scoreOverlap(datasetModalityList, other.data_modality);
        const modalityFamilyScore = scoreOverlap(datasetModalityFamilies, modalityFamilies(other.data_modality || other.data_modalities));
        const classScore = Math.min(scoreOverlap(datasetClassList, other.classes), 2);
        const score = taskScore * 4 + taskFamilyScore * 2 + applicationScore * 2 + modalityFamilyScore * 2 + modalityScore + classScore;
        const hasStrongSignal =
          taskScore > 1 ||
          (taskScore > 0 && (applicationScore > 0 || modalityFamilyScore > 0 || modalityScore > 0 || classScore > 0)) ||
          (taskFamilyScore > 0 && modalityFamilyScore > 0);
        return hasStrongSignal ? { other, score, sharedTasks } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (b.other.year || 0) - (a.other.year || 0))
      .slice(0, 4);

    const relatedModels = modelArr
      .map(model => {
        const taskScore = scoreOverlap(datasetTaskList, uniquePrettyTerms(model.tasks || model.task || model.potential_tasks));
        const taskFamilyScore = scoreOverlap(datasetTaskFamilies, taskFamilies(model.tasks || model.task || model.potential_tasks));
        const applicationScore = scoreOverlap(datasetApplicationList, uniquePrettyTerms(model.applications || model.application));
        const applicationFamilyScore = scoreOverlap(datasetApplicationFamilies, applicationFamilies(model.applications || model.application));
        const modalityScore = scoreOverlap(datasetModalityList, model.modalities || model.modality || model.data_modalities);
        const modalityFamilyScore = scoreOverlap(datasetModalityFamilies, modalityFamilies(model.modalities || model.modality || model.data_modalities));
        const domainFamilyScore = scoreOverlap(datasetDomainFamilies, domainFamilies([
          model.id,
          model.title,
          model.abstract,
          ...(normalizeList(model.applications || model.application)),
          ...(normalizeList(model.modalities || model.modality || model.data_modalities))
        ]));
        const trainMatch = normalizeList(model.training_data || model.datasets || model.dataset).some(v => {
            const key = normKey(v);
            return key && [ds.id, ds.name].some(name => normKey(name) === key);
          });
        let penalty = 0;
        const modelDomains = domainFamilies([
          model.id,
          model.title,
          model.abstract,
          ...(normalizeList(model.applications || model.application)),
          ...(normalizeList(model.modalities || model.modality || model.data_modalities))
        ]);
        if (modelDomains.includes('bridge') && !datasetFocusDomains.includes('bridge')) penalty += 4;
        if (modelDomains.includes('dam') && !datasetFocusDomains.includes('dam')) penalty += 4;
        if (modelDomains.includes('road') && !datasetFocusDomains.includes('road')) penalty += 3;
        if (modelDomains.includes('pipe-mep') && !datasetFocusDomains.includes('pipe-mep')) penalty += 2;
        if (modelDomains.includes('damage-defect') && !datasetFocusDomains.includes('damage-defect')) penalty += 2;

        const score = (trainMatch ? 10 : 0) + taskScore * 4 + taskFamilyScore * 2 + applicationScore * 2 + applicationFamilyScore + modalityFamilyScore * 2 + modalityScore + domainFamilyScore * 3 - penalty;
        const hasStrongSignal =
          trainMatch ||
          (taskScore > 0 && modalityFamilyScore > 0) ||
          (taskScore > 0 && applicationScore > 0) ||
          (taskFamilyScore > 0 && modalityFamilyScore > 0 && domainFamilyScore > 0) ||
          (applicationScore > 0 && modalityFamilyScore > 0) ||
          (domainFamilyScore > 0 && modalityFamilyScore > 0);
        return hasStrongSignal ? { model, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (b.model.year || 0) - (a.model.year || 0))
      .slice(0, 3)
      .map(({ model }) => model);
    const benchmarkBoards = datasetBenchmarkBoards(benchmarkPayload, ds);

    const relatedItemsHtml = `
      <div class="row g-4">
        <div class="col-lg-6">
          <div class="detail-subcard h-100">
            <div class="detail-subhead">Related models</div>
            ${relatedModels.length ? relatedModels.map(model => `
              <a class="related-link" href="${modelHref(model)}">
                <span class="related-link-type">Model</span>
                <span class="related-link-title">${escapeHtml(model.title || model.id || 'Untitled model')}</span>
                <span class="related-link-meta">${escapeHtml(truncateText([uniquePrettyTerms(model.tasks || model.task)[0], uniquePrettyTerms(model.applications || model.application)[0]].filter(Boolean).join(' • ') || 'Likely compatible with this dataset', 90))}</span>
              </a>
            `).join('') : '<p class="text-muted small mb-0">No related models were identified from the current catalog.</p>'}
          </div>
        </div>
        <div class="col-lg-6">
          <div class="detail-subcard h-100">
            <div class="detail-subhead">Related datasets</div>
            ${relatedDatasets.length ? relatedDatasets.map(({ other, sharedTasks }) => `
              <a class="related-link" href="${datasetHref(other)}">
                <span class="related-link-type">Dataset</span>
                <span class="related-link-title">${escapeHtml(other.name || other.id || 'Untitled dataset')}</span>
                <span class="related-link-meta">${escapeHtml(truncateText([uniquePrettyTerms(other.potential_tasks || other.tasks || other.task)[0], normalizeList(other.data_modality)[0]].filter(Boolean).join(' • ') || 'Similar task coverage', 90))}</span>
              </a>
            `).join('') : '<p class="text-muted small mb-0">No related datasets were identified from the current catalog.</p>'}
          </div>
        </div>
      </div>
    `;

    const mainHero = `
      <style>
        .ds-card,.detail-section,.detail-subcard,.quickfact-card{ border:1px solid var(--oc-border); border-radius:16px; box-shadow:var(--oc-shadow); background:#fff; }
        .ds-img{ width:100%; height:auto; max-height:clamp(260px,48vh,560px); object-fit:contain; display:block; border-radius:10px; background:#fff; cursor:zoom-in; }
        .ds-cap{ line-height:1.25; }
        .ds-body{ padding:24px 28px; }
        .ds-figure{ border-bottom:1px solid var(--oc-border); background:#f8fbff; }
        .ds-title{ font-size:clamp(1.35rem,1.05rem + 1.2vw,2rem); font-weight:700; color:var(--oc-ink); margin-bottom:.25rem; }
        .ds-year{ color:var(--oc-sub); margin-bottom:1rem; }
        .ds-meta-line{ color:var(--oc-sub); margin-bottom:.9rem; line-height:1.45; }
        .meta{ margin:0; }
        .meta-row{ display:grid; grid-template-columns: 180px 1fr; gap:14px; padding:10px 0; align-items:start; }
        .meta-row + .meta-row{ border-top:1px solid var(--oc-border); }
        .meta-label{ color:var(--oc-sub); font-size:.92rem; white-space:nowrap; }
        .meta-val{ font-weight:600; line-height:1.4; }
        .chip-lane{ display:flex; flex-wrap:wrap; align-items:center; gap:.5rem .5rem; }
        .chip{ display:inline-flex; align-items:center; padding:.28rem .6rem; background:var(--oc-muted); border:1px solid var(--oc-border); border-radius:999px; font-weight:600; font-size:.82rem; color:var(--oc-text);}
        .btn-with-icon{ display:inline-flex; align-items:center; justify-content:center; gap:.45rem; }
        .btn-action-icon{ width:1rem; height:1rem; flex:0 0 auto; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
        .detail-section{ padding:1.25rem 1.35rem; margin-bottom:1rem; }
        .detail-kicker{ color:var(--oc-sub); font-size:.76rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; margin-bottom:.45rem; }
        .detail-heading{ font-size:1.1rem; font-weight:700; color:var(--oc-ink); margin:0 0 .85rem; }
        .section-nav a{ color:var(--oc-link); text-decoration:none; }
        .section-nav a:hover{ text-decoration:underline; }
        .quickfact-card .card-body{ padding:1.35rem 1.4rem; }
        .quickfact-grid{ display:grid; gap:0; }
        .quickfact-row{
          display:grid;
          gap:.16rem;
          padding:.55rem 0;
        }
        .quickfact-row + .quickfact-row{ border-top:1px solid var(--oc-border); }
        .quickfact-label{ color:var(--oc-sub); font-size:.8rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
        .quickfact-value{ font-weight:700; line-height:1.35; }
        .detail-subcard{ padding:1rem; }
        .detail-subhead{ font-size:.92rem; font-weight:700; color:var(--oc-ink); margin-bottom:.8rem; }
        .related-link{ display:flex; flex-direction:column; gap:.18rem; padding:.8rem 0; color:inherit; text-decoration:none; }
        .related-link + .related-link{ border-top:1px solid var(--oc-border); }
        .related-link:hover .related-link-title{ color:var(--oc-link); }
        .related-link-type{ color:var(--oc-sub); font-size:.75rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
        .related-link-title{ font-weight:700; color:var(--oc-ink); transition:color .15s ease; }
        .related-link-meta{ color:var(--oc-sub); font-size:.9rem; }
        .chip-link{ display:inline-flex; align-items:center; color:var(--oc-text); text-decoration:none !important; transition:background .15s ease, border-color .15s ease, color .15s ease; }
        .chip-link:hover, .chip-link:focus, .chip-link:active, .chip-link:visited{ text-decoration:none !important; }
        .chip-link:hover, .chip-link:focus{ color:var(--oc-link); border-color:#cfe0f3; background:#f5f9ff; }
        .ds-note-inline{ margin:0 .9rem .9rem; padding:.75rem .9rem; border-radius:12px; background:#fff8f0; border:1px solid #f2e1c8; color:#5e4a1a; font-size:.92rem; }
        .ds-note-label{ font-weight:700; margin-right:.25rem; }
        .license-modal{ border:0; border-radius:14px; box-shadow:0 22px 64px rgba(15,46,75,.2); overflow:hidden; }
        .license-modal .modal-header{ align-items:flex-start; border-bottom:1px solid var(--oc-border); padding:1.25rem 1.4rem 1.1rem; background:#fff; }
        .license-modal .modal-body{ padding:1.15rem 1.4rem 1.1rem; }
        .license-summary{ border:1px solid #d8e4ef; border-radius:10px; background:#f8fbff; margin-bottom:1.1rem; overflow:hidden; }
        .license-summary-row{ display:grid; grid-template-columns:132px 1fr; gap:1rem; padding:.82rem .95rem; align-items:center; }
        .license-summary-row + .license-summary-row{ border-top:1px solid var(--oc-border); }
        .license-summary-label{ color:var(--oc-sub); font-size:.8rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
        .license-summary-value{ display:flex; flex-wrap:wrap; align-items:center; gap:.55rem; min-width:0; }
        .license-inline{ display:inline-flex; flex-wrap:wrap; align-items:center; gap:.45rem; min-width:0; }
        .license-title-line{ display:inline-flex; align-items:center; min-width:0; }
        .license-icon-strip{ display:inline-flex; flex:0 0 auto; align-items:center; gap:.28rem; }
        .license-badge{ display:block; width:1.55rem; min-width:1.55rem; height:1.55rem; object-fit:contain; }
        .license-section{ margin-top:1rem; padding-top:1rem; border-top:1px solid var(--oc-border); }
        .license-summary + .license-section{ border-top:0; padding-top:0; }
        .license-section h3{ color:var(--oc-ink); font-size:.94rem; font-weight:700; margin:0 0 .55rem; }
        .license-list{ display:grid; gap:.68rem; margin:0; padding:0; color:var(--oc-text); list-style:none; }
        .license-list li{ display:grid; gap:.12rem; line-height:1.45; padding:0; }
        .license-list li.has-license-icon{ grid-template-columns:auto 1fr; column-gap:.62rem; align-items:flex-start; }
        .license-list-copy{ display:grid; gap:.12rem; min-width:0; }
        .license-list li.has-license-icon .license-badge{ margin-top:.06rem; width:1.45rem; min-width:1.45rem; height:1.45rem; }
        .license-list li strong{ color:var(--oc-ink); font-size:.9rem; }
        .license-list li span{ color:#334155; }
        .license-footer{ gap:.75rem; align-items:center; border-top:1px solid var(--oc-border); padding:1rem 1.4rem; background:#f8fafc; }
        .license-footer .form-check{ max-width:520px; }
        .license-footer .form-check-label{ color:#334155; font-size:.92rem; }
        @media (max-width: 991.98px){
          .meta-row{ grid-template-columns:1fr; gap:.35rem; }
          .ds-body{ padding:20px 18px; }
          .detail-section{ padding:1.05rem 1rem; }
          .detail-subcard{ padding:.9rem; }
          .quickfact-card .card-body,
          .section-nav.card .card-body,
          .card.border-0.shadow-sm .card-body{ padding:1rem; }
          .ds-note-inline{ margin:0 .75rem .75rem; }
        }
        @media (max-width: 575.98px){
          .ds-img{ max-height:240px; }
          .ds-cap{ padding-inline:1rem; }
          .quickfact-label{ font-size:.76rem; }
          .related-link{ padding:.7rem 0; }
          .license-summary-row{ grid-template-columns:1fr; gap:.2rem; }
          .license-footer{ align-items:stretch; }
          .license-footer .form-check{ width:100%; max-width:none; }
        }
      </style>

      <div class="ds-card mb-3 bg-white">
        <figure class="m-0 ds-figure">
          <img src="${imgSrc}" alt="${ds.name} preview"
               onerror="this.onerror=null;this.src='../assets/img/placeholder/placeholder.png';"
               class="ds-img" data-zoom-src="" data-oc-zoom="model">
          <figcaption class="text-muted small text-center py-2 ds-cap">${captionText}</figcaption>
          ${noteInline}
        </figure>
        <div class="ds-body">
          <h1 class="ds-title">${ds.name}</h1>
          <div class="ds-meta-line">${escapeHtml(
            [
              Array.isArray(ds.authors) ? ds.authors.join(', ') : safeText(ds.authors || ''),
              safeText(ds.year ?? '') !== '—' ? safeText(ds.year ?? '') : ''
            ].filter(Boolean).join(' • ') || 'Author and publication information not yet available'
          )}</div>
          <div class="chip-lane">
            ${chipLane(datasetModalityList).replace(/^<div class="chip-lane">|<\/div>$/g, '')}
            ${linkedTaskChipLane(datasetTaskList).replace(/^<div class="chip-lane">|<\/div>$/g, '')}
            ${bookmarkInlineHtml('dataset', ds.id || id || ds.name, ds.name || ds.id || 'Dataset')}
          </div>
        </div>
      </div>

      <section id="overview" class="detail-section">
        <div class="detail-kicker">Overview</div>
        <h2 class="detail-heading">What this dataset contains</h2>
        <dl class="meta mb-0">
          ${metaRow('Data · Classes', datasetCountSummary(ds))}
          ${metaRow('Modalities', chipLane(ds.data_modality))}
          ${metaRow('Tasks', linkedTaskChipLane(datasetTaskList))}
          ${metaRow('Classes', chipLane(ds.classes))}
          ${metaRow('Annotations', chipLane(ds.annotation_types))}
          ${metaRow('IFC / Source files', chipLane(ds.data_type || ds.file_types || ds.formats || ''))}
          ${metaRow('Resolution', safeText(ds.resolution))}
          ${metaRow('Location', chipLane(ds.geographical_location))}
        </dl>
      </section>

      <section id="access-and-usage" class="detail-section">
        <div class="detail-kicker">Access & Usage</div>
        <h2 class="detail-heading">How to use this dataset</h2>
        <dl class="meta mb-0">
          ${metaRow('Associated paper', datasetPaperTitle !== '—' ? (datasetPaperUrl ? `<a href="${datasetPaperUrl}" target="_blank" rel="noopener">${escapeHtml(datasetPaperTitle)}</a>` : escapeHtml(datasetPaperTitle)) : '—')}
          ${metaRow('Source status', escapeHtml(formatSourceStatus(ds.source_status)))}
          ${metaRow('DOI', ds.doi ? formatDoi(ds.doi) : '—')}
          ${metaRow('Dataset source', datasetAccessUrl ? `<a href="${datasetAccessUrl}" target="_blank" rel="noopener" data-license-gate>${escapeHtml(ds.access)}</a>` : '—')}
          ${metaRow('Code source', datasetCodeUrl ? `<a href="${datasetCodeUrl}" target="_blank" rel="noopener">${escapeHtml(datasetCodeValue)}</a>` : '—')}
          ${metaRow('Blog', ds.blog_url ? `<a href="${safeHref(ds.blog_url)}" target="_blank" rel="noopener">${escapeHtml(ds.blog_url)}</a>` : '—')}
          ${metaRow('License', formatLicense(ds.license, ds) || '—')}
          ${metaRow('Notes', noteText !== '—' ? escapeHtml(noteText) : '—')}
        </dl>
      </section>

      <section id="related-resources" class="detail-section">
        <div class="detail-kicker">Related Resources</div>
        <h2 class="detail-heading">Keep exploring from here</h2>
        ${relatedItemsHtml}
      </section>

      <div class="modal fade" id="imgModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-xl">
          <div class="modal-content border-0">
            <div class="modal-body text-center p-2">
              <img src="" alt="Full preview" class="modal-img" style="max-height:calc(100vh - 7rem); width:auto; max-width:100%; object-fit:contain;">
            </div>
          </div>
        </div>
      </div>
    `;

    const doiBlock = ds.doi ? `<div class="mb-2"><span class="text-muted">DOI:</span> ${formatDoi(ds.doi)}</div>` : '';
    const licenseBlock = ds.license ? `<div class="mb-0"><span class="text-muted">License:</span> ${formatLicense(ds.license, ds)}</div>` : '';
    const authorBlock = authorListHtml(ds.authors, ds.author_urls || ds.authors_url || ds.author_links);
    // Automatic publication badges when identifier exists (doi.org DOI, raw DOI, arXiv URL/ID, PMID, pub.id)
    const pubBadgesBlock = publicationBadgesHtml(ds.doi, {
      altmetric: (ds.altmetric !== undefined) ? ds.altmetric : undefined,
      dimensions: (ds.dimensions !== undefined) ? ds.dimensions : undefined
    });

    const sidebar = `
      <div class="position-sticky" style="top:88px">
        <div class="quickfact-card mb-3">
          <div class="card-body" style="padding:1.4rem 1.5rem;">
            <h2 class="h6 text-uppercase text-muted mb-3">Quick Facts</h2>
            <div class="quickfact-grid">
              ${quickFacts.map(item => `
                <div class="quickfact-row">
                  <div class="quickfact-label">${escapeHtml(item.label)}</div>
                  <div class="quickfact-value">${item.value}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-muted mb-3">Dataset Access</h2>
            <div class="d-grid gap-2">
              ${datasetAccessUrl ? `<a class="btn btn-primary btn-sm btn-with-icon" href="${datasetAccessUrl}" target="_blank" rel="noopener" data-license-gate>${actionButtonContent('access', 'Access dataset')}</a>` : ''}
              ${datasetPaperUrl ? `<a class="btn btn-outline-secondary btn-sm btn-with-icon" href="${datasetPaperUrl}" target="_blank" rel="noopener">${actionButtonContent('paper', 'View paper')}</a>` : ''}
              ${ds.blog_url ? `<a class="btn btn-outline-secondary btn-sm" href="${safeHref(ds.blog_url)}" target="_blank" rel="noopener">Blog</a>` : ''}
            </div>
          </div>
        </div>

        ${benchmarkLinksCardHtml(benchmarkBoards)}

        ${shareCardHtml(ds.name || ds.id || 'Dataset')}

        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body section-nav">
            <h2 class="h6 text-uppercase text-muted mb-3">On This Page</h2>
            <div class="d-grid gap-2 small">
              <a href="#overview">Overview</a>
              <a href="#access-and-usage">Access & Usage</a>
              <a href="#related-resources">Related Resources</a>
            </div>
          </div>
        </div>

        ${(doiBlock || licenseBlock) ? `
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-muted mb-3">Reference</h2>
            <div class="small">${doiBlock}${licenseBlock}</div>
          </div>
        </div>` : ''}

        ${authorBlock ? `
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
              <h2 class="h6 text-uppercase text-muted mb-3">Authors</h2>
              <div class="small">${authorBlock}</div>
            </div>
          </div>` : ''}

        ${pubBadgesBlock ? `
          <div class="card border-0 shadow-sm">
            <div class="card-body">
			<h2 class="h6 text-uppercase text-muted mb-2">Citation &amp; Attention</h2>
			<div class="text-muted small mb-2">
			  Data source:
			  <a href="https://www.altmetric.com" target="_blank" rel="noopener">Altmetric</a> and
			  <a href="https://www.dimensions.ai" target="_blank" rel="noopener">Dimensions</a>
			  <span class="ms-1">(records may be incomplete and coverage varies by venue and year)</span>
			</div>
              ${pubBadgesBlock}
            </div>
          </div>` : ''}
      </div>
    `;

    root.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-8">${mainHero}</div>
        <div class="col-lg-4">${sidebar}</div>
      </div>
      ${datasetLicenseModalHtml(ds)}
    `;

    const imgEl = root.querySelector('.ds-img');
    const modalEl = root.querySelector('#imgModal');
    const shareBtn = root.querySelector('[data-oc-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const original = shareBtn.querySelector('.btn-label')?.textContent || shareBtn.textContent;
        const label = shareBtn.getAttribute('data-share-label') || ds.name || 'Dataset';
        const result = await shareResourceLink({
          title: label,
          text: `OpenConstruction resource: ${label}`
        });
        if (result === 'cancelled') return;
        setActionButtonLabel(shareBtn, result === 'shared' ? 'Shared' : (result === 'copied' ? 'Link Copied' : 'Copy Failed'));
        window.setTimeout(() => { setActionButtonLabel(shareBtn, original); }, 1800);
      });
    }
    wireDatasetLicenseGate(root);
    window.OCBookmark?.mount(root);
    if (imgEl && modalEl) {
      imgEl.addEventListener('click', () => {
        const modalImg = modalEl.querySelector('.modal-img');
        if (modalImg) modalImg.src = imgEl.getAttribute('data-zoom-src') || imgEl.src;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      });
    }

    window.OC?.clearSkeleton?.();
  }catch(e){
    console.error(e);
    root.innerHTML = '<div class="alert alert-danger">Failed to load details.</div>';
    window.OC?.clearSkeleton?.();
  }
}

document.addEventListener('DOMContentLoaded', initDetail);

/* ---------- model image fallback ---------- */
const OC_MODEL_IMAGE_EXTS = ['png','jpg','jpeg','gif','webp'];

function getModelImageCandidates(model, id, codeUrl) {
  const candidates = [];
  const addValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }
    if (typeof value === 'object') {
      addValue(value.url || value.src || value.image || value.image_url || value.thumbnail || value.thumb);
      return;
    }
    expandModelImageCandidate(value).forEach(src => candidates.push(src));
  };

  [
    model?.image,
    model?.image_url,
    model?.thumbnail,
    model?.thumb,
    model?.preview_image,
    model?.cover_image,
    model?.media
  ].forEach(addValue);

  const repoSlug = repoSlugFromUrl(codeUrl || model?.code_url || model?.code || '');
  if (repoSlug) addValue(`../assets/img/models/${encodeURIComponent(repoSlug)}`);
  addValue(`../assets/img/models/${encodeURIComponent(model?.id || id)}`);

  return uniqueStrings(candidates);
}

function expandModelImageCandidate(value) {
  const src = normalizeModelImagePath(value);
  if (!src) return [];
  if (/^https?:\/\//i.test(src)) return [src];
  if (/\.(png|jpe?g|gif|webp)([?#].*)?$/i.test(src)) return [src];
  return OC_MODEL_IMAGE_EXTS.map(ext => `${src}.${ext}`);
}

function normalizeModelImagePath(value) {
  const raw = String(value || '').trim();
  if (!raw || /^(javascript|data):/i.test(raw)) return '';

  const absolute = safeHref(raw);
  if (absolute) return absolute;

  const path = raw.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!path) return '';
  if (path.startsWith('../') || path.startsWith('/')) return encodeURI(path);
  if (path.startsWith('site/assets/')) return encodeURI(`../${path.slice(5)}`);
  if (path.startsWith('assets/')) return encodeURI(`../${path}`);
  if (path.startsWith('img/models/')) return encodeURI(`../assets/${path}`);
  if (!path.includes('/')) return encodeURI(`../assets/img/models/${path}`);
  return encodeURI(path);
}

function repoSlugFromUrl(url) {
  const safeUrl = safeHref(url);
  if (!safeUrl) return '';
  try {
    const u = new URL(safeUrl);
    if (!/github\.com$/i.test(u.hostname)) return '';
    const parts = u.pathname.split('/').filter(Boolean);
    return parts.length >= 2 ? decodeURIComponent(parts[1]).replace(/\.git$/i, '') : '';
  } catch {
    return '';
  }
}

function uniqueStrings(values) {
  const seen = new Set();
  return values.filter(value => {
    const key = String(value || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function setImgWithFallback(imgEl, sources, placeholderPath) {
  const baseCandidates = Array.isArray(sources)
    ? sources.filter(Boolean)
    : expandModelImageCandidate(sources);
  const candidates = uniqueStrings([
    ...baseCandidates,
    placeholderPath
  ]);
  let index = 0;

  const applyCandidate = () => {
    const src = candidates[index] || placeholderPath || '';
    if (!src) return;
    imgEl.src = src;
    imgEl.setAttribute('data-zoom-src', src);
  };

  imgEl.onerror = () => {
    index += 1;
    if (index < candidates.length) {
      applyCandidate();
      return;
    }
    imgEl.onerror = null;
    if (placeholderPath && imgEl.src !== placeholderPath) {
      imgEl.src = placeholderPath;
      imgEl.setAttribute('data-zoom-src', placeholderPath);
    }
  };

  applyCandidate();
}
