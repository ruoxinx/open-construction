/* ==============================
   Dataset Detail Page Script
   ============================== */

/* ========== helpers ========== */
function normalizeDoi(doiVal){
  if (!doiVal) return '';
  let s = String(doiVal).trim();
  if (!s) return '';
  s = s.replace(/^doi\s*:\s*/i, '');
  s = s.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  s = s.replace(/^www\.(dx\.)?doi\.org\//i, '');
  return s.trim();
}

function ensureScript(src, flag, onloadCb){
  if (window[flag]) { onloadCb && onloadCb(); return; }
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  s.onload = () => { window[flag] = true; onloadCb && onloadCb(); };
  s.onerror = () => {};
  document.body.appendChild(s);
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

/* ==============================
   Publication metrics badges
   ============================== */

function getPublicationMeta(obj){
  if (!obj) return null;
  const pub = (obj.publication && typeof obj.publication === 'object') ? obj.publication : {};
  const doi = normalizeDoi(pub.doi || obj.doi || '');
  if (!doi) return null;

  // Auto-enable by default when DOI exists; allow explicit disable via false.
  const altmetric = (pub.altmetric ?? obj.altmetric);
  const dimensions = (pub.dimensions ?? obj.dimensions);

  return { doi, altmetric, dimensions };
}

function publicationMetricsHtml(pub){
  if (!pub || !pub.doi) return '';
  const showAlt = (pub.altmetric !== false);
  const showDim = (pub.dimensions !== false);
  if (!showAlt && !showDim) return '';

  return `
    <div class="mt-3 pt-3 border-top">
      <h3 class="h6 text-uppercase text-muted mb-2">Publication metrics</h3>
      <div class="d-flex flex-wrap gap-3 align-items-start" id="publicationMetrics">
        ${showAlt ? `
          <div style="min-width: 160px;">
            <div class="small text-muted mb-1">Altmetric (online attention)</div>
            <span class="altmetric-embed"
                  data-doi="${escapeHtml(pub.doi)}"
                  data-badge-type="donut"
                  data-hide-no-mentions="true"></span>
          </div>
        ` : ''}

        ${showDim ? `
          <div style="min-width: 200px;">
            <div class="small text-muted mb-1">Dimensions (citations)</div>
            <span class="__dimensions_badge_embed__"
                  data-doi="${escapeHtml(pub.doi)}"
                  data-style="small_rectangle"></span>
          </div>
        ` : ''}
      </div>

      <div class="small text-muted mt-2">
        Metrics reflect tracked citations and online mentions and may not capture all scholarly contributions.
      </div>
    </div>
  `;
}

function initPublicationEmbeds(){
  try {
    if (window.__dimensions_embed && typeof window.__dimensions_embed.addBadges === 'function') {
      window.__dimensions_embed.addBadges();
    }
  } catch {}

  try {
    if (typeof window._altmetric_embed_init === 'function') window._altmetric_embed_init();
    if (window.Altmetric && typeof window.Altmetric.embed === 'function') window.Altmetric.embed();
  } catch {}
}

function cleanupAltmetricNoMentions(){
  document.querySelectorAll('.altmetric-embed').forEach(node => {
    const style = window.getComputedStyle(node);
    const isHidden = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
    const empty = !node.innerHTML || node.innerHTML.trim() === '';
    if (isHidden || empty) node.remove();
  });

  const wrap = document.getElementById('publicationMetrics');
  if (wrap && !wrap.querySelector('.altmetric-embed, .__dimensions_badge_embed__')) {
    const parent = wrap.closest('.mt-3');
    if (parent) parent.style.display = 'none';
  }
}

function loadPublicationScriptsIfNeeded(pub){
  if (!pub || !pub.doi) return;
  const wantAlt = (pub.altmetric !== false);
  const wantDim = (pub.dimensions !== false);

  if (wantAlt) {
    ensureScript('https://d1bxh8uas1mnw7.cloudfront.net/assets/embed.js', '__ocAltmetricLoaded', initPublicationEmbeds);
  }
  if (wantDim) {
    ensureScript('https://badge.dimensions.ai/badge.js', '__ocDimensionsLoaded', initPublicationEmbeds);
  }

  // Re-init after scripts settle + remove hidden Altmetric
  setTimeout(() => {
    initPublicationEmbeds();
    cleanupAltmetricNoMentions();
  }, 1200);
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
        loadPublicationScriptsIfNeeded(pub);
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

      const pub = getPublicationMeta(m);
      const doiBlock = pub?.doi ? `<div class="mb-2"><span class="text-muted">DOI:</span> ${formatDoi(pub.doi)}</div>` : '';
      const licenseBlock = m.license ? `<div class="mb-0"><span class="text-muted">License:</span> ${formatLicense(m.license)}</div>` : '';
      const authorBlock = authorListHtml(m.authors, m.author_urls || m.authors_url || m.author_links);

      const paperUrl = m.paper_url || m.paper || '';
      const codeUrl  = m.code_url  || m.code  || '';
      const doiUrl   = pub?.doi ? doiHref(pub.doi) : '';
      const metricsBlock = publicationMetricsHtml(pub);

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

          ${(authorBlock || metricsBlock) ? `
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              ${authorBlock ? `<h2 class="h6 text-uppercase text-muted mb-3">Authors</h2><div class="small">${authorBlock}</div>` : ''}
              ${metricsBlock || ''}
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

      loadPublicationScriptsIfNeeded(pub);
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

    const pub = getPublicationMeta(ds);
    const doiBlock = pub?.doi ? `<div class="mb-2"><span class="text-muted">DOI:</span> ${formatDoi(pub.doi)}</div>` : '';
    const licenseBlock = ds.license ? `<div class="mb-0"><span class="text-muted">License:</span> ${formatLicense(ds.license)}</div>` : '';
    const authorBlock = authorListHtml(ds.authors, ds.author_urls || ds.authors_url || ds.author_links);
    const metricsBlock = publicationMetricsHtml(pub);

    const sidebar = `
      <div class="position-sticky" style="top:88px">
        <div class="card border-0 shadow-sm mb-3">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-muted mb-3">Dataset Access</h2>
            <div class="d-grid gap-2">
              ${ds.access ? `<a class="btn btn-primary btn-sm" href="${ds.access}" target="_blank" rel="noopener">Download dataset</a>` : ''}
              ${pub?.doi ? `<a class="btn btn-outline-secondary btn-sm" href="${doiHref(pub.doi)}" target="_blank" rel="noopener">View paper</a>` : ''}
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

        ${(authorBlock || metricsBlock) ? `
        <div class="card border-0 shadow-sm">
          <div class="card-body">
            ${authorBlock ? `<h2 class="h6 text-uppercase text-muted mb-3">Authors</h2><div class="small">${authorBlock}</div>` : ''}
            ${metricsBlock || ''}
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
