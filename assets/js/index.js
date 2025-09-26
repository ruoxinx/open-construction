const CLASS_LIMIT = 5;

let ALL = {}; let LIST = [];

let MODALITIES = new Map(); // normKey -> pretty label
let TASKS      = new Map(); // normKey -> pretty label
let LICENSES   = new Map(); // RAW -> formatted display
let CLASSES    = new Map(); // normClassKey -> {label, count}

const showAll = { modalities:false, tasks:false, licenses:false, classes:false };
let facetsBound = false;

// ---------- helpers ----------
function normKey(s){
  if (s == null) return '';
  return String(s).trim().replace(/[_-]+/g,' ').replace(/\s+/g,' ').toLowerCase();
}
function prettyLabel(raw){
  const k = normKey(raw);
  return k.split(' ').map(tok=>{
    if (/^(2d|3d|rgb|rgbd|rgb-d|slam|lidar|cnn|rnn|gan|svm|ml|ai|nlp|uav|imu|sar)$/i.test(tok)) return tok.toUpperCase();
    return tok.charAt(0).toUpperCase()+tok.slice(1);
  }).join(' ');
}

// --- singularize last token only (lightweight) ---
function singularizeToken(t){
  const irr = { people:'person', men:'man', women:'woman', children:'child', feet:'foot', geese:'goose', mice:'mouse', teeth:'tooth' };
  if (irr[t]) return irr[t];
  if (/ies$/.test(t) && t.length>3) return t.replace(/ies$/,'y');        // bodies -> body
  if (/(xes|zes|ches|shes|sses)$/.test(t)) return t.replace(/es$/,'');   // boxes -> box
  if (/ves$/.test(t) && t.length>3) return t.replace(/ves$/,'f');        // leaves -> leaf (best-effort)
  if (t.endsWith('s') && !/(ss|us)$/.test(t)) return t.slice(0,-1);      // cars -> car
  return t;
}

// strip qualifiers like "(idle)", "(dump)"
function stripParens(raw){
  return String(raw).replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim();
}

// normalized key for CLASSES: remove parentheses then singularize last word
function normClassKey(raw){
  let base = stripParens(raw);
  let k = normKey(base);
  if (!k) return '';
  const parts = k.split(' ');
  parts[parts.length-1] = singularizeToken(parts[parts.length-1]);
  return parts.join(' ');
}
function prettyClassLabel(raw){
  const parts = normClassKey(raw).split(' ');
  return parts.map(prettyLabel).join(' ').trim();
}

// ---------- modality canonicalization (multi) ----------

// Canonicalize a single free-text modality description into one label
function canonicalizeModalityLabel(raw){
  if (!raw) return 'Other';
  const s = normKey(raw);
  const has = re => re.test(s);

  const hasSynthetic = has(/\bsynthetic\b|simulat(?:e|ed|ion)|render(?:ed|ing)?|\bcg\b|\bcgi\b|computer[ -]?generated|virtual|digital\s*twin|sim[-\s]?to[-\s]?real|sim2real|unreal|unity|blender|gazebo|airsim|carla|\bgta\b/);

  const hasLidar   = has(/\blidar\b|li[\s-]?dar|\bvelodyne\b|\brplidar\b/);
  const hasPC      = has(/point\s*cloud/);
  const hasDepth   = has(/\bdepth\b|\brgb\s*-?\s*d\b|\brgbd\b|\bstereo\b|\bkinect\b/); // accepts "rgb-d" and "rgb d"
  const hasThermal = has(/\bthermal\b|\binfrared\b|\b(ir)\b/);
  const hasSAR     = has(/\bsar\b|\bradar\b/);
  const hasMulti   = has(/\bmultispectral\b/);
  const hasHyper   = has(/\bhyperspectral\b/);
  const hasVideo   = has(/\bvideo\b|\bsequence\b|\bstream\b/);
  const hasSat     = has(/\bsatellite\b|\blandsat\b|\bsentinel\b/);
  const hasAerial  = has(/\baerial\b|\bdrone\b|\buav\b|\bauv\b/);
  const hasGround  = has(/\bground\b|\bhandheld\b|\bphone\b|\bmobile\b|\bvehicle\b|\brover\b/);
  const hasRGB     = has(/\brgb\b|\bimage\b|\bphoto\b/);

  if (hasLidar)   return 'LiDAR';
  if (hasSAR)     return 'SAR';
  if (hasDepth)   return 'RGB-D';
  if (hasThermal) return 'Thermal';
  if (hasMulti)   return 'Multispectral';
  if (hasHyper)   return 'Hyperspectral';
  if (hasPC)      return '3D Point Cloud';
  if (hasVideo)   return 'Video Clips';
  if (hasSat)     return hasRGB ? 'Satellite RGB' : 'Satellite';
  if (hasAerial)  return hasRGB ? 'Aerial RGB'    : 'Aerial';
  if (hasGround)  return hasRGB ? 'Ground RGB'    : 'Ground';

  // Only fallback to Synthetic if no primary modality matched
  if (hasSynthetic) return 'Synthetic';
  return 'Other';
}

