// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

// OER loader & renderer — mirrors Models page layout (horizontal paper-card)
(function () {
  const FACET_LIMIT = 5;
  const showAllFacets = { language:false, topics:false, licenses:false, media:false };
  const state = { all: [], filtered: [] };
  let syncingUrlState = false;
  const els = {
    grid: document.getElementById('oerGrid'),
    empty: document.getElementById('emptyState'),
    q: document.getElementById('q'),
    qDock: document.getElementById('qDock'),
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

  const placeholderImg = 'assets/img/placeholder/placeholder.png';
  const LICENSE_URLS = {
    'Apache 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'CC0': 'https://creativecommons.org/public-domain/cc0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC-BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'AGPL 3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'MIT': 'https://opensource.org/licenses/MIT',
    'ODC-BY': 'https://opendatacommons.org/licenses/by/',
    'MIT License with Commons Clause Restriction': 'https://github.com/zhu-xlab/GlobalBuildingAtlas/blob/main/LICENSE',
    'GNU 3.0': 'https://www.gnu.org/licenses/gpl-3.0.en.html',
    'BSD 3-Clause': 'https://opensource.org/license/bsd-3-clause',
    'GNU 2.1': 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en',
    'CC BY-ND 4.0': 'https://creativecommons.org/licenses/by-nd/4.0/'
  };

  // ---------- small helpers ----------
  const uniq   = a => [...new Set(a)];
  const arrify = v => (Array.isArray(v) ? v : (v == null ? [] : [v]));
  const tokens = v => arrify(v).map(x => String(x || '').trim()).filter(Boolean);
  const has    = (h, n) => String(h || '').toLowerCase().includes(String(n || '').toLowerCase());
  const cssId  = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const detailHref = r => `oers/details.html?id=${encodeURIComponent(r.id || r.title || '')}`;
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  function safeHref(href){
    if (!href) return '';
    try {
      const url = new URL(String(href).trim(), window.location.href);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
    } catch {}
    return '';
  }

  function licenseLinkHTML(license){
    if (!license) return '';
    const key = String(license).trim();
    if (!key || key.toLowerCase() === 'unspecified') return '';
    const url = LICENSE_URLS[key];
    if (!url) return esc(key);
    return `<a href="${url}" target="_blank" rel="noopener" title="View license">${esc(key)}</a>`;
  }

  const sec = (label, arr, cls='') =>
    (Array.isArray(arr) && arr.length)
      ? `<div class="tag-section">
           <div class="tag-title">${label}</div>
           <div class="tags">
             ${arr.map(t => `<span class="tag ${cls}">${esc(t)}</span>`).join('')}
           </div>
         </div>`
      : '';

  function ensureCardInteractionStyles(){
    if (document.getElementById('oer-card-click-style')) return;
    const style = document.createElement('style');
    style.id = 'oer-card-click-style';
    style.textContent = `
      .oer-card.clickable{cursor:pointer;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}
      .oer-card.clickable:hover{transform:translateY(-1px);border-color:#d7e1eb;box-shadow:0 10px 26px rgba(15,46,75,.09)}
      .oer-card.clickable:focus-visible{outline:3px solid rgba(11,102,195,.18);outline-offset:2px}
    `;
    document.head.appendChild(style);
  }

  function showSkeleton(){ if(els.skeleton){ els.skeleton.removeAttribute('hidden'); } if(els.grid){ els.grid.setAttribute('hidden',''); } }
  function hideSkeleton(){ if(els.skeleton){ els.skeleton.setAttribute('hidden',''); } if(els.grid){ els.grid.removeAttribute('hidden'); } }

  // ---------- formatting ----------
  function fmtYear(v){
    if(!v) return '';
    const onlyYear = String(v).match(/^\s*(\d{4})\s*$/);
    if (onlyYear) return onlyYear[1];
    const d = new Date(v);
    return isNaN(d) ? (String(v).match(/\d{4}/)?.[0] || '') : String(d.getFullYear());
  }
  // Matches “Added 2025-11-4” (no zero padding), per dataset cards
  function fmtAdded(v) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d)) return '';
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}-${month}-${day}`;
  }

  // ---------- normalization ----------
  function normalize(r){
    const title = r.title || r.name || r.resource_title || '';
    const provider = r.provider || r.authors || r.author || r.creator || r.publisher || '';
    const image = r.image || r.image_url || r.thumbnail || r.thumb || '';
    const source = r.source || r.url || r.link || r.href || '#';
    const language = r.language || r.languages || r.lang || [];
    const topics = r.topics || r.topic || r.tags || r.keywords || r.subjects || [];
    const media = r.media || r.media_format || r.format || r.formats || [];
    const license = r.license || r.licence || r.license_name || r.license_type || '';

    const yearRaw  = r.year || r.publication_year || r.date || r.added || r.created_at || r.updated_at || '';
    const year     = fmtYear(yearRaw);
    const addedRaw = r.added || r.added_date || r.date_added || r.created_at || r.updated_at || r.date || '';
    const added    = addedRaw;

    const contributor     = r.contributor || r.submitted_by || r.submitter || r.user || '';
    const contributor_url = r.contributor_url || r.submitter_url || r.user_url || r.profile || '';
    const publisher = r.publisher || r.published_by || '';
    const institutions = r.institutions || r.institution || r.affiliations || [];

    return {
      id: r.id || '',
      title, provider, image, source,
      language: tokens(language),
      topics: tokens(topics),
      media: tokens(media),
      license, year, added,
      contributor, contributor_url,
      publisher,
      institutions: tokens(institutions)
    };
  }

  // ---------- facets ----------
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
  function splitParam(value){
    return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
  }
  function setChecked(container, values){
    const wanted = new Set(values);
    if(!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = wanted.has(input.value);
    });
  }
  function filterFacetItems(items, query){
    if (!query) return items;
    const q = String(query).trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => item.toLowerCase().includes(q));
  }
  function getVisibleFacetItems(items, selectedValues, expanded, query){
    if (query) return items;
    if (expanded) return items;
    const selected = items.filter(item => selectedValues.includes(item));
    const selectedSet = new Set(selected);
    const remaining = items.filter(item => !selectedSet.has(item));
    return selected.concat(remaining.slice(0, Math.max(0, FACET_LIMIT - selected.length)));
  }
  function ensureToggleButton(container, btnId, facetKey, renderFn, totalCount, query){
    if (!container) return;
    let btn = document.getElementById(btnId);
    if (!btn){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = btnId;
      btn.className = 'btn btn-link p-0 facet-toggle';
      container.insertAdjacentElement('afterend', btn);
    }
    const shouldShow = totalCount > FACET_LIMIT && !query;
    btn.hidden = !shouldShow;
    btn.setAttribute('aria-expanded', showAllFacets[facetKey] ? 'true' : 'false');
    btn.textContent = showAllFacets[facetKey] ? 'Show less' : 'Show all';
    btn.onclick = ()=>{ showAllFacets[facetKey] = !showAllFacets[facetKey]; renderFn(); };
  }
  function renderFacet(container, prefix, items, selectedValues, btnId, facetKey, renderFn, query=''){
    if (!container) return;
    const visible = getVisibleFacetItems(items, selectedValues, showAllFacets[facetKey], query);
    container.innerHTML = facetHtml(prefix, visible);
    setChecked(container, selectedValues);
    ensureToggleButton(container, btnId, facetKey, renderFn, items.length, query);
  }
  function syncUrlState(){
    if (syncingUrlState) return;
    const params = new URLSearchParams();
    const q = (els.q?.value || '').trim();
    const sort = els.sort?.value || 'added-desc';
    const langs = readChecked(els.lang);
    const topics = readChecked(els.topics);
    const licenses = readChecked(els.license);
    const media = readChecked(els.media);
    const topicQ = (els.topicSearch?.value || '').trim();
    const licQ = (els.licenseSearch?.value || '').trim();

    if (q) params.set('q', q);
    if (sort !== 'added-desc') params.set('sort', sort);
    if (langs.length) params.set('language', langs.join(','));
    if (topics.length) params.set('topics', topics.join(','));
    if (licenses.length) params.set('licenses', licenses.join(','));
    if (media.length) params.set('media', media.join(','));
    if (topicQ) params.set('topicQuery', topicQ);
    if (licQ) params.set('licenseQuery', licQ);

    const query = params.toString();
    history.replaceState(null, '', query ? `${location.pathname}?${query}` : location.pathname);
  }
  function restoreStateFromUrl(){
    syncingUrlState = true;
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    if (els.q) els.q.value = q;
    if (els.qDock) els.qDock.value = q;
    if (els.sort) els.sort.value = params.get('sort') || 'added-desc';
    if (els.topicSearch) els.topicSearch.value = params.get('topicQuery') || '';
    if (els.licenseSearch) els.licenseSearch.value = params.get('licenseQuery') || '';

    renderLanguageFacet(splitParam(params.get('language')));
    renderTopicFacet(splitParam(params.get('topics')));
    renderLicenseFacet(splitParam(params.get('licenses')));
    renderMediaFacet(splitParam(params.get('media')));
    syncingUrlState = false;
  }
  function allFacetValues(list, key){
    return uniq(list.flatMap(r => tokens(r[key]))).sort((a,b)=>a.localeCompare(b));
  }
  function renderLanguageFacet(selectedValues = readChecked(els.lang)){
    renderFacet(els.lang, 'lang', allFacetValues(state.all,'language'), selectedValues, 'toggleLanguage', 'language', ()=>renderLanguageFacet());
  }
  function renderTopicFacet(selectedValues = readChecked(els.topics)){
    const q = (els.topicSearch?.value || '').trim();
    const items = filterFacetItems(allFacetValues(state.all,'topics'), q);
    renderFacet(els.topics, 'topic', items, selectedValues, 'toggleTopics', 'topics', ()=>renderTopicFacet(), q);
  }
  function renderLicenseFacet(selectedValues = readChecked(els.license)){
    const q = (els.licenseSearch?.value || '').trim();
    const items = filterFacetItems(uniq(state.all.map(r=>r.license || 'See source')).sort((a,b)=>a.localeCompare(b)), q);
    renderFacet(els.license, 'lic', items, selectedValues, 'toggleLicenses', 'licenses', ()=>renderLicenseFacet(), q);
  }
  function renderMediaFacet(selectedValues = readChecked(els.media)){
    renderFacet(els.media, 'media', allFacetValues(state.all,'media'), selectedValues, 'toggleMedia', 'media', ()=>renderMediaFacet());
  }

  // ---------- renderer (mirrors Models “paper-card”) ----------
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
      const href  = detailHref(r);
      const addedTxt = r.added ? `Added ${fmtAdded(r.added)}` : '';
      const year  = r.year;
      const sourceHref = safeHref(r.source);
      const contributorHref = safeHref(r.contributor_url);
      const providerLine = r.provider || '';
      const licHTML = licenseLinkHTML(r.license);
      const tagsHTML =
        sec('Topics', r.topics, 'topic') +
        sec('Media', r.media, 'media') +
        sec('Language', r.language, 'lang') +
        (r.publisher ? sec('Publisher', [r.publisher], 'publisher') : '') +
        (r.institutions.length ? sec('Institution(s)', r.institutions, 'inst') : '');

      const submittedByHTML = r.contributor
        ? `<div class="submitted-by">
             ${contributorHref
               ? `<a href="${contributorHref}" target="_blank" rel="noopener">Submitted by <strong>${esc(String(r.contributor).startsWith('@') ? r.contributor : '@'+r.contributor)}</strong></a>`
               : `Submitted by <strong>${esc(String(r.contributor).startsWith('@') ? r.contributor : '@'+r.contributor)}</strong>`}
           </div>`
        : '';

      els.grid.insertAdjacentHTML('beforeend', `
        <div class="col-12">
          <article class="oer-card clickable" tabindex="0" role="link" aria-label="View details for ${esc(r.title || 'this OER')}" data-detail-href="${href}">
            <div class="d-flex gap-3 align-items-start">
              <div class="left">
                <img src="${img}" alt="${esc(r.title)} image" onerror="this.src='${placeholderImg}'">
                ${submittedByHTML}
              </div>

              <div class="flex-grow-1">
                <h3 class="h6 title mb-1">
                  <a href="${href}" class="text-decoration-none text-dark">
                    ${esc(r.title)}
                  </a>
                </h3>
                <div class="meta mb-2">
                  ${providerLine ? `${esc(providerLine)}` : ''}${year ? ` • ${esc(year)}` : ''}${licHTML ? ` · ${licHTML}` : ''}
                </div>

                ${tagsHTML}

                <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
                  ${sourceHref ? `<a class="btn btn-sm btn-primary" href="${sourceHref}" target="_blank" rel="noopener">Source</a>` : ''}
                  <a class="btn btn-sm btn-outline-secondary" href="${href}">View Details</a>
                  ${addedTxt ? `<span class="added-note">${addedTxt}</span>` : ''}
                </div>
              </div>
            </div>
          </article>
        </div>
      `);
    });
  }

  // ---------- filtering / sorting ----------
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
    syncUrlState();
  }

  function buildFacets(){
    renderLanguageFacet();
    renderLicenseFacet();
    renderMediaFacet();
    renderTopicFacet();

    [els.lang, els.license, els.media, els.topics]
      .filter(Boolean)
      .forEach(el => el.addEventListener('change', applyFilters));

    els.topicSearch?.addEventListener('input', ()=>{ renderTopicFacet(); applyFilters(); });
    els.licenseSearch?.addEventListener('input', ()=>{ renderLicenseFacet(); applyFilters(); });
    els.q?.addEventListener('input', applyFilters);
    els.qDock?.addEventListener('input', ()=>{
      if (els.q) els.q.value = els.qDock.value;
      applyFilters();
    });
    (function(){
      const SHOW_AT = 220;
      const HIDE_AT = 160;
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
      window.addEventListener('scroll', onScroll, { passive:true });
    })();
    els.qBtn?.addEventListener('click', applyFilters);
    els.sort?.addEventListener('change', applyFilters);
  }

  // ---------- data loading ----------
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
      ensureCardInteractionStyles();
      const yearNow = document.getElementById('yearNow');
      if (yearNow) yearNow.textContent = new Date().getFullYear();
      const paths = Array.isArray(window.OER_JSON_PATHS) && window.OER_JSON_PATHS.length
        ? window.OER_JSON_PATHS
        : ['data/oer.json','../data/oer.json','/data/oer.json'];

      const raw = await fetchWithFallback(paths);
      const arr = Array.isArray(raw) ? raw : (raw.resources || raw.items || raw.data || []);
      if (!Array.isArray(arr)) throw new Error('Unsupported JSON structure (expected array or {resources:[]}).');

      state.all = arr.map(normalize);

      if (window.OER_ENABLE_DEBUG) {
        console.log(`[OER] loaded ${state.all.length} resources`);
        console.debug('[OER] sample normalized item', state.all[0]);
      }

      buildFacets();
      restoreStateFromUrl();
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

  document.addEventListener('click', (e)=>{
    const card = e.target.closest('.oer-card.clickable');
    if(!card) return;
    if(e.target.closest('a, button, input, label, select, textarea, summary')) return;
    const href = card.dataset.detailHref;
    if(href) window.location.href = href;
  });

  document.addEventListener('keydown', (e)=>{
    const card = e.target.closest('.oer-card.clickable');
    if(!card) return;
    if(e.target.closest('a, button, input, label, select, textarea, summary')) return;
    if(e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const href = card.dataset.detailHref;
    if(href) window.location.href = href;
  });
})();
