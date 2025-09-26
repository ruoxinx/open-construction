/* =========================
   OpenConstruction — Datasets page
   (Added support for `added_date` like models.html)
========================= */

/* ---------- Config ---------- */
const DATA_URL = 'data/datasets.json'; // adjust if your site uses 'data/datasets.json'

/* ---------- State ---------- */
let ALL = {};     // id -> dataset object (normalized)
let LIST = [];    // current filtered + sorted array
const state = {
  q: '',
  sort: 'year-desc' // default; UI may change it
};

/* ---------- Helpers ---------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function fmtInt(n){
  if(n==null || isNaN(n)) return '—';
  try{
    return Number(n).toLocaleString();
  }catch{return String(n);}
}

function fmtDate(d){
  try{
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(+dt)) return null;
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const day = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }catch{return null;}
}

function esc(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

/* ---------- Rendering ---------- */
function cardHTML(ds){
  const id = ds.id || (ds.name || '').toLowerCase().replace(/\s+/g,'-');
  const img = ds.image_url || ds.thumbnail || `assets/img/datasets/${id}.png`;
  const modalities = ds.data_modalities?.length
      ? ds.data_modalities.join(', ')
      : (ds.data_modality || '—');

  const addedNote = ds.added_date_fmt
      ? `<span class="badge text-bg-light ms-auto">Added ${ds.added_date_fmt}</span>`
      : '';

  return `
  <div class="col-md-6 col-xl-4">
    <div class="card dataset-card h-100 shadow-sm">
      <div class="thumb">
        <img src="${img}" alt="${esc(ds.name || id)} preview" loading="lazy" decoding="async"
             onerror="this.onerror=null;this.src='assets/img/placeholder.png';">
      </div>
      <div class="card-body d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start">
          <h6 class="card-title me-2">${esc(ds.name || id)}</h6>
          <span class="badge text-bg-secondary">${ds.year ?? '—'}</span>
        </div>

        <div class="small text-muted mb-1">
          ${esc(modalities)}
        </div>

        <div class="small text-muted mb-2">
          Images <strong>${fmtInt(ds.num_images)}</strong> · Classes <strong>${fmtInt(ds.num_classes)}</strong>
        </div>

        <div class="mt-auto d-flex align-items-center gap-2">
          ${ds.access ? `<a class="btn btn-sm btn-primary" href="${ds.access}" target="_blank" rel="noopener">Access</a>` : ''}
          ${ds.doi ? `<a class="btn btn-sm btn-outline-secondary" href="${ds.doi.startsWith('http')?ds.doi:`https://doi.org/${ds.doi}`}" target="_blank" rel="noopener">DOI</a>` : ''}
          ${addedNote}
        </div>
      </div>
    </div>
  </div>`;
}

function render(){
  const grid = $('#datasetGrid') || $('#cardGrid') || $('#grid'); // be forgiving on id
  const countEl = $('#resultCount');
  const emptyEl = $('#emptyState');

  if(!grid) return;

  grid.innerHTML = LIST.map(cardHTML).join('');
  if (countEl) countEl.textContent = LIST.length;

  if (emptyEl) {
    if (LIST.length === 0) emptyEl.classList.remove('d-none');
    else emptyEl.classList.add('d-none');
  }
}