// Split and canonicalize to an ARRAY of modalities.
// Adds a separate "Synthetic" tag if the overall text implies it.
function canonicalizeModalityLabels(raw){
  if (raw == null) return ['Other'];

  let parts = Array.isArray(raw) ? raw.slice() : String(raw).split(/[,/&+]| and /gi);
  parts = parts.map(p => p && p.trim()).filter(Boolean);
  if (!parts.length) parts = [String(raw)];

  const labels = new Set();
  const globalHasSynthetic = /\bsynthetic\b|simulat(?:e|ed|ion)|render(?:ed|ing)?|\bcg\b|\bcgi\b|computer[ -]?generated|virtual|digital\s*twin|sim[-\s]?to[-\s]?real|sim2real|unreal|unity|blender|gazebo|airsim|carla|\bgta\b/i.test(String(raw));

  for (const p of parts){
    labels.add(canonicalizeModalityLabel(p));
  }
  if (globalHasSynthetic) labels.add('Synthetic');

  // Replace 'Other' if more meaningful labels present
  if (labels.size > 1 && labels.has('Other')) labels.delete('Other');

  return Array.from(labels);
}

// licenses: display formatting only (filter remains raw)
function formatLicenseLabel(raw){
  if (raw == null) return '';
  let s = String(raw).trim();
  s = s.replace(/\bapache\s*[- ]?\s*2\.?0\b/i, 'Apache-2.0');
  s = s.replace(/\bcc\s*0\b/i, 'CC0');
  s = s.replace(/\bcc\b/gi,'CC').replace(/\bby\b/gi,'BY').replace(/\bsa\b/gi,'SA').replace(/\bnc\b/gi,'NC').replace(/\bnd\b/gi,'ND');
  return s;
}

// ---------- canonicalize datasets (tasks/classes/modalities) ----------
function buildCanonMap(values, keyFn){
  const map = new Map();
  for (const v of values){
    const k = keyFn(v);
    if (!k) continue;
    const cand = keyFn === normClassKey ? prettyClassLabel(v) : prettyLabel(v);
    const prev = map.get(k);
    if (!prev || cand.length < prev.length) map.set(k, cand);
  }
  return map;
}

function canonicalizeAllDatasets(){
  const allTasks = [], allClasses = [];
  Object.values(ALL).forEach(ds=>{
    if (Array.isArray(ds.potential_tasks)) allTasks.push(...ds.potential_tasks);
    if (Array.isArray(ds.classes)) allClasses.push(...ds.classes);
  });

  const TASK_CANON  = buildCanonMap(allTasks,  normKey);
  const CLASS_CANON = buildCanonMap(allClasses, normClassKey);
  
  const addedRaw = ds.added_date ?? ds.added ?? ds.addedAt ?? ds.date_added ?? null;
  const ts = addedRaw ? Date.parse(addedRaw) : NaN;
  
  ds._added_ts = Number.isFinite(ts) ? ts : null;         // numeric for sorting if you want later
  ds.added_date = Number.isFinite(ts) ? new Date(ts).toISOString() : null; // normalized ISO (optional)

  Object.values(ALL).forEach(ds=>{
    // Tasks
    if (Array.isArray(ds.potential_tasks)){
      const set = new Set(ds.potential_tasks.map(t => TASK_CANON.get(normKey(t)) || prettyLabel(t)));
      ds.potential_tasks = Array.from(set).sort((a,b)=>a.localeCompare(b));
    }

    // Classes
    if (Array.isArray(ds.classes)){
      const set = new Set(ds.classes.map(c => CLASS_CANON.get(normClassKey(c)) || prettyClassLabel(c)));
      ds.classes = Array.from(set).sort((a,b)=>a.localeCompare(b));
      ds.num_classes = ds.classes.length;
    }

    // Modalities (NOW MULTI)
    const arr = canonicalizeModalityLabels(ds.data_modality ?? ds.data_modalities ?? '');
    ds.data_modalities = arr;                // array of pretty labels
    ds._mod_keys = arr.map(m => normKey(m)); // normalized keys for filtering
    // Back-compat display string if referenced elsewhere
    ds.data_modality = arr.join(', ');
  });
}

