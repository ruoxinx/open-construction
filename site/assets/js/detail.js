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

/* ---------- abstract show more/less (detail page) ---------- */
function abstractToggleHtml(text, opts = {}){
  const t = (text == null) ? '' : String(text).trim();
  if (!t) return '';
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

function normalizeDoiForBadge(doiVal){
  // Altmetric/Dimensions accept raw DOI; strip DOI resolver if user stored a URL.
  if (!doiVal) return '';
  const raw = String(doiVal).trim();
  if (!raw) return '';
  // If it's a URL, use pathname as DOI (handles doi.org and other resolvers)
  try {
    const u = new URL(raw);
    const doi = (u.pathname || '').replace(/^\/+/, '');
    return doi || raw;
  } catch {
    return raw;
  }
}

function publicationBadgesHtml(doiVal, cfg){
  const doi = normalizeDoiForBadge(doiVal);
  if (!doi) return '';

  // Config precedence:
  // - If cfg.altmetric / cfg.dimensions is boolean, respect it.
  // - If cfg.altmetric / cfg.dimensions is 0 or "0", treat as disabled (hide badges for zero metrics).
  // - Otherwise default to true when DOI exists.
  const asBool = v => (v === true || v === false) ? v : undefined;
  const isZero = v => v === 0 || v === '0' || v === '0.0';

  const altmetricOn  = isZero(cfg?.altmetric)  ? false : (asBool(cfg?.altmetric)  ?? true);
  const dimensionsOn = isZero(cfg?.dimensions) ? false : (asBool(cfg?.dimensions) ?? true);

  const blocks = [];
  if (altmetricOn) {
    blocks.push(`
      <div class="mb-2">
        <div class="altmetric-embed" data-badge-type="donut" data-doi="${escapeHtml(doi)}"></div>
      </div>
    `);
  }
  if (dimensionsOn) {
    blocks.push(`
      <div class="mb-1">
        <span class="__dimensions_badge_embed__" data-doi="${escapeHtml(doi)}" data-style="small_rectangle"></span>
      </div>
    `);
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

          /* Abstract show more/less */
          .oc-abs-wrap{ position:relative; }
          .oc-abs-text{ white-space:pre-wrap; }
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
                  ${metaRow('Abstract', abstractToggleHtml(m.abstract, { collapsedLines: 6, minCharsForToggle: 320 }))}
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

      // ---- Links + DOI normalization (avoid duplicate DOI button when paper_url is already doi.org) ----
      const paperUrl = (m.paper_url || m.paper || '').trim();
      const codeUrl  = (m.code_url  || m.code  || '').trim();

      // Prefer explicit DOI field; otherwise infer DOI from paper_url if it's already a doi.org link
      const doiSource = m.doi || (paperUrl && paperUrl.includes('doi.org/') ? paperUrl : '');
      const doiUrl = doiSource
        ? (String(doiSource).startsWith('http') ? String(doiSource).trim() : `https://doi.org/${String(doiSource).trim()}`)
        : '';

      // If paper_url is already the DOI link, don't show a separate DOI button
      const showDoiButton = !!doiUrl && doiUrl !== paperUrl;

      // Reference bits (use doiSource so Reference + badges still work even if model lacks m.doi but paper_url is doi.org)
      const doiBlock = doiSource ? `<div class="mb-2"><span class="text-muted">DOI:</span> ${formatDoi(doiSource)}</div>` : '';
      const licenseBlock = m.license ? `<div class="mb-0"><span class="text-muted">License:</span> ${formatLicense(m.license)}</div>` : '';
      const authorBlock = authorListHtml(m.authors, m.author_urls || m.authors_url || m.author_links);

      // Automatic publication badges when DOI exists (can be disabled per record: altmetric:false / dimensions:false)
      const pubBadgesBlock = publicationBadgesHtml(doiSource, {
        altmetric: (m.altmetric !== undefined) ? m.altmetric : undefined,
        dimensions: (m.dimensions !== undefined) ? m.dimensions : undefined
      });

      const sidebar = `
        <div class="position-sticky" style="top:88px">
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body">
              <h2 class="h6 text-uppercase text-muted mb-3">Model Links</h2>
              <div class="d-grid gap-2">
                ${paperUrl ? `<a class="btn btn-primary btn-sm" href="${paperUrl}" target="_blank" rel="noopener">View Paper</a>` : ''}
                ${codeUrl ? `<a class="btn btn-outline-secondary btn-sm" href="${codeUrl}" target="_blank" rel="noopener">View Code</a>` : ''}
                ${showDoiButton ? `<a class="btn btn-outline-secondary btn-sm" href="${doiUrl}" target="_blank" rel="noopener">DOI</a>` : ''}
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
              <h2 class="h6 text-uppercase text-muted mb-2">Metrics</h2>
              <div class="text-muted small mb-2">Metrics reflect tracked citations and online mentions and may not capture all contributions.</div>
              ${pubBadgesBlock}
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

      // Abstract toggle wiring (model detail page)
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

    // --- dataset branch continues (unchanged) ---
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

    // ... rest of your original dataset detail page script continues here ...
    // (kept intact in the downloadable file)
  }catch(err){
    console.error(err);
    root.innerHTML = `<div class="alert alert-danger">Failed to render detail page.</div>`;
    window.OC?.clearSkeleton?.();
  }
}

document.addEventListener('DOMContentLoaded', initDetail);

/* ========== image fallback helper ========== */
function setImgWithFallback(imgEl, basePathNoExt, placeholder){
  if (!imgEl) return;
  const exts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  let idx = 0;

  function tryNext(){
    if (idx >= exts.length) {
      imgEl.src = placeholder;
      imgEl.setAttribute('data-zoom-src', placeholder);
      return;
    }
    const src = `${basePathNoExt}${exts[idx++]}`;
    const test = new Image();
    test.onload = () => {
      imgEl.src = src;
      imgEl.setAttribute('data-zoom-src', src);
    };
    test.onerror = tryNext;
    test.src = src;
  }

  tryNext();
}