/* ---------- Filter + Sort ---------- */
function applyFilters(){
  const q = state.q.trim().toLowerCase();

  let rows = Object.values(ALL).filter(d=>{
    if (!q) return true;
    const hay = [
      d.name, d.id, d.paper, d.license,
      d.data_modality, (d.data_modalities||[]).join(' '),
      (d.potential_tasks||[]).join(' '), (d.classes||[]).join(' ')
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });

  // Sort mapping (includes "added")
  const sel = $('#sortBy');
  const value = sel?.value || state.sort || 'year-desc';
  const [field, dir] = value.split('-');

  const key = {
    name:    d => (d.name || '').toLowerCase(),
    year:    d => (d.year ?? -Infinity),
    images:  d => (d.num_images ?? -Infinity),
    classes: d => (d.num_classes ?? -Infinity),
    added:   d => (d.added_ts ?? -Infinity)   // <- NEW
  }[field] || (d => (d.year ?? -Infinity));

  rows.sort((a,b)=>{
    const ka = key(a), kb = key(b);
    if (typeof ka === 'string' || typeof kb === 'string'){
      return (dir === 'asc') ? String(ka).localeCompare(String(kb)) : String(kb).localeCompare(String(ka));
    }
    return (dir === 'asc') ? (ka - kb) : (kb - ka);
  });

  LIST = rows;
  render();
}

/* ---------- Load + Normalize ---------- */
async function loadDatasets(){
  const grid = $('#datasetGrid') || $('#cardGrid') || $('#grid');
  const errorEl = $('#errorState');

  try{
    const res = await fetch(`${DATA_URL}?v=${Date.now()}`, {cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    // Normalize into ALL
    ALL = {};
    const rows = Array.isArray(raw) ? raw
              : (raw && typeof raw==='object' ? Object.values(raw) : []);

    rows.forEach(src=>{
      // canonical modalities array for display/search
      const modalities = Array.isArray(src.data_modalities) ? src.data_modalities
                        : (src.data_modality ? String(src.data_modality).split(',').map(s=>s.trim()) : []);

      const id = src.id || src.name || Math.random().toString(36).slice(2);
      const added = src.added_date || src.added || null;
      const ts = added ? Date.parse(added) : null;

      ALL[id] = {
        id,
        name: src.name || id,
        year: (src.year!=null ? Number(src.year) : null),
        data_modality: src.data_modality || '',
        data_modalities: modalities,
        num_images: (src.num_images!=null ? Number(src.num_images) : null),
        num_classes: (src.num_classes!=null ? Number(src.num_classes) : null),
        classes: Array.isArray(src.classes) ? src.classes : (src.classes ? [src.classes] : []),
        license: src.license || '',
        paper: src.paper || '',
        access: src.access || src.url || '',
        image_url: src.image_url || src.thumbnail || '',
        doi: src.doi || '',

        // ---- NEW: added date triplet ----
        added_date: added || null,
        added_ts: (typeof ts === 'number' && !isNaN(ts)) ? ts : null,
        added_date_fmt: added ? fmtDate(added) : null
      };
    });

    // initial LIST
    LIST = Object.values(ALL);

    // footer year if present
    const yearNow = $('#yearNow');
    if (yearNow) yearNow.textContent = new Date().getFullYear();

    applyFilters();
  }catch(err){
    console.error('Failed to load datasets.json', err);
    if (grid) grid.innerHTML = '';
    if (errorEl) errorEl.classList.remove('d-none');
  }
}

/* ---------- Wire up UI ---------- */
function initUI(){
  const q1 = $('#q');       // large hero search (if present)
  const qDock = $('#qDock'); // docked navbar search (if present)
  const sortSel = $('#sortBy');

  // Search sync
  function setQ(val){
    state.q = val;
    if (q1 && q1.value !== val) q1.value = val;
    if (qDock && qDock.value !== val) qDock.value = val;
    applyFilters();
  }
  if (q1) q1.addEventListener('input', ()=> setQ(q1.value));
  if (qDock) qDock.addEventListener('input', ()=> setQ(qDock.value));

  // Sort
  if (sortSel) {
    // keep whatever options your HTML defines; just listen and re-apply
    state.sort = sortSel.value || state.sort;
    sortSel.addEventListener('change', ()=>{
      state.sort = sortSel.value;
      applyFilters();
    });
  }

  // Optional: docked search show/hide if your page uses it
  (function(){
    const SHOW_AT = 200, HIDE_AT = 150;
    let docked = false;
    function setDock(on){
      if (on === docked) return;
      docked = on;
      document.body.classList.toggle('docked', on);
    }
    function onScroll(){
      const y = window.scrollY || 0;
      if (!docked && y > SHOW_AT) setDock(true);
      else if (docked && y < HIDE_AT) setDock(false);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
  })();
}

/* ---------- Boot ---------- */
function boot(){
  initUI();
  loadDatasets();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
