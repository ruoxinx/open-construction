// Robust OER loader: handles alternate JSON field names and renders cards like Dataset page.
(function () {
  const state = { all: [], filtered: [] };
  const els = {
    grid: document.getElementById('oerGrid'),
    empty: document.getElementById('emptyState'),
    q: document.getElementById('q'),
    qBtn: document.getElementById('qBtn'),
    sort: document.getElementById('sortBy'),
    lang: document.getElementById('filter-language'),
    topics: document.getElementById('filter-topics'),
    topicSearch: document.getElementById('topicSearch'),
    license: document.getElementById('filter-license'),
    licenseSearch: document.getElementById('licenseSearch'),
    media: document.getElementById('filter-media'),
    count: document.getElementById('resultCount'),
    skeleton: document.getElementById('oerSkeleton')
  };

  const placeholderImg = 'assets/img/placeholder.png';

  const uniq   = a => [...new Set(a)];
  const arrify = v => (Array.isArray(v) ? v : (v == null ? [] : [v]));
  const tokens = v => arrify(v).map(x => String(x || '').trim()).filter(Boolean);
  const has    = (h, n) => String(h || '').toLowerCase().includes(String(n || '').toLowerCase());
  const cssId  = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  function showSkeleton(){ if(els.skeleton){ els.skeleton.removeAttribute('hidden'); } if(els.grid){ els.grid.setAttribute('hidden',''); } }
  function hideSkeleton(){ if(els.skeleton){ els.skeleton.setAttribute('hidden',''); } if(els.grid){ els.grid.removeAttribute('hidden'); } }

  // --- Formatting helpers ---
  function fmtYear(v){
    if(!v) return '';
    // If v is "2025" or similar
    const onlyYear = String(v).match(/^\s*(\d{4})\s*$/);
    if (onlyYear) return onlyYear[1];
    const d = new Date(v);
    return isNaN(d) ? (String(v).match(/\d{4}/)?.[0] || '') : String(d.getFullYear());
  }
  function fmtAdded(v){
    if(!v) return '';
    const d = new Date(v);
    if(isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); // e.g., "Nov 04, 2025"
  }

  // --- Normalize one record from arbitrary field names to our internal schema ---
  function normalize(r){
    // title/name
    const title = r.title || r.name || r.resource_title || '';

    // provider/authors/author
    const provider = r.provider || r.authors || r.author || r.creator || r.publisher || '';

    // image
    const image = r.image || r.image_url || r.thumbnail || r.thumb || '';

    // source/link/url
    const source = r.source || r.url || r.link || r.href || '#';

    // language(s)
    const language = r.language || r.languages || r.lang || [];

    // topics/tags/keywords/subjects
    const topics = r.topics || r.topic || r.tags || r.keywords || r.subjects || [];

    // media
    const media = r.media || r.media_format || r.format || r.formats || [];

    // license/licence
    const license = r.license || r.licence || r.license_name || r.license_type || '';

    // year/added/date
    const yearRaw  = r.year || r.publication_year || r.date || r.added || r.created_at || r.updated_at || '';
    const year     = fmtYear(yearRaw);
    const addedRaw = r.added || r.added_date || r.date_added || r.created_at || r.updated_at || r.date || '';
    const added    = addedRaw;

    // contributor overlay
    const contributor     = r.contributor || r.submitted_by || r.submitter || r.user || '';
    const contributor_url = r.contributor_url || r.submitter_url || r.user_url || r.profile || '';

    return {
      // normalized fields used by renderer
      title,
      provider,
      image,
      source,
      language: tokens(language),
      topics: tokens(topics),
      media: tokens(media),
      license,
      year,
      added,
      contributor,
      contributor_url,
    };
  }

  function facetHtml(prefix, values){
    return values.map(v => `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" value="${v}" id="${prefix}-${cssId(v)}">
        <label class="form-check-label" for="${prefix}-${cssId(v)}">${v}</label>
      </div>
    `).join('');
  }
  function readChecked(container){
    if(!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(i=>i.value);
  }
  function allFacetValues(list, key){
    return uniq(list.flatMap(r => tokens(r[key]))).sort((a,b)=>a.localeCompare(b));
  }

  function render(list){
    if(!els.grid){ console.error('[OER] Missing #oerGrid element'); return; }
    els.grid.innerHTML = '';
    if(!list.length){
      els.empty?.classList?.remove('d-none');
      if (els.count) els.count.textContent = '0';
      return;
    }
    els.empty?.classList?.add('d-none');
    if (els.count) els.count.textContent = String(list.length);

    list.forEach(r=>{
      const img   = r.image || placeholderImg;
      const langs = r.language.map(x=>`<span class="tag">${x}</span>`).join('');
      const tops  = r.topics.map(x=>`<span class="tag">${x}</span>`).join('');
      const meds  = r.media.map(x=>`<span class="tag">${x}</span>`).join('');
      const lic   = r.license || 'See source';
      const added = fmtAdded(r.added);
      const year  = r.year;

      // contributor overlay
      const submittedByHTML = (r.contributor || r.contributor_url)
        ? `<div class="submitted-by position-absolute bottom-0 start-0 w-100 text-center small py-1 bg-white bg-opacity-75">
             <a href="${r.contributor_url || '#'}" target="_blank" rel="noopener" class="text-muted text-decoration-none">
               Submitted by <strong>${String(r.contributor || '').startsWith('@') ? r.contributor : '@' + (r.contributor || 'anonymous')}</strong>
             </a>
           </div>`
        : '';

      els.grid.insertAdjacentHTML('beforeend', `
        <div class="col-md-6 col-xl-4">
          <article class="resource-card h-100 position-relative">
            <div class="position-relative">
              <img class="thumb" src="${img}" alt="${r.title} image" onerror="this.src='${placeholderImg}'">
              ${submittedByHTML}
            </div>

            <div class="card-body d-flex flex-column">
              <div class="title mb-1">${r.title}</div>

              <!-- Provider + Year -->
              <div class="d-flex justify-content-between align-items-center mb-2 small text-muted">
                <div>
                  ${r.provider ? `<span>${r.provider}</span>` : ``}
                  ${year ? `<span class="badge bg-light text-dark border ms-1">${year}</span>` : ``}
                </div>
              </div>

              <div class="mb-2"><strong>Language:</strong> <div class="tag-lane mt-1">${langs || '—'}</div></div>
              <div class="mb-2"><strong>Topics:</strong> <div class="tag-lane mt-1">${tops || '—'}</div></div>
              <div class="mb-2"><strong>Media:</strong> <div class="tag-lane mt-1">${meds || '—'}</div></div>
              <div class="mb-2"><strong>License:</strong> <span class="tag">${lic}</span></div>

              <!-- Bottom row: Button + Added date -->
              <div class="mt-auto d-flex justify-content-between align-items-center">
                <a class="btn btn-primary btn-sm" href="${r.source}" target="_blank" rel="noopener">View resource</a>
                ${added ? `<div class="small text-muted ms-2">Added: <time datetime="${r.added}">${added}</time></div>` : ``}
              </div>
            </div>
          </article>
        </div>
      `);
    });
  }

  function applyFilters(){
    const q = (els.q?.value || '').trim().toLowerCase();
    const langSel = readChecked(els.lang);
    const licSel  = readChecked(els.license);
    const medSel  = readChecked(els.media);
    const topicSel = readChecked(els.topics);
    const topicQ = (els.topicSearch?.value || '').trim().toLowerCase();
    const licQ   = (els.licenseSearch?.value || '').trim().toLowerCase();

    let list = state.all.slice();

    if(q){
      list = list.filter(r =>
        has(r.title, q) || has(r.provider, q) || r.topics.some(t => has(t, q))
      );
    }
    if(langSel.length){
      list = list.filter(r => r.language.some(x => langSel.includes(x)));
    }
    if(licSel.length){
      list = list.filter(r => licSel.includes(r.license || 'See source'));
    }
    if(medSel.length){
      list = list.filter(r => r.media.some(x => medSel.includes(x)));
    }
    if(topicSel.length){
      list = list.filter(r => r.topics.some(x => topicSel.includes(x)));
    }
    if(topicQ){
      list = list.filter(r => r.topics.some(t => has(t, topicQ)));
    }
    if(licQ){
      list = list.filter(r => has(r.license, licQ));
    }

    const s = els.sort?.value || 'added-desc';
    if(s === 'name-asc') list.sort((a,b)=>a.title.localeCompare(b.title));
    if(s === 'name-desc') list.sort((a,b)=>b.title.localeCompare(a.title));
    if(s === 'added-asc') list.sort((a,b)=>String(a.added||'').localeCompare(String(b.added||'')));
    if(s === 'added-desc') list.sort((a,b)=>String(b.added||'').localeCompare(String(a.added||'')));

    state.filtered = list;
    render(list);
  }

  function buildFacets(){
    if (els.lang)    els.lang.innerHTML    = facetHtml('lang',  allFacetValues(state.all,'language'));
    if (els.license) els.license.innerHTML = facetHtml('lic',   uniq(state.all.map(r=>r.license || 'See source')));
    if (els.media)   els.media.innerHTML   = facetHtml('media', allFacetValues(state.all,'media'));
    if (els.topics)  els.topics.innerHTML  = facetHtml('topic', allFacetValues(state.all,'topics'));

    [els.lang, els.license, els.media, els.topics]
      .filter(Boolean)
      .forEach(el => el.addEventListener('change', applyFilters));

    els.topicSearch?.addEventListener('input', applyFilters);
    els.licenseSearch?.addEventListener('input', applyFilters);
    els.q?.addEventListener('input', applyFilters);
    els.qBtn?.addEventListener('click', applyFilters);
    els.sort?.addEventListener('change', applyFilters);
  }

  async function fetchWithFallback(paths){
    const errs = [];
    for(const p of paths){
      const url = p + (p.includes('?') ? '' : ('?v=' + Date.now()));
      try{
        if (window.OER_ENABLE_DEBUG) console.log('[OER] fetching', url);
        const res = await fetch(url, { cache: 'no-store' });
        if(!res.ok) { errs.push(url + ' [' + res.status + ']'); continue; }
        return await res.json();
      }catch(e){
        errs.push(url + ' [' + (e && e.message ? e.message : 'fetch error') + ']');
      }
    }
    throw new Error('All OER fetch attempts failed: ' + errs.join(' | '));
  }

  async function init(){
    showSkeleton();
    try{
      const paths = Array.isArray(window.OER_JSON_PATHS) && window.OER_JSON_PATHS.length
        ? window.OER_JSON_PATHS
        : ['data/oer.json','../data/oer.json','/data/oer.json'];

      const raw = await fetchWithFallback(paths);
      const arr = Array.isArray(raw) ? raw : (raw.resources || raw.items || raw.data || []);
      if (!Array.isArray(arr)) throw new Error('Unsupported JSON structure (expected array or {resources:[]}).');

      // normalize everything
      state.all = arr.map(normalize);

      if (window.OER_ENABLE_DEBUG) {
        console.log(`[OER] loaded ${state.all.length} resources`);
        console.debug('[OER] sample normalized item', state.all[0]);
      }

      buildFacets();
      applyFilters();
      hideSkeleton();
    }catch(e){
      console.error('Failed to load OER data', e);
      hideSkeleton();
      if(els.grid){
        els.grid.innerHTML = `
          <div class="col-12">
            <div class="empty">
              Could not load OER data. Ensure <code>data/oer.json</code> exists and is valid.
              <div class="small mt-2 text-muted">${String(e.message||e)}</div>
            </div>
          </div>`;
      }
    }
  }

  init();
})();
