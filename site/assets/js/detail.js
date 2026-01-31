/* ==============================
   Dataset Detail Page Script
   ============================== */

/* ========== helpers ========== */

// Normalize DOI values to the bare DOI string (e.g., "10.xxxx/xxxx")
function normalizeDoi(doiVal){
  if (!doiVal && doiVal !== 0) return '';
  let s = String(doiVal).trim();
  if (!s) return '';
  s = s.replace(/^doi\s*:\s*/i, '').trim();
  // If it's a URL, try to extract from /<doi>
  try{
    const u = new URL(s);
    if (/doi\.org$/i.test(u.hostname) || /dx\.doi\.org$/i.test(u.hostname)) {
      s = u.pathname.replace(/^\/+/, '').trim();
    } else if (u.pathname && u.pathname.length > 1 && /10\./.test(u.pathname)) {
      // Sometimes DOIs are embedded in paths on publisher sites; keep only from 10.x
      const m = u.href.match(/(10\.[0-9]{4,9}\/[^\s?#]+)/);
      if (m) s = m[1];
    }
  }catch{ /* not a URL */ }
  // Final extraction safety
  const m2 = s.match(/(10\.[0-9]{4,9}\/[^\s?#]+)/);
  return (m2 ? m2[1] : s).trim();
}

function doiHref(doiVal){
  const doi = normalizeDoi(doiVal);
  if (!doi) return null;
  return `https://doi.org/${doi}`;
}

function formatDoi(doiVal){
  const doi = normalizeDoi(doiVal);
  const href = doiHref(doiVal);
  if (!doi || !href) return '—';
  return `<a href="${href}" target="_blank" rel="noopener">${escapeHtml(doi)}</a>`;
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
    const u = urlByName.get(name);
    const safeUrl = safeHref(u);
    return `<div class="mb-1">${safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener">${safeName}</a>` : safeName}</div>`;
  }).join('');
}

/* ====== publication metrics (Altmetric + Dimensions) ====== */

function ensureScriptOnce(src, flag, onload){
  if (window[flag]) { if (typeof onload === 'function') onload(); return; }
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  s.onload = () => { window[flag] = true; if (typeof onload === 'function') onload(); };
  document.body.appendChild(s);
}

function initAltmetric(){
  // embed.js exposes _altmetric_embed_init in most cases
  if (typeof window._altmetric_embed_init === 'function') {
    try { window._altmetric_embed_init(); } catch {}
  } else if (window.Altmetric && typeof window.Altmetric.embed === 'function') {
    try { window.Altmetric.embed(); } catch {}
  }
}

function initDimensions(){
  // badge.js exposes __dimensions_embed.addBadges()
  const d = window.__dimensions_embed;
  if (d && typeof d.addBadges === 'function') {
    try { d.addBadges(); } catch {}
  }
}

function publicationMetricsCardHtml(doiRaw){
  const doi = normalizeDoi(doiRaw);
  if (!doi) return '';
  // Always show Dimensions. Altmetric will auto-hide if no mentions.
  return `
    <div class="card border-0 shadow-sm oc-publication-metrics mt-3">
      <div class="card-body">
        <h2 class="h6 text-uppercase text-muted mb-3">Publication Metrics</h2>

        <div class="oc-dimensions-wrap mb-3">
          <div class="small text-muted mb-1">Dimensions (citations)</div>
          <span class="__dimensions_badge_embed__" data-doi="${doi}" data-style="small_rectangle"></span>
        </div>

        <div class="oc-altmetric-wrap mb-3">
          <div class="small text-muted mb-1">Altmetric (online attention)</div>
          <span class="altmetric-embed" data-doi="${doi}" data-badge-type="donut" data-hide-no-mentions="true"></span>
        </div>

        <div class="small text-muted">
          Metrics reflect tracked citations and online mentions and may not capture all scholarly contributions.
        </div>
      </div>
    </div>
  `;
}

function mountAndInitPublicationBadges(scope){
  const root = scope || document;
  // Load scripts once, then init. These scripts scan the DOM for embeds.
  ensureScriptOnce('https://badge.dimensions.ai/badge.js', '__ocDimensionsLoaded', () => initDimensions());
  ensureScriptOnce('https://d1bxh8uas1mnw7.cloudfront.net/assets/embed.js', '__ocAltmetricLoaded', () => initAltmetric());

  // Re-init a few times because cards are injected dynamically and scripts may load after render
  setTimeout(() => { initDimensions(); initAltmetric(); }, 300);
  setTimeout(() => { initDimensions(); initAltmetric(); }, 1200);
}

/* Defensive cleanup: remove Altmetric wrappers when there are no mentions (so no '?' donuts and no empty labels). */
function cleanupPublicationBadges(scope){
  const root = scope || document;

  const prune = () => {
    // Altmetric: remove wrappers that end up hidden (data-hide-no-mentions=true).
    root.querySelectorAll('.oc-altmetric-wrap').forEach(wrap => {
      const embed = wrap.querySelector('.altmetric-embed');
      if (!embed) { wrap.remove(); return; }
      const style = window.getComputedStyle(embed);
      const hidden = (style.display === 'none' || style.visibility === 'hidden' || embed.offsetHeight < 8 || embed.offsetWidth < 8);
      if (hidden) wrap.remove();
    });

    // If publication metrics card has no embeds left, remove it.
    root.querySelectorAll('.oc-publication-metrics').forEach(card => {
      const hasAny = card.querySelector('.oc-altmetric-wrap .altmetric-embed, .oc-dimensions-wrap .__dimensions_badge_embed__');
      if (!hasAny) card.remove();
    });
  };

  setTimeout(prune, 800);
  setTimeout(prune, 2200);
  setTimeout(prune, 5000);
}

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

function formatLicense(licVal){
  const norm = safeText(licVal);
  if (norm === '—') return '';
  const key = String(licVal).trim().toUpperCase();
  const licenseMap = {
    'APACHE-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'CC0': 'https://creativecommons.org/public-domain/cc0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC-BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'MIT': 'https://opensource.org/licenses/MIT',
    'ODC-BY': 'https://opendatacommons.org/licenses/by/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC-ND 3.0': 'https://creativecommons.org/licenses/by-nc-nd/3.0/',
    'AGPL 3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'MIT License with Commons Clause Restriction':'https://github.com/zhu-xlab/GlobalBuildingAtlas/blob/main/LICENSE',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en'
  };
  if (licenseMap[key]) {
    return `<a href="${licenseMap[key]}" target="_blank" rel="noopener">${norm}</a>`;
  }
  return norm;
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

async function initDetail(){
  const type = getDetailType();

  const id = decodeURIComponent((typeof getParam === 'function'
    ? getParam('id')
    : new URL(window.location.href).searchParams.get('id')) || '');

  const root = document.getElementById('detailRoot');
  if (!root) return;

  try{
    if (type === 'model') {
      const res = await fetch('../data/models.json', { cache: 'no-cache' });
      const payload = res.ok ? await res.json() : await (await fetch('/open-construction/data/models.json', { cache: 'no-cache' })).json();
      const arr = normalizeModelPayload(payload);
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
        tasks: Array.isArray(tasks) ? tasks.join(', ') : String(tasks || '').trim(),
        applications: Array.isArray(applications) ? applications.join(', ') : String(applications || '').trim(),
        license
      });

      const modelTitle = m.title || m.name || 'Untitled';
      const year = (m.year !== undefined && m.year !== null) ? m.year : '—';

      const imgBase = `../assets/img/models/${encodeURIComponent(m.id || id)}`;
      const imgPlaceholder = `../assets/img/models/_placeholder.png`;
      const captionText = m.sample_caption || m.caption || 'Preview';

      const mainHero = `
        <style>
          .ds-card{ border:1px solid var(--oc-border); border-radius:16px; box-shadow:var(--oc-shadow); }
          .ds-img{ width:100%; height:auto; max-height:clamp(260px,48vh,560px); object-fit:contain; display:block; border-radius:10px; background:#fff; cursor:zoom-in; }
          .ds-cap{ line-height:1.25; }
          .ds-body{ padding:24px 28px; }
          .ds-title{ font-size:clamp(1.35rem,1.05rem + 1.2vw,2rem); font-weight:800; color:var(--oc-ink); margin-bottom:.25rem; }
          .ds-year{ color:var(--oc-sub); margin-bottom:1rem; }
          .meta{ margin:0; }
          .meta-row{ display:grid; grid-template-columns: 180px 1fr; gap:14px; padding:10px 0; align-items:start; }
          .meta-row + .meta-row{ border-top:1px solid var(--oc-border); }
          .meta-label{ color:var(--oc-sub); font-size:.92rem; white-space:nowrap; }
          .meta-val{ font-weight:600; line-height:1.4; }
          .chip-lane{ display:flex; flex-wrap:wrap; gap:.5rem .5rem; }
          .chip{ display:inline-flex; align-items:center; padding:.28rem .6rem; background:var(--oc-muted); border:1px solid var(--oc-border); border-radius:999px; font-weight:600; font-size:.82rem; color:var(--oc-text);}
          .abs{ white-space:pre-wrap; }
        </style>

        <div class="ds-card mb-3 bg-white">
          <div class="row g-0">
            <div class="col-lg-6">
              <figure class="m-0 ds-figure">
                <img src="" data-oc-img="model" alt="${escapeHtml(modelTitle)} preview"
                     class="ds-img" data-zoom-src="" data-oc-zoom="model">
                <figcaption class="text-muted small text-center py-2 ds-cap">${escapeHtml(captionText)}</figcaption>
              </figure>
            </div>
            <div class="col-lg-6">
              <div class="ds-body">
                <h1 class="ds-title">${escapeHtml(modelTitle)}</h1>
                <div class="ds-year">(${escapeHtml(year)})</div>
                <dl class="meta">
                  ${metaRow('Modalities', chipLane(modality))}
                  ${metaRow('Tasks', chipLane(tasks))}
                  ${metaRow('Applications', chipLane(applications))}
                  ${metaRow('Framework', escapeHtml(safeText(m.framework || m.library || m.backbone || '')))}
                  ${metaRow('Parameters', escapeHtml(safeText(m.parameters || m.num_parameters || '')))}
                  ${metaRow('Training Data', chipLane(m.training_data || m.datasets || m.dataset || ''))}
                  ${metaRow('Abstract', m.abstract ? `<div class="abs small">${escapeHtml(m.abstract)}</div>` : '')}
                </dl>
              </div>
            </div>
          </div>
        </div>

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

      const doiBlock = m.doi ? `<div class="mb-2"><span class="text-muted">DOI:</span> ${formatDoi(m.doi)}</div>` : '';
      const licenseBlock = m.license ? `<div class="mb-0"><span class="text-muted">License:</span> ${formatLicense(m.license)}</div>` : '';
      const authorBlock = authorListHtml(m.authors, m.author_urls || m.authors_url || m.author_links);

      const paperUrl = m.paper_url || m.paper || '';
      const codeUrl  = m.code_url  || m.code  || '';
      const doiNorm = normalizeDoi(m.doi || m.doi_url || m.doiUrl || (m.publication && m.publication.doi));
      const doiUrl   = doiNorm ? `https://doi.org/${doiNorm}` : '';

      const sidebar = `
        <div class="position-sticky" style="top:88px">
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
              <h2 class="h6 text-uppercase text-muted mb-3">Model Links</h2>
              <div class="d-grid gap-2">
                ${paperUrl ? `<a class="btn btn-primary btn-sm" href="${paperUrl}" target="_blank" rel="noopener">View Paper</a>` : ''}
                ${codeUrl ? `<a class="btn btn-outline-secondary btn-sm" href="${codeUrl}" target="_blank" rel="noopener">View Code</a>` : ''}
                ${doiUrl ? `<a class="btn btn-outline-secondary btn-sm" href="${doiUrl}" target="_blank" rel="noopener">DOI</a>` : ''}
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
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <h2 class="h6 text-uppercase text-muted mb-3">Authors</h2>
              <div class="small">${authorBlock}</div>
            </div>
          </div>` : ''}
          ${doiNorm ? publicationMetricsCardHtml(doiNorm) : ''}

        </div>
      `;

      root.innerHTML = `
        <div class="row g-3">
          <div class="col-lg-9">${mainHero}</div>
          <div class="col-lg-3">${sidebar}</div>
        </div>
      `;

      mountAndInitPublicationBadges(root);

      cleanupPublicationBadges(root);

      const imgEl = root.querySelector('.ds-img');
      const modalEl = root.querySelector('#imgModal');
    // ensure model thumbnails work for .png/.jpg/.jpeg/.gif/.webp
    if (imgEl) setImgWithFallback(imgEl, imgBase, imgPlaceholder);
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
    try{
      const res = await fetch('../data/datasets.json', { cache: 'no-cache' });
      dataObj = res.ok ? await res.json() : await (await fetch('/open-construction/data/datasets.json', { cache: 'no-cache' })).json();
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
      tasks: (Array.isArray(ds.potential_tasks) ? ds.potential_tasks.join(', ') : String(ds.potential_tasks || '')).trim(),
      license: (safeText(ds.license) === '—') ? '' : ds.license
    });

    const imgSrc = `../assets/img/datasets/${encodeURIComponent(id)}.png`;
    const captionText = ds.sample_caption || ds.caption || 'Sample from the dataset';
    const noteText = safeText(ds.note);
    const noteInline = (noteText !== '—')
      ? `<div class="ds-note-inline"><span class="ds-note-label">Note:</span> ${escapeHtml(noteText)}</div>`
      : '';

    const mainHero = `
      <style>
        .ds-card{ border:1px solid var(--oc-border); border-radius:16px; box-shadow:var(--oc-shadow); }
        .ds-img{ width:100%; height:auto; max-height:clamp(260px,48vh,560px); object-fit:contain; display:block; border-radius:10px; background:#fff; cursor:zoom-in; }
        .ds-cap{ line-height:1.25; }
        .ds-body{ padding:24px 28px; }
        .ds-title{ font-size:clamp(1.35rem,1.05rem + 1.2vw,2rem); font-weight:800; color:var(--oc-ink); margin-bottom:.25rem; }
        .ds-year{ color:var(--oc-sub); margin-bottom:1rem; }
        .meta{ margin:0; }
        .meta-row{ display:grid; grid-template-columns: 180px 1fr; gap:14px; padding:10px 0; align-items:start; }
        .meta-row + .meta-row{ border-top:1px solid var(--oc-border); }
        .meta-label{ color:var(--oc-sub); font-size:.92rem; white-space:nowrap; }
        .meta-val{ font-weight:600; line-height:1.4; }
        .chip-lane{ display:flex; flex-wrap:wrap; gap:.5rem .5rem; }
        .chip{ display:inline-flex; align-items:center; padding:.28rem .6rem; background:var(--oc-muted); border:1px solid var(--oc-border); border-radius:999px; font-weight:600; font-size:.82rem; color:var(--oc-text);}
      </style>

      <div class="ds-card mb-3 bg-white">
        <div class="row g-0">
          <div class="col-lg-6">
            <figure class="m-0 ds-figure">
              <img src="${imgSrc}" alt="${ds.name} preview"
                   onerror="this.onerror=null;this.src='../assets/img/placeholder.png';"
                   class="ds-img" data-zoom-src="" data-oc-zoom="model">
              <figcaption class="text-muted small text-center py-2 ds-cap">${captionText}</figcaption>
              ${noteInline}
            </figure>
          </div>
          <div class="col-lg-6">
            <div class="ds-body">
              <h1 class="ds-title">${ds.name}</h1>
              <div class="ds-year">(${ds.year ?? '—'})</div>
              <dl class="meta">
                ${metaRow('Data · Classes', (ds.num_images || ds.num_classes) ? `${safeFormatInt(ds.num_images)} · ${safeFormatInt(ds.num_classes)}` : '')}
                ${metaRow('Modality', chipLane(ds.data_modality))}
                ${metaRow('Annotations', chipLane(ds.annotation_types))}
                ${metaRow('Resolution', safeText(ds.resolution))}
                ${metaRow('Location', chipLane(ds.geographical_location))}
                ${metaRow('Associated Tasks', chipLane(ds.potential_tasks))}
                ${metaRow('Classes', chipLane(ds.classes))}
              </dl>
            </div>
          </div>
        </div>
      </div>

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
    const licenseBlock = ds.license ? `<div class="mb-0"><span class="text-muted">License:</span> ${formatLicense(ds.license)}</div>` : '';
    const authorBlock = authorListHtml(ds.authors, ds.author_urls || ds.authors_url || ds.author_links);

    const sidebar = `
      <div class="position-sticky" style="top:88px">
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-muted mb-3">Dataset Access</h2>
            <div class="d-grid gap-2">
              ${ds.access ? `<a class="btn btn-primary btn-sm" href="${ds.access}" target="_blank" rel="noopener">Download dataset</a>` : ''}
              ${ds.doi ? `<a class="btn btn-outline-secondary btn-sm" href="${ds.doi}" target="_blank" rel="noopener">View paper</a>` : ''}
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
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-muted mb-3">Authors</h2>
            <div class="small">${authorBlock}</div>
          </div>
        </div>` : ''}
      </div>
    `;

    root.innerHTML = `
      <div class="row g-3">
        <div class="col-lg-9">${mainHero}</div>
        <div class="col-lg-3">${sidebar}</div>
      </div>
    `;

    mountAndInitPublicationBadges(root);

      cleanupPublicationBadges(root);

    const imgEl = root.querySelector('.ds-img');
    const modalEl = root.querySelector('#imgModal');
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

/* ---------- model image fallback (png/jpg/jpeg/gif/webp) ---------- */
function setImgWithFallback(imgEl, basePath, placeholderPath) {
  const exts = ['png','jpg','jpeg','gif','webp'];
  imgEl.dataset.base = basePath;
  imgEl.dataset.placeholder = placeholderPath || '';
  imgEl.dataset.extIndex = imgEl.dataset.extIndex || '0';
  // start with png
  imgEl.src = `${basePath}.${exts[0]}`;
  imgEl.onerror = () => {
    const i = parseInt(imgEl.dataset.extIndex || '0', 10) + 1;
    imgEl.dataset.extIndex = String(i);
    if (i < exts.length) {
      imgEl.src = `${basePath}.${exts[i]}`;
    } else if (imgEl.dataset.placeholder) {
      imgEl.onerror = null;
      imgEl.src = imgEl.dataset.placeholder;
    }
  };
}