// ---------- facet builders ----------
function makeCheck(id,label,value,count){
  const countBadge = (typeof count==='number' && id!=='class') ? ` <span class="text-muted">${count}</span>` : '';
  return `<label class="form-check small d-flex align-items-center gap-2">
    <input class="form-check-input" type="checkbox" data-group="${id}" value="${value}">
    <span class="form-check-label flex-grow-1">${label}${countBadge}</span>
  </label>`;
}
function ensureToggleButton(containerId, btnId, facetKey, collapsedText, expandedText, renderFn){
  let btn = document.getElementById(btnId);
  if(!btn){
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = btnId;
    btn.className = 'btn btn-link p-0 facet-toggle';
    const container = document.getElementById(containerId);
    if (container) container.insertAdjacentElement('afterend', btn);
  }
  btn.textContent = showAll[facetKey] ? expandedText : collapsedText;
  btn.onclick = ()=>{ showAll[facetKey] = !showAll[facetKey]; renderFn(); };
}

function collectFacets(){
  MODALITIES = new Map(); TASKS = new Map(); LICENSES = new Map(); CLASSES = new Map();

  Object.values(ALL).forEach(ds=>{
    // MODALITIES: add every modality label
    if (Array.isArray(ds.data_modalities)){
      ds.data_modalities.forEach(m=>{
        const k = normKey(m);
        if (!MODALITIES.has(k)) MODALITIES.set(k, m);
      });
    } else if (ds.data_modality){ // fallback single string
      const k = normKey(ds.data_modality);
      if (!MODALITIES.has(k)) MODALITIES.set(k, ds.data_modality);
    }

    if (Array.isArray(ds.potential_tasks)){
      ds.potential_tasks.forEach(t=> TASKS.set(normKey(t), prettyLabel(t)));
    }
    if (ds.license){
      const raw = String(ds.license).trim();
      if (raw && !LICENSES.has(raw)) LICENSES.set(raw, formatLicenseLabel(raw));
    }
    if (Array.isArray(ds.classes)){
      ds.classes.forEach(c=>{
        const k = normClassKey(c);
        const lab = prettyClassLabel(c);
        const prev = CLASSES.get(k);
        CLASSES.set(k, { label: lab, count: prev ? prev.count + 1 : 1 });
      });
    }
  });

  renderFacetLists();
  bindFacetSearch();
}

// ---------- facet renderers ----------
function renderFacetLists(){
  renderModalityList(); renderTaskList(); renderLicenseList(); renderClassList();
  if (!facetsBound){
    ['filter-modality','filter-task','filter-license','filter-classes'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.addEventListener('change', applyFilters);
    });
    facetsBound = true;
  }
}
function filterByQuery(items,q){ if(!q) return items; const ql=q.toLowerCase(); return items.filter(x=>x.label.toLowerCase().includes(ql)); }

function renderModalityList(){
  const id='filter-modality', btn='toggleModality';
  let items = Array.from(MODALITIES.entries()).map(([k,label])=>({label, value:k})).sort((a,b)=>a.label.localeCompare(b.label));
  const limited = showAll.modalities ? items : items.slice(0,CLASS_LIMIT);
  const html = limited.map(m=>makeCheck('modality',m.label,m.value)).join('') || '<div class="text-muted small">No modalities</div>';
  const node = document.getElementById(id); if (node) node.innerHTML = html;
  ensureToggleButton(id,btn,'modalities','Show all','Show less',renderModalityList);
}
function renderTaskList(){
  const id='filter-task', btn='toggleTasks';
  const q = document.getElementById('taskSearch')?.value || '';
  let items = Array.from(TASKS.entries()).map(([k,label])=>({label,value:k}));
  items = filterByQuery(items,q).sort((a,b)=>a.label.localeCompare(b.label));
  const limited = (!showAll.tasks && !q) ? items.slice(0,CLASS_LIMIT) : items;
  const node = document.getElementById(id);
  if (node) node.innerHTML = limited.map(it=>makeCheck('task',it.label,it.value)).join('') || '<div class="text-muted small">No tasks</div>';
  ensureToggleButton(id,btn,'tasks','Show all','Show less',renderTaskList);
}
function renderLicenseList(){
  const id='filter-license', btn='toggleLicenses';
  const q = document.getElementById('licenseSearch')?.value || '';
  let items = Array.from(LICENSES.entries()).map(([raw,label])=>({label,value:raw})).sort((a,b)=>a.label.localeCompare(b.label));
  items = filterByQuery(items,q);
  const limited = (!showAll.licenses && !q) ? items.slice(0,CLASS_LIMIT) : items;
  const node = document.getElementById(id);
  if (node) node.innerHTML = limited.map(it=>makeCheck('license',it.label,it.value)).join('') || '<div class="text-muted small">No licenses</div>';
  ensureToggleButton(id,btn,'licenses','Show all','Show less',renderLicenseList);
}
function renderClassList(){
  const id='filter-classes', btn='toggleClasses';
  const q = (document.getElementById('classSearch')?.value || '').toLowerCase();

  let entries = Array.from(CLASSES.entries()).map(([k,obj])=>({key:k,label:obj.label,count:obj.count}));

  const selected = new Set(Array.from(document.querySelectorAll('input[data-group="class"]:checked')).map(el=>el.value));

  entries.sort((a,b)=>{
    const aSel = selected.has(a.key), bSel = selected.has(b.key);
    if (aSel!==bSel) return aSel?-1:1;
    if (b.count!==a.count) return b.count-a.count;
    return a.label.localeCompare(b.label);
  });

  if (q) entries = entries.filter(it => it.label.toLowerCase().includes(q));

  const limited = (!showAll.classes && !q) ? entries.slice(0,CLASS_LIMIT) : entries;

  const html = limited.map(it=>{
    let display = it.label.replace(/\s+\(?\d+\)?$/,'');
    return makeCheck('class', display.trim(), it.key);
  }).join('');

  const node = document.getElementById(id); if (node) node.innerHTML = html || '<div class="text-muted small">No classes</div>';
  ensureToggleButton(id,btn,'classes','Show all classes','Show less',renderClassList);
}

