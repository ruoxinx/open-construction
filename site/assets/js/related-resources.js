/* SPDX-License-Identifier: Apache-2.0 */

(() => {
  const root = document.getElementById('relatedRoot');
  if (!root) return;

  const resourceTypes = ['model', 'dataset', 'workflow', 'oer'];
  const params = new URLSearchParams(window.location.search);
  const sourceType = normalizeType(params.get('source_type') || params.get('type'));
  const sourceId = params.get('source_id') || params.get('id') || '';
  const initialTarget = normalizeType(params.get('target_type') || params.get('target') || 'all');
  const state = {
    types: new Set(initialTarget === 'all' ? resourceTypes : [initialTarget]),
    tasks: new Set(),
    modalities: new Set(),
    query: '',
    yearMin: 0,
    yearMax: 0,
    sort: 'relevance'
  };

  function normalizeType(value){
    const type = String(value || '').trim().toLowerCase().replace(/s$/, '');
    return resourceTypes.includes(type) ? type : (type === 'all' ? 'all' : 'all');
  }

  function escapeHtml(value){
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function list(value){
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(list).filter(Boolean);
    if (typeof value === 'object') return list(value.name || value.title || value.label || '');
    return String(value).split(/[;,|\n]/).map(item => item.trim()).filter(Boolean);
  }

  function key(value){
    return String(value || '').trim().toLowerCase().replace(/[\u2013\u2014]/g, '-').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function overlap(left, right){
    const a = new Set(list(left).map(key).filter(Boolean));
    const b = new Set(list(right).map(key).filter(Boolean));
    let score = 0;
    a.forEach(item => { if (b.has(item)) score += 1; });
    return score;
  }

  function modalityValues(value){
    if (!list(value).length) return [];
    if (window.OCTerms?.canonicalizeModalityLabels) {
      return window.OCTerms.canonicalizeModalityLabels(value);
    }
    return displayFacetValues(value);
  }

  function modalityOverlap(left, right){
    return overlap(modalityValues(left), modalityValues(right));
  }

  function modalityFamilies(value){
    const raw = list(value).join(' ').toLowerCase();
    if (!raw) return [];
    const families = [];
    const add = (label, pattern) => { if (pattern.test(raw)) families.push(label); };
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
    return families;
  }

  function taskFamilies(value){
    const families = [];
    list(value).forEach(term => {
      const raw = key(term);
      if (!raw) return;
      if (/segment/.test(raw)) families.push('segmentation');
      if (/reconstruction|structure from motion|scan to bim|2d to bim|bim reconstruction|model generation/.test(raw)) families.push('reconstruction');
      if (/detect/.test(raw)) families.push('detection');
      if (/classif/.test(raw)) families.push('classification');
      if (/caption|retrieval/.test(raw)) families.push('vision-language');
      if (/slam|localization|mapping/.test(raw)) families.push('spatial-mapping');
      if (/change detection|change segmentation/.test(raw)) families.push('change-analysis');
      if (/pose/.test(raw)) families.push('pose');
      if (/question answering|qa|querying/.test(raw)) families.push('qa');
    });
    return [...new Set(families)];
  }

  function applicationFamilies(value){
    const families = [];
    list(value).forEach(term => {
      const raw = key(term);
      if (!raw) return;
      if (/building model|mesh generation|digital twin generation|bim authoring|bim reconstruction|scan to bim|text to bim|floorplan to bim|design brief automation|lod3|lod4/.test(raw)) families.push('building-generation');
      if (/structural condition monitoring|damage|defect|inspection|assessment|bridge inspection/.test(raw)) families.push('inspection-monitoring');
      if (/safety/.test(raw)) families.push('safety');
      if (/site understanding|progress monitoring|productivity monitoring|knowledge management/.test(raw)) families.push('site-operations');
      if (/mapping|navigation|localization/.test(raw)) families.push('mapping-navigation');
      if (/energy|hvac|building performance simulation|energy modelling/.test(raw)) families.push('energy-performance');
      if (/design|cad|conceptual design|automated structural design|layout generation|plan recognition/.test(raw)) families.push('design-automation');
      if (/compliance/.test(raw)) families.push('compliance');
      if (/asset management/.test(raw)) families.push('asset-management');
      if (/post-disaster/.test(raw)) families.push('disaster-response');
    });
    return [...new Set(families)];
  }

  function sameCatalogValue(left, right){
    const sourceValues = [left.id, left.key, left.title, left.name].map(key).filter(Boolean);
    return [right.id, right.key, right.title, right.name].some(value => value && sourceValues.includes(key(value)));
  }

  function relationScore(source, candidate){
    if (source.type === candidate.type) {
      if (source.type === 'model') {
        const taskScore = overlap(source.tasks, candidate.tasks);
        const taskFamilyScore = overlap(taskFamilies(source.tasks), taskFamilies(candidate.tasks));
        const applicationScore = overlap(source.applications, candidate.applications);
        const applicationFamilyScore = overlap(applicationFamilies(source.applications), applicationFamilies(candidate.applications));
        const modalityScore = modalityOverlap(source.modalities, candidate.modalities);
        const modalityFamilyScore = overlap(modalityFamilies(source.modalities), modalityFamilies(candidate.modalities));
        const sharedTrainingScore = overlap(source.training_data, candidate.training_data);
        const score = sharedTrainingScore * 6 + taskScore * 4 + taskFamilyScore * 2 + applicationScore * 2 + applicationFamilyScore + modalityFamilyScore * 2 + modalityScore;
        const hasStrongSignal =
          sharedTrainingScore > 0 ||
          (taskScore > 0 && modalityFamilyScore > 0) ||
          (taskScore > 0 && applicationScore > 0) ||
          (taskFamilyScore > 0 && modalityFamilyScore > 0) ||
          (applicationScore > 0 && modalityFamilyScore > 0);
        return hasStrongSignal ? score : 0;
      }
      if (source.type === 'dataset') return overlap(source.potential_tasks, candidate.potential_tasks) * 4 + overlap(source.applications, candidate.applications) * 2 + modalityOverlap(source.data_modality, candidate.data_modality) * 2 + overlap(source.classes, candidate.classes);
      if (source.type === 'workflow') return overlap(source.applications, candidate.applications) * 4 + overlap(source.ai_tech, candidate.ai_tech) * 3 + overlap(source.stakeholders, candidate.stakeholders) * 2 + modalityOverlap(source.data_modalities, candidate.data_modalities);
      return overlap(source.topics, candidate.topics) * 4 + overlap(source.media, candidate.media) * 2 + overlap(source.language, candidate.language);
    }
    const sourceTasks = source.tasks || source.potential_tasks;
    const candidateTasks = candidate.tasks || candidate.potential_tasks;
    const sourceModalities = source.modalities || source.data_modalities || source.data_modality;
    const candidateModalities = candidate.modalities || candidate.data_modalities || candidate.data_modality;
    const sourceApps = source.applications || source.application;
    const candidateApps = candidate.applications || candidate.application;
    const directDataMatch = source.type === 'model' && candidate.type === 'dataset' && list(source.training_data || source.datasets || source.dataset).some(item => [candidate.id, candidate.name].some(value => key(item) === key(value)));
    const reverseDataMatch = source.type === 'dataset' && candidate.type === 'model' && list(candidate.training_data || candidate.datasets || candidate.dataset).some(item => [source.id, source.name].some(value => key(item) === key(value)));
    return (directDataMatch || reverseDataMatch ? 10 : 0) + overlap(sourceTasks, candidateTasks) * 3 + overlap(sourceApps, candidateApps) * 2 + modalityOverlap(sourceModalities, candidateModalities) * 2 + overlap(source.topics, candidate.topics) * 2 + overlap(source.ai_tech, candidate.ai_tech);
  }

  function normalizeModel(item){ return { ...item, type: 'model', key: item.id || item.title || item.name || '', title: item.title || item.name || item.id || 'Untitled model', year: item.year || '', tasks: item.tasks || item.task || item.potential_tasks || [], applications: item.applications || item.application || [], modalities: item.modalities || item.modality || item.data_modalities || [], training_data: item.training_data || item.datasets || item.dataset || [] }; }
  function normalizeDataset(item, id){ return { ...item, type: 'dataset', key: item.id || id || item.name || '', id: item.id || id || '', title: item.name || item.title || item.id || id || 'Untitled dataset', year: item.year || '', potential_tasks: item.potential_tasks || item.tasks || item.task || [], applications: item.applications || item.application || item.use_cases || item.use_case || [], data_modality: item.data_modality || item.data_modalities || item.modality || [], classes: item.classes || [] }; }
  function normalizeWorkflow(item){ return { ...item, type: 'workflow', key: item.id || item.title || '', title: item.title || 'Untitled workflow', year: item.year || '', applications: item.applications || [], ai_tech: item.ai_tech || [], stakeholders: item.stakeholders || [], data_modalities: item.data_modalities || [] }; }
  function normalizeOer(item){ return { ...item, type: 'oer', key: item.id || item.title || '', title: item.title || 'Untitled OER', year: item.year || '', topics: item.topics || [], media: item.media || [], language: item.language || [] }; }

  function href(item){
    const id = encodeURIComponent(item.key || item.title);
    if (item.type === 'model') return `models/details.html?id=${id}`;
    if (item.type === 'dataset') return `datasets/detail.html?id=${id}`;
    if (item.type === 'workflow') return `workflows/details.html?id=${id}`;
    return `oers/details.html?id=${id}`;
  }

  function typeLabel(type){ return ({ model: 'Model', dataset: 'Dataset', workflow: 'Workflow', oer: 'OER' })[type] || type; }

  function displayFacetValues(value){
    const labels = new Map();
    list(value).forEach(raw => {
      const label = window.OCTerms?.prettyTermLabel?.(raw) || String(raw).trim();
      const canonical = key(label);
      if (canonical && !labels.has(canonical)) labels.set(canonical, label);
    });
    return [...labels.values()];
  }

  function displayModalityValues(value){
    return modalityValues(value).map(label => String(label).trim()).filter(Boolean);
  }

  function itemFacets(item){
    if (item.type === 'model') return { tasks: displayFacetValues(item.tasks), modalities: displayModalityValues(item.modalities), meta: [displayFacetValues(item.tasks)[0], displayModalityValues(item.modalities)[0], displayFacetValues(item.applications)[0]] };
    if (item.type === 'dataset') return { tasks: displayFacetValues(item.potential_tasks), modalities: displayModalityValues(item.data_modality), meta: [displayFacetValues(item.potential_tasks)[0], displayModalityValues(item.data_modality)[0], displayFacetValues(item.applications)[0]] };
    if (item.type === 'workflow') return { tasks: displayFacetValues(item.applications), modalities: displayModalityValues(item.data_modalities), meta: [item.phase, displayFacetValues(item.applications)[0], displayFacetValues(item.ai_tech)[0]] };
    return { tasks: displayFacetValues(item.topics), modalities: displayFacetValues(item.media), meta: [displayFacetValues(item.topics)[0], displayFacetValues(item.media)[0]] };
  }

  function facetOptions(items, field){
    const counts = new Map();
    items.forEach(item => itemFacets(item)[field].forEach(value => {
      const canonical = key(value);
      if (!canonical) return;
      const entry = counts.get(canonical) || { label: String(value).trim(), count: 0 };
      entry.count += 1;
      if ((String(value).match(/[A-Z]/g) || []).length > (entry.label.match(/[A-Z]/g) || []).length) entry.label = String(value).trim();
      counts.set(canonical, entry);
    }));
    return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 8).map(entry => [entry.label, entry.count, key(entry.label)]);
  }

  function queryHref(){
    const next = new URLSearchParams();
    if (sourceType !== 'all') next.set('source_type', sourceType);
    if (sourceId) next.set('source_id', sourceId);
    return `related-resources.html?${next.toString()}`;
  }

  function renderFilterGroup(id, label, options, selected, kind){
    const html = options.length ? options.map(([value, count, canonical]) => `<label class="related-filter-option"><input type="checkbox" data-filter-kind="${kind}" value="${escapeHtml(canonical)}"${selected.has(canonical) ? ' checked' : ''}><span>${escapeHtml(value)}</span><small>${count}</small></label>`).join('') : '<span class="related-filter-empty">No options</span>';
    return `<div class="related-filter-group"><h2 class="related-filter-label" id="${id}-label">${label}</h2><div class="related-filter-options" aria-labelledby="${id}-label">${html}</div></div>`;
  }

  function renderShell(resources){
    const years = resources.map(item => Number(item.year)).filter(Number.isFinite);
    const minYear = years.length ? Math.min(...years) : new Date().getFullYear();
    const maxYear = years.length ? Math.max(...years) : minYear;
    state.yearMin = state.yearMin || minYear;
    state.yearMax = state.yearMax || maxYear;
    root.innerHTML = `<div class="related-layout"><aside class="related-filter-panel" aria-label="Filter related resources"><div class="related-filter-header"><h2>Filters</h2><button type="button" class="related-clear" id="relatedClear">Clear</button></div><div class="related-filter-body"><div class="related-filter-group"><h2 class="related-filter-label">Resource type</h2><div class="related-filter-options"><label class="related-filter-option"><input type="checkbox" data-filter-kind="type" value="model"${state.types.has('model') ? ' checked' : ''}><span>Models</span><small>${resources.filter(item => item.type === 'model').length}</small></label><label class="related-filter-option"><input type="checkbox" data-filter-kind="type" value="dataset"${state.types.has('dataset') ? ' checked' : ''}><span>Datasets</span><small>${resources.filter(item => item.type === 'dataset').length}</small></label><label class="related-filter-option"><input type="checkbox" data-filter-kind="type" value="workflow"${state.types.has('workflow') ? ' checked' : ''}><span>Workflows</span><small>${resources.filter(item => item.type === 'workflow').length}</small></label><label class="related-filter-option"><input type="checkbox" data-filter-kind="type" value="oer"${state.types.has('oer') ? ' checked' : ''}><span>OERs</span><small>${resources.filter(item => item.type === 'oer').length}</small></label></div></div>${renderFilterGroup('related-tasks-label', 'Tasks and topics', facetOptions(resources, 'tasks'), state.tasks, 'task')}${renderFilterGroup('related-modalities-label', 'Modalities and formats', facetOptions(resources, 'modalities'), state.modalities, 'modality')}<div class="related-filter-group"><h2 class="related-filter-label">Year</h2><div class="related-year-control"><div class="related-year-values"><span>From <strong id="relatedYearMinValue">${state.yearMin}</strong></span><span>To <strong id="relatedYearMaxValue">${state.yearMax}</strong></span></div><input id="relatedYearMin" type="range" min="${minYear}" max="${maxYear}" value="${state.yearMin}" aria-label="Minimum year"><input id="relatedYearMax" type="range" min="${minYear}" max="${maxYear}" value="${state.yearMax}" aria-label="Maximum year"></div></div></div></aside><section class="related-results"><div class="related-results-toolbar"><div class="related-results-search"><label class="visually-hidden" for="relatedQuery">Search within related resources</label><input id="relatedQuery" type="search" placeholder="Search within related resources" aria-label="Search within related resources"></div><div class="related-results-sort"><span id="relatedResultCount">0</span> results<label class="related-sort-label" for="relatedSort">Sort by</label><select id="relatedSort"><option value="relevance">Relevance</option><option value="year-desc">Newest</option><option value="title-asc">Title A-Z</option></select></div></div><div class="related-result-panel"><div class="related-result-head"><h2>Results</h2></div><div id="relatedResultList" class="related-result-list" aria-live="polite"></div></div></section></div>`;
    root.querySelectorAll('[data-filter-kind]').forEach(input => input.addEventListener('change', () => {
      const kind = input.dataset.filterKind;
      const target = kind === 'type' ? state.types : kind === 'task' ? state.tasks : state.modalities;
      if (input.checked) target.add(input.value); else target.delete(input.value);
      renderResults(resources);
    }));
    root.querySelector('#relatedQuery').addEventListener('input', event => { state.query = event.target.value; renderResults(resources); });
    root.querySelector('#relatedSort').addEventListener('change', event => { state.sort = event.target.value; renderResults(resources); });
    root.querySelector('#relatedYearMin').addEventListener('input', event => { state.yearMin = Math.min(Number(event.target.value), state.yearMax); updateYearControls(); renderResults(resources); });
    root.querySelector('#relatedYearMax').addEventListener('input', event => { state.yearMax = Math.max(Number(event.target.value), state.yearMin); updateYearControls(); renderResults(resources); });
    root.querySelector('#relatedClear').addEventListener('click', () => { state.types = new Set(resourceTypes); state.tasks.clear(); state.modalities.clear(); state.query = ''; state.yearMin = minYear; state.yearMax = maxYear; state.sort = 'relevance'; renderShell(resources); renderResults(resources); });
    renderResults(resources);
  }

  function updateYearControls(){
    const min = root.querySelector('#relatedYearMin');
    const max = root.querySelector('#relatedYearMax');
    if (min) min.value = state.yearMin;
    if (max) max.value = state.yearMax;
    const minValue = root.querySelector('#relatedYearMinValue');
    const maxValue = root.querySelector('#relatedYearMaxValue');
    if (minValue) minValue.textContent = state.yearMin;
    if (maxValue) maxValue.textContent = state.yearMax;
  }

  function renderResults(resources){
    let visible = resources.filter(item => state.types.has(item.type));
    visible = visible.filter(item => { const facets = itemFacets(item); return (!state.tasks.size || [...state.tasks].some(value => facets.tasks.some(itemValue => key(itemValue) === value))) && (!state.modalities.size || [...state.modalities].some(value => facets.modalities.some(itemValue => key(itemValue) === value))) && (!item.year || (Number(item.year) >= state.yearMin && Number(item.year) <= state.yearMax)); });
    if (state.query.trim()) { const query = key(state.query); visible = visible.filter(item => key([item.title, item.summary, item.abstract, ...itemFacets(item).tasks, ...itemFacets(item).modalities].join(' ')).includes(query)); }
    if (state.sort === 'year-desc') visible.sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || a.title.localeCompare(b.title));
    if (state.sort === 'title-asc') visible.sort((a, b) => a.title.localeCompare(b.title));
    const listNode = root.querySelector('#relatedResultList');
    if (!listNode) return;
    root.querySelector('#relatedResultCount').textContent = visible.length.toLocaleString();
    listNode.innerHTML = visible.length ? visible.map(item => `<a class="related-result-row" href="${href(item)}"><span class="related-result-main"><span class="related-result-type">${typeLabel(item.type)}</span><span class="related-result-title">${escapeHtml(item.title)}${item.year ? ` <span class="related-result-year">(${escapeHtml(item.year)})</span>` : ''}</span><span class="related-result-meta">${escapeHtml(itemFacets(item).meta.filter(Boolean).join(' / ') || 'Resource')}</span></span><span class="related-result-arrow" aria-hidden="true">&rarr;</span></a>`).join('') : '<p class="related-result-empty mb-0">No related resources match these filters.</p>';
  }

  async function load(){
    try {
      const [models, datasets, workflows, oers] = await Promise.all([
        fetch('data/models.json', { cache: 'no-cache' }).then(response => response.json()),
        fetch('data/datasets.json', { cache: 'no-cache' }).then(response => response.json()),
        fetch('data/use-cases.json', { cache: 'no-cache' }).then(response => response.json()),
        fetch('data/oer.json', { cache: 'no-cache' }).then(response => response.json())
      ]);
      const resources = [
        ...(Array.isArray(models) ? models : Object.values(models || {})).map(normalizeModel),
        ...Object.entries(datasets || {}).map(([id, item]) => normalizeDataset(item, id)),
        ...(Array.isArray(workflows?.use_cases) ? workflows.use_cases : (Array.isArray(workflows) ? workflows : [])).map(normalizeWorkflow),
        ...(Array.isArray(oers?.resources) ? oers.resources : (Array.isArray(oers) ? oers : [])).map(normalizeOer)
      ];
      const source = resources.find(item => item.type === sourceType && (key(item.key) === key(sourceId) || key(item.title) === key(sourceId)));
      if (!source) {
        renderShell(resources);
        const context = document.getElementById('relatedContext');
        if (context) context.textContent = 'All catalog resources';
        return;
      }
      const ranked = resources.filter(item => !sameCatalogValue(source, item)).map(item => ({ item, score: relationScore(source, item) })).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score || Number(b.item.year || 0) - Number(a.item.year || 0) || a.item.title.localeCompare(b.item.title)).map(entry => entry.item);
      renderShell(ranked);
      const context = document.getElementById('relatedContext');
      if (context) context.textContent = `For: ${source.title}`;
    } catch {
      root.innerHTML = '<div class="related-result-panel"><div class="related-result-list"><p class="related-result-empty mb-0">Related resources are temporarily unavailable.</p></div></div>';
    }
  }

  load();
})();
