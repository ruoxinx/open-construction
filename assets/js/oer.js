// Loads OER from data/oer.json and renders cards with professional tags.
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
    count: document.getElementById('resultCount')
  };
  const placeholderImg = 'assets/img/placeholder.png';

  const uniq   = a => [...new Set(a)];
  const tokens = v => (Array.isArray(v) ? v : [v]).map(x => String(x || '').trim()).filter(Boolean);
  const cssId  = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const has    = (h, n) => String(h || '').toLowerCase().includes(String(n || '').toLowerCase());

  function facetHtml(prefix, values){
    return values.map(v => `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" value="${v}" id="${prefix}-${cssId(v)}">
        <label class="form-check-label" for="${prefix}-${cssId(v)}">${v}</label>
      </div>
    `).join('');
  }
  function readChecked(container){
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(i=>i.value);
  }
  function allFacetValues(list, key){
    return uniq(list.flatMap(r => tokens(r[key]))).sort((a,b)=>a.localeCompare(b));
  }

  function render(list){
    els.grid.innerHTML = '';
    if(!list.length){
      els.empty.classList.remove('d-none');
      els.count.textContent = '0';
      return;
    }
    els.empty.classList.add('d-none');
    els.count.textContent = String(list.length);

    list.forEach(r=>{
      const img   = r.image || placeholderImg;
      const langs = tokens(r.language).map(x=>`<span class="tag">${x}</span>`).join('');
      const tops  = tokens(r.topics).map(x=>`<span class="tag">${x}</span>`).join('');
      const meds  = tokens(r.media).map(x=>`<span class="tag">${x}</span>`).join('');
      const lic   = r.license || 'See source';

      els.grid.insertAdjacentHTML('beforeend', `
        <div class="col-md-6 col-xl-4">
          <article class="resource-card h-100">
            <img class="thumb" src="${img}" alt="${r.title} image" onerror="this.src='${placeholderImg}'">
            <div class="card-body">
              <div class="title">${r.title}</div>
              <div class="meta mb-2">${r.provider || ''}</div>
              <div class="mb-2"><strong>Language:</strong> <div class="tag-lane mt-1">${langs || '—'}</div></div>
              <div class="mb-2"><strong>Topics:</strong> <div class="tag-lane mt-1">${tops || '—'}</div></div>
              <div class="mb-2"><strong>Media:</strong> <div class="tag-lane mt-1">${meds || '—'}</div></div>
              <div class="mb-2"><strong>License:</strong> <span class="tag">${lic}</span></div>
              <a class="btn btn-primary btn-sm mt-1" href="${r.source}" target="_blank" rel="noopener">View resource</a>
            </div>
          </article>
        </div>
      `);
    });
  }

  function applyFilters(){
    const q = (els.q.value || '').trim().toLowerCase();
    const langSel = readChecked(els.lang);
    const licSel  = readChecked(els.license);
    const medSel  = readChecked(els.media);
    const topicSel = readChecked(els.topics);
    const topicQ = (els.topicSearch.value || '').trim().toLowerCase();
    const licQ   = (els.licenseSearch.value || '').trim().toLowerCase();

    let list = state.all.slice();

    if(q){
      list = list.filter(r =>
        has(r.title, q) || has(r.provider, q) || tokens(r.topics).some(t => has(t, q))
      );
    }
    if(langSel.length){
      list = list.filter(r => tokens(r.language).some(x => langSel.includes(x)));
    }
    if(licSel.length){
      list = list.filter(r => licSel.includes(r.license || 'See source'));
    }
    if(medSel.length){
      list = list.filter(r => tokens(r.media).some(x => medSel.includes(x)));
    }
    if(topicSel.length){
      list = list.filter(r => tokens(r.topics).some(x => topicSel.includes(x)));
    }
    if(topicQ){
      list = list.filter(r => tokens(r.topics).some(t => has(t, topicQ)));
    }
    if(licQ){
      list = list.filter(r => has(r.license, licQ));
    }

    // sort
    const s = els.sort.value;
    if(s === 'name-asc') list.sort((a,b)=>a.title.localeCompare(b.title));
    if(s === 'name-desc') list.sort((a,b)=>b.title.localeCompare(a.title));
    if(s === 'added-asc') list.sort((a,b)=>String(a.added||'').localeCompare(String(b.added||'')));
    if(s === 'added-desc') list.sort((a,b)=>String(b.added||'').localeCompare(String(a.added||'')));

    state.filtered = list;
    render(list);
  }

  function buildFacets(){
    els.lang.innerHTML   = facetHtml('lang',  allFacetValues(state.all,'language'));
    els.license.innerHTML= facetHtml('lic',   uniq(state.all.map(r=>r.license || 'See source')));
    els.media.innerHTML  = facetHtml('media', allFacetValues(state.all,'media'));
    els.topics.innerHTML = facetHtml('topic', allFacetValues(state.all,'topics'));

    [els.lang, els.license, els.media, els.topics].forEach(el => el.addEventListener('change', applyFilters));
    els.topicSearch.addEventListener('input', applyFilters);
    els.licenseSearch.addEventListener('input', applyFilters);
    els.q.addEventListener('input', applyFilters);
    els.qBtn.addEventListener('click', applyFilters);
    els.sort.addEventListener('change', applyFilters);
  }

  async function init(){
    try{
      const res = await fetch('data/oer.json', {cache:'no-store'});
      const json = await res.json();
      state.all = Array.isArray(json) ? json : (json.resources || []);
      buildFacets();
      applyFilters();
    }catch(e){
      console.error('Failed to load data/oer.json', e);
      els.grid.innerHTML = '<div class="col-12"><div class="empty">Could not load OER data. Ensure <code>data/oer.json</code> exists and is valid.</div></div>';
    }
  }
  init();
})();