// ---------- search boxes ----------
function bindFacetSearch(){
  ['taskSearch','licenseSearch','classSearch'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.addEventListener('input', ()=>{
      if(id==='taskSearch') renderTaskList();
      if(id==='licenseSearch') renderLicenseList();
      if(id==='classSearch') renderClassList();
    });
  });
}

// ---------- filtering & render ----------
function readFilters(){
  const q = document.getElementById('q')?.value.toLowerCase().trim() || '';
  const yMin = parseInt(document.getElementById('yearRangeMin')?.value||'-999999',10);
  const yMax = parseInt(document.getElementById('yearRangeMax')?.value||'999999',10);
  const mods = Array.from(document.querySelectorAll('input[data-group="modality"]:checked')).map(el=>el.value);
  const tasks = Array.from(document.querySelectorAll('input[data-group="task"]:checked')).map(el=>el.value);
  const licenses = Array.from(document.querySelectorAll('input[data-group="license"]:checked')).map(el=>el.value);
  const classes = Array.from(document.querySelectorAll('input[data-group="class"]:checked')).map(el=>el.value);
  return { q, yMin, yMax, mods, tasks, licenses, classes };
}

function applyFilters(){
  const f = readFilters();
  const minEl=document.getElementById('yearRangeMinVal'), maxEl=document.getElementById('yearRangeMaxVal');
  if(minEl) minEl.textContent=f.yMin; if(maxEl) maxEl.textContent=f.yMax;

  LIST = Object.values(ALL).filter(ds=>{
    const dsName = (ds.name||'');
    const dsTaskKeys = Array.isArray(ds.potential_tasks)? ds.potential_tasks.map(normKey):[];
    const dsLicenseRaw = (ds.license||'').trim();
    const dsClassKeys = Array.isArray(ds.classes)? ds.classes.map(normClassKey):[];
    const dsModKeys = Array.isArray(ds._mod_keys) ? ds._mod_keys : (ds.data_modality ? [normKey(ds.data_modality)] : []);

    if (f.q){
      const clsStr = dsClassKeys.join(' ');
      const tskStr = dsTaskKeys.join(' ');
      const licStr = dsLicenseRaw.toLowerCase();
      if (!(dsName.toLowerCase().includes(f.q) || licStr.includes(f.q) || clsStr.includes(f.q) || tskStr.includes(f.q))) return false;
    }
    if (ds.year && (ds.year < f.yMin || ds.year > f.yMax)) return false;

    // MODALITIES: require any overlap
    if (f.mods.length){
      const hit = dsModKeys.some(k => f.mods.includes(k));
      if (!hit) return false;
    }

    if (f.tasks.length && !dsTaskKeys.some(t=>f.tasks.includes(t))) return false;
    if (f.licenses.length && (!dsLicenseRaw || !f.licenses.includes(dsLicenseRaw))) return false;
    if (f.classes.length && !f.classes.every(c=>dsClassKeys.includes(c))) return false;

    return true;
  });

  sortAndRender();
}

