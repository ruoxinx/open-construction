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

function authorListHtml(val){
  const txt = safeText(val);
  if (txt === '—') return '—';
  const names = Array.isArray(val) ? val : String(val).split(',');
  const clean = names.map(n => n.trim()).filter(Boolean);
  if (!clean.length) return '—';
  return clean.map(n => `<div class="mb-1">${n}</div>`).join('');
}

function formatLicense(licVal){
  const norm = safeText(licVal);
  if (norm === '—') return '—';
  const key = String(licVal).trim().toUpperCase();
  const licenseMap = {
    'APACHE-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'CC0': 'https://creativecommons.org/public-domain/cc0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC-BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'MIT': 'https://opensource.org/licenses/MIT',
    'ODC-BY': 'https://opendatacommons.org/licenses/by/'
  };
  if (licenseMap[key]) {
    return `<a href="${licenseMap[key]}" target="_blank" rel="noopener">${norm}</a>`;
  }
  return norm;
}

/* ---------- chip helpers (treat "Not Specified" as empty) ---------- */
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
  if (!items.length) return '—';
  return `<div class="chip-lane">${items.map(x => `<span class="chip">${x}</span>`).join('')}</div>`;
}

/* ========== page ========== */
async function initDetail(){
  const id = decodeURIComponent((typeof getParam === 'function'
    ? getParam('id')
    : new URL(window.location.href).searchParams.get('id')) || '');

  const root = document.getElementById('detailRoot');
  if (!root) return;

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

  // Header badges (skip license if Not Specified)
  window.OC?.setBadges?.({
    modality: safeText(ds.data_modality) === '—' ? '' : ds.data_modality,
    tasks: (Array.isArray(ds.potential_tasks) ? ds.potential_tasks.join(', ') : String(ds.potential_tasks || '')).trim(),
    license: (safeText(ds.license) === '—') ? '' : ds.license
  });

  const imgSrc = `../assets/img/datasets/${encodeURIComponent(id)}.png`;
  const captionText = ds.sample_caption || ds.caption || 'Sample from the dataset';

  // ========= Unified, professional dataset card =========
  const mainHero = `
    <style>
      .ds-card{ border:1px solid var(--oc-border); border-radius:16px; box-shadow:var(--oc-shadow); }
	.ds-figure{ 
	  background:transparent;
	  padding:0;
	  border-radius:0;
	  height:auto;
	}
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
      .ds-metrics{ font-feature-settings:"tnum" 1,"lnum" 1; letter-spacing:.2px; }

      .chip-lane{ display:flex; flex-wrap:wrap; gap:.5rem .5rem; }
      .chip{
        display:inline-flex; align-items:center; padding:.28rem .6rem;
        background:var(--oc-muted); border:1px solid var(--oc-border);
        border-radius:999px; font-weight:600; font-size:.82rem; color:var(--oc-text);
        line-height:1;
      }

      @media (max-width: 991.98px){
        .ds-figure{ border-radius:16px 16px 0 0; }
        .ds-body{ padding:18px 18px 22px; }
        .meta-row{ grid-template-columns: 140px 1fr; gap:10px; }
      }
    </style>

    <div class="ds-card mb-3 bg-white">
      <div class="row g-0">
        <div class="col-lg-6">
          <figure class="m-0 ds-figure">
            <img
              src="${imgSrc}"
              alt="${ds.name} preview"
              loading="lazy" decoding="async"
              onerror="this.onerror=null;this.src='../assets/img/placeholder.png';"
              class="ds-img"
              data-zoom-src="${imgSrc}">
            <figcaption class="text-muted small text-center py-2 ds-cap">${captionText}</figcaption>
          </figure>
        </div>

        <div class="col-lg-6">
          <div class="ds-body">
            <h1 class="ds-title">${ds.name}</h1>
            <div class="ds-year">(${ds.year ?? '—'})</div>

            <dl class="meta">
              <div class="meta-row">
                <dt class="meta-label">Images · Classes</dt>
                <dd class="meta-val ds-metrics">${safeFormatInt(ds.num_images)} · ${safeFormatInt(ds.num_classes)}</dd>
              </div>

              <div class="meta-row">
                <dt class="meta-label">Modality</dt>
                <dd class="meta-val">${chipLane(ds.data_modality)}</dd>
              </div>

              <div class="meta-row">
                <dt class="meta-label">Annotations</dt>
                <dd class="meta-val">${chipLane(ds.annotation_types)}</dd>
              </div>

              <div class="meta-row">
                <dt class="meta-label">Resolution</dt>
                <dd class="meta-val">${safeText(ds.resolution)}</dd>
              </div>

              <div class="meta-row">
                <dt class="meta-label">Location</dt>
                <dd class="meta-val">${chipLane(ds.geographical_location)}</dd>
              </div>

              <div class="meta-row">
                <dt class="meta-label">Associated Tasks</dt>
                <dd class="meta-val">${chipLane(ds.potential_tasks)}</dd>
              </div>

              <div class="meta-row">
                <dt class="meta-label">Classes</dt>
                <dd class="meta-val">${chipLane(ds.classes)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox Modal -->
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

  // RIGHT: sidebar (Access, Reference, Authors)
  const doiLink = doiHref(ds.doi);
  const paperHref = doiLink || (typeof ds.paper === 'string' && ds.paper.trim() ? ds.paper : null);

  const sidebar = `
    <div class="position-sticky" style="top:88px">
      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <h2 class="h6 text-uppercase text-muted mb-3">Dataset Access</h2>
          <div class="d-grid gap-2">
            <a class="btn btn-primary btn-sm"
               ${ds.access ? `href="${ds.access}" target="_blank" rel="noopener"` : 'tabindex="-1" aria-disabled="true"'}
            >Download dataset</a>
            ${paperHref ? `<a class="btn btn-outline-secondary btn-sm" href="${paperHref}" target="_blank" rel="noopener">View paper</a>` : ''}
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
          <h2 class="h6 text-uppercase text-muted mb-3">Reference</h2>
          <div class="small">
            <div class="mb-2"><span class="text-muted">DOI:</span> ${ds.doi ? formatDoi(ds.doi) : '—'}</div>
            <div class="mb-0"><span class="text-muted">License:</span> ${formatLicense(ds.license)}</div>
          </div>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <h2 class="h6 text-uppercase text-muted mb-3">Authors</h2>
          <div class="small">
            ${authorListHtml(ds.authors)}
          </div>
        </div>
      </div>
    </div>
  `;

  // Layout: 9/3 grid — main card (all fields) + sidebar
  root.innerHTML = `
    <div class="row g-3">
      <div class="col-lg-9">
        ${mainHero}
      </div>
      <div class="col-lg-3">
        ${sidebar}
      </div>
    </div>
  `;

  // Wire up lightbox
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
}

document.addEventListener('DOMContentLoaded', initDetail);