function sortAndRender(){
  const sel = document.getElementById('sortBy')?.value || 'year-desc';
  const [field,dir] = sel.split('-'); const desc = dir==='desc';
  const key = {
    name: d=>(d.name||'').toLowerCase(),
    year: d=> d.year ?? -Infinity,
    images: d=> d.num_images ?? -Infinity,
    classes: d=> d.num_classes ?? -Infinity
  }[field] || (d=> d.year ?? -Infinity);
  LIST.sort((a,b)=> (key(a)<key(b)?(desc?1:-1):(key(a)>key(b)?(desc?-1:1):0)));
  renderGrid();
}

function renderGrid(){
  const grid=document.getElementById('datasetGrid'), count=document.getElementById('resultCount');
  if (count) count.textContent = LIST.length;
  if (grid) grid.innerHTML = LIST.map(ds=>cardHTML(ds)).join('');
}

// ---------- card UI (uniform thumbnails) ----------
function cardHTML(ds){
  const id = ds.id || ds.name, slug = encodeURIComponent(id);
  const img = ds.image_url || 'assets/img/placeholder.png';
  
    // inline date format without helpers
  let addedTag = '';
  if (ds._added_ts) {
    const d = new Date(ds._added_ts);
    const addedText = d.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'2-digit'});
    addedTag = `<span class="badge rounded-pill bg-light text-muted border ms-auto">Added ${addedText}</span>`;
  }

  return `<div class="col-md-6 col-xl-4">
    <div class="card dataset-card h-100 shadow-sm">
      <div class="thumb">
        <img src="${img}" alt="${ds.name} preview" loading="lazy" decoding="async"
             onerror="this.onerror=null;this.src='assets/img/placeholder.png';">
      </div>
      <div class="card-body d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start">
          <h6 class="card-title me-2">${ds.name}</h6>
          <span class="badge text-bg-light">${ds.year ?? '—'}</span>
        </div>
        <div class="small text-muted mb-1">
          <span>${ds.data_modalities?.join(', ') || ds.data_modality || '—'}</span>
        </div>
        <div class="small text-muted mb-2">
          Images <strong>${formatInt(ds.num_images)}</strong> · Classes <strong>${formatInt(ds.num_classes)}</strong>
        </div>
        <div class="mt-auto d-flex justify-content-between align-items-center">
          <a class="btn btn-sm btn-primary" href="datasets/detail.html?id=${slug}">View details</a>
        </div>
      </div>
    </div>
  </div>`;
}

// Inject CSS so all thumbnails share the same size/crop
function injectThumbStyles(){
  if (document.getElementById('thumb-style')) return;
  const css = `
    .dataset-card .thumb{
      width:100%;
      aspect-ratio: 16 / 9;        /* change to 4 / 3 if preferred */
      overflow:hidden;
      background:#f3f4f6;
      border-top-left-radius:.375rem;
      border-top-right-radius:.375rem;
    }
    .dataset-card .thumb img{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }`;
  const style = document.createElement('style');
  style.id = 'thumb-style';
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------- init ----------
async function init(){
  injectThumbStyles();

  const raw = await fetchDatasets();
  ALL = raw;

  canonicalizeAllDatasets();

  const years = Object.values(ALL).map(d=>d.year).filter(v=>typeof v==='number');
  const minY = years.length ? Math.min(...years) : 2000;
  const maxY = years.length ? Math.max(...years) : new Date().getFullYear();

  const yrMinEl=document.getElementById('yearRangeMin'), yrMaxEl=document.getElementById('yearRangeMax');
  if (yrMinEl && yrMaxEl){
    yrMinEl.min=minY; yrMinEl.max=maxY; yrMinEl.value=minY;
    yrMaxEl.min=minY; yrMaxEl.max=maxY; yrMaxEl.value=maxY;
    (document.getElementById('yearRangeMinVal')||{}).textContent=minY;
    (document.getElementById('yearRangeMaxVal')||{}).textContent=maxY;
    yrMinEl.addEventListener('input',()=>{ if(+yrMinEl.value>+yrMaxEl.value) yrMaxEl.value=yrMinEl.value; applyFilters(); });
    yrMaxEl.addEventListener('input',()=>{ if(+yrMaxEl.value<+yrMinEl.value) yrMinEl.value=yrMaxEl.value; applyFilters(); });
  }

  collectFacets();
  document.getElementById('sortBy')?.addEventListener('change', sortAndRender);
  document.getElementById('q')?.addEventListener('input', applyFilters);

  LIST = Object.values(ALL);
  sortAndRender();
}
document.addEventListener('DOMContentLoaded', init);