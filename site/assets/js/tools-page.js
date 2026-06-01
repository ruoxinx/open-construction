// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

(() => {
  const root = document.getElementById('tools-root');
  const chipsEl = document.getElementById('filters');
  const summaryEl = document.getElementById('filtersNote');
  const searchInput = document.getElementById('toolSearch');
  const sortSelect = document.getElementById('toolSort');
  const clearBtn = document.getElementById('clearFiltersBtn');
  const copyPageBtn = document.getElementById('copyToolsPageBtn');
  const stackButtons = Array.from(document.querySelectorAll('[data-stack]'));
  const stackOutput = document.getElementById('stackOutput');
  const stackMeta = document.getElementById('stackMeta');
  const statTools = document.getElementById('statTools');
  const statCategories = document.getElementById('statCategories');
  const shortlistBar = document.getElementById('shortlistBar');
  const shortlistCount = document.getElementById('shortlistCount');
  const shortlistList = document.getElementById('shortlistList');
  const shortlistEmpty = document.getElementById('shortlistEmpty');
  const shortlistCopyBtn = document.getElementById('copyShortlistBtn');
  const shortlistClearBtn = document.getElementById('clearShortlistBtn');

  if (!root || !chipsEl) return;

  const STACKS = {
    starter: {
      title: 'Starter Labeling Stack',
      description: 'A fast setup for small teams validating an annotation process before scaling up.',
      tools: ['LabelMe', 'GitHub', 'DVC']
    },
    reproducible: {
      title: 'Reproducible Research Stack',
      description: 'A dependable setup for experiments, collaboration, and publishing traceable outputs.',
      tools: ['GitHub', 'DVC', 'MLflow', 'Zenodo']
    },
    geospatial: {
      title: '3D / Geospatial Stack',
      description: 'A practical mix for point clouds, drone outputs, mapping, and browser delivery.',
      tools: ['OpenDroneMap', 'CloudCompare', 'GDAL', 'QGIS', 'Potree']
    },
    publishing: {
      title: 'Open Release Stack',
      description: 'A lightweight publishing path for discoverability, citation, and long-term reuse.',
      tools: ['GitHub', 'Hugging Face Hub', 'Zenodo', 'OSF']
    }
  };

  let sections = [];
  let selectedCategories = new Set(['__all__']);
  let shortlist = new Set();
  let activeStack = 'starter';

  function esc(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(str){
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function normalize(str){
    return String(str || '').toLowerCase().trim();
  }

  function copyText(text){
    if (!text) return Promise.resolve(false);
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    return Promise.resolve(false);
  }

  function bookmarkIcon(){
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="oc-bookmark-fill" d="M6 3.75h12v16.5l-6-3.4-6 3.4z"></path><path d="M6 3.75h12v16.5l-6-3.4-6 3.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path></svg>`;
  }

  function flattenSections(rawSections){
    return rawSections.map(section => ({
      ...section,
      slug: slugify(section.title),
      items: (section.items || []).map(tool => ({
        ...tool,
        category: section.title,
        categorySlug: slugify(section.title),
        searchBlob: normalize([
          section.title,
          section.kicker,
          section.subtitle,
          tool.name,
          tool.summary,
          ...(Array.isArray(tool.details) ? tool.details : [])
        ].join(' '))
      }))
    }));
  }

  function allTools(){
    return sections.flatMap(section => section.items || []);
  }

  function getVisibleSections(){
    const query = normalize(searchInput?.value || '');
    const sort = sortSelect?.value || 'featured';
    const categoryFilter = selectedCategories.has('__all__')
      ? null
      : selectedCategories;

    const filtered = sections.map(section => {
      let items = (section.items || []).filter(tool => {
        if (categoryFilter && !categoryFilter.has(tool.categorySlug)) return false;
        if (!query) return true;
        return tool.searchBlob.includes(query);
      });

      if (sort === 'name-asc') {
        items = items.slice().sort((a, b) => a.name.localeCompare(b.name));
      } else if (sort === 'name-desc') {
        items = items.slice().sort((a, b) => b.name.localeCompare(a.name));
      } else if (sort === 'docs-first') {
        items = items.slice().sort((a, b) => Number(Boolean(b.docs)) - Number(Boolean(a.docs)) || a.name.localeCompare(b.name));
      }

      return { ...section, items };
    }).filter(section => section.items.length);

    if (sort === 'category-asc') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    return filtered;
  }

  function renderChips(){
    const totalTools = allTools().length;
    const selected = selectedCategories;
    const chipHtml = [
      {
        value: '__all__',
        label: 'All',
        count: totalTools
      },
      ...sections.map(section => ({
        value: section.slug,
        label: section.title,
        count: section.items.length
      }))
    ].map(item => `
      <button type="button" class="tool-chip${selected.has(item.value) ? ' active' : ''}" data-chip="${esc(item.value)}" aria-pressed="${selected.has(item.value) ? 'true' : 'false'}">
        <span>${esc(item.label)}</span>
        <span class="tool-chip-count">${item.count}</span>
      </button>
    `).join('');

    chipsEl.innerHTML = chipHtml;
  }

  function toolActions(tool){
    const selected = shortlist.has(tool.name);
    const docs = tool.docs ? `<a class="mini-link" href="${esc(tool.docs)}" target="_blank" rel="noopener">Docs</a>` : '';
    const repo = tool.repo ? `<a class="mini-link" href="${esc(tool.repo)}" target="_blank" rel="noopener">Repo</a>` : '';
    const site = tool.url ? `<a class="mini-link" href="${esc(tool.url)}" target="_blank" rel="noopener">Website</a>` : '';
    const links = [site, docs, repo].filter(Boolean).join('');

    return `
      <div class="tool-card-actions">
        <div class="tool-link-row">${links}</div>
        <button type="button" class="bookmark-btn${selected ? ' active' : ''}" data-bookmark="${esc(tool.name)}" aria-pressed="${selected ? 'true' : 'false'}" aria-label="${selected ? 'Remove from shortlist' : 'Save to shortlist'}" title="${selected ? 'Remove from shortlist' : 'Save to shortlist'}">
          ${bookmarkIcon()}
        </button>
      </div>
    `;
  }

  function renderTool(tool){
    return `
      <article class="tool-card">
        <div class="tool-card-top">
          <div>
            <div class="tool-badge">${esc(tool.category)}</div>
            <h3 class="tool-name"><a href="${esc(tool.url || tool.docs || tool.repo || '#')}" target="_blank" rel="noopener">${esc(tool.name)}</a></h3>
          </div>
        </div>
        <p class="tool-summary">${esc(tool.summary || 'Useful open infrastructure for AEC research and delivery.')}</p>
        ${Array.isArray(tool.details) && tool.details.length ? `
          <ul class="tool-points">
            ${tool.details.slice(0, 3).map(detail => `<li>${esc(detail)}</li>`).join('')}
          </ul>
        ` : ''}
        ${toolActions(tool)}
      </article>
    `;
  }

  function renderSections(){
    const visibleSections = getVisibleSections();
    const query = normalize(searchInput?.value || '');
    const visibleCount = visibleSections.reduce((sum, section) => sum + section.items.length, 0);
    const label = visibleCount === 1 ? 'tool' : 'tools';
    summaryEl.textContent = query
      ? `${visibleCount} ${label} match "${searchInput.value.trim()}"`
      : `${visibleCount} ${label} across ${visibleSections.length || 0} categories`;

    if (!visibleSections.length) {
      root.innerHTML = `
        <section class="empty-state">
          <h2>No tools matched this filter</h2>
          <p>Try a broader keyword, switch the sort, or turn categories back on.</p>
        </section>
      `;
      return;
    }

    root.innerHTML = visibleSections.map(section => `
      <section class="tool-section" id="${esc(section.slug)}">
        <div class="section-head">
          <div>
            <div class="section-kicker">${esc(section.kicker || 'Tool category')}</div>
            <h2 class="section-title">${esc(section.title)}</h2>
          </div>
          <div class="section-meta">${section.items.length} tool${section.items.length === 1 ? '' : 's'}</div>
        </div>
        ${section.subtitle ? `<p class="section-subtitle">${esc(section.subtitle)}</p>` : ''}
        <div class="tool-grid">
          ${section.items.map(renderTool).join('')}
        </div>
      </section>
    `).join('');
  }

  function renderStack(key){
    const stack = STACKS[key] || STACKS.starter;
    activeStack = key in STACKS ? key : 'starter';
    stackButtons.forEach(button => {
      const active = button.dataset.stack === activeStack;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const byName = new Map(allTools().map(tool => [tool.name, tool]));
    const stackTools = stack.tools.map(name => byName.get(name)).filter(Boolean);

    stackMeta.textContent = `${stackTools.length} recommended tool${stackTools.length === 1 ? '' : 's'}`;
    stackOutput.innerHTML = `
      <div class="stack-summary">
        <h3>${esc(stack.title)}</h3>
        <p>${esc(stack.description)}</p>
      </div>
      <div class="stack-cards">
        ${stackTools.map(tool => `
          <article class="stack-card">
            <div class="stack-card-top">
              <span class="tool-badge">${esc(tool.category)}</span>
              <button type="button" class="stack-save${shortlist.has(tool.name) ? ' active' : ''}" data-bookmark="${esc(tool.name)}" aria-pressed="${shortlist.has(tool.name) ? 'true' : 'false'}" aria-label="${shortlist.has(tool.name) ? 'Remove from shortlist' : 'Save to shortlist'}" title="${shortlist.has(tool.name) ? 'Remove from shortlist' : 'Save to shortlist'}">
                ${bookmarkIcon()}
              </button>
            </div>
            <h4><a href="${esc(tool.url || tool.docs || tool.repo || '#')}" target="_blank" rel="noopener">${esc(tool.name)}</a></h4>
            <p>${esc(tool.summary)}</p>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderShortlist(){
    const tools = Array.from(shortlist).map(name => allTools().find(tool => tool.name === name)).filter(Boolean);
    shortlistBar.hidden = tools.length === 0;
    shortlistCount.textContent = String(tools.length);
    shortlistEmpty.hidden = tools.length !== 0;
    shortlistList.innerHTML = tools.map(tool => `
      <div class="shortlist-item">
        <div>
          <div class="shortlist-name">${esc(tool.name)}</div>
          <div class="shortlist-meta">${esc(tool.category)}</div>
        </div>
        <button type="button" class="shortlist-remove" data-bookmark="${esc(tool.name)}" aria-label="Remove ${esc(tool.name)} from shortlist">Remove</button>
      </div>
    `).join('');
  }

  function updateUi(){
    renderChips();
    renderSections();
    renderStack(activeStack);
    renderShortlist();
  }

  function clearFilters(){
    selectedCategories = new Set(['__all__']);
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'featured';
    updateUi();
  }

  chipsEl.addEventListener('click', event => {
    const button = event.target.closest('[data-chip]');
    if (!button) return;
    const value = button.dataset.chip;
    if (value === '__all__') {
      selectedCategories = new Set(['__all__']);
      updateUi();
      return;
    }

    selectedCategories.delete('__all__');
    if (selectedCategories.has(value)) selectedCategories.delete(value);
    else selectedCategories.add(value);
    if (!selectedCategories.size) selectedCategories = new Set(['__all__']);
    updateUi();
  });

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-bookmark]');
    if (!button) return;
    const name = button.dataset.bookmark;
    if (!name) return;
    if (shortlist.has(name)) shortlist.delete(name);
    else shortlist.add(name);
    updateUi();
  });

  stackOutput.addEventListener('click', event => {
    const button = event.target.closest('[data-bookmark]');
    if (!button) return;
    const name = button.dataset.bookmark;
    if (!name) return;
    if (shortlist.has(name)) shortlist.delete(name);
    else shortlist.add(name);
    updateUi();
  });

  stackButtons.forEach(button => {
    button.addEventListener('click', () => renderStack(button.dataset.stack));
  });

  searchInput?.addEventListener('input', renderSections);
  sortSelect?.addEventListener('change', renderSections);
  clearBtn?.addEventListener('click', clearFilters);

  copyPageBtn?.addEventListener('click', async () => {
    const ok = await copyText(window.location.href);
    copyPageBtn.textContent = ok ? 'Link copied' : 'Copy failed';
    window.setTimeout(() => { copyPageBtn.textContent = 'Copy page link'; }, 1500);
  });

  shortlistCopyBtn?.addEventListener('click', async () => {
    const tools = Array.from(shortlist).map(name => allTools().find(tool => tool.name === name)).filter(Boolean);
    const text = tools.map(tool => `- ${tool.name} (${tool.category})${tool.url ? ` - ${tool.url}` : ''}`).join('\n');
    const ok = await copyText(text);
    shortlistCopyBtn.textContent = ok ? 'Copied' : 'Copy failed';
    window.setTimeout(() => { shortlistCopyBtn.textContent = 'Copy shortlist'; }, 1500);
  });

  shortlistClearBtn?.addEventListener('click', () => {
    shortlist.clear();
    updateUi();
  });

  document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement !== searchInput) {
      event.preventDefault();
      searchInput?.focus();
      searchInput?.select();
    }
  });

  fetch('data/tools.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Failed to load tools');
      return response.json();
    })
    .then(data => {
      sections = flattenSections(data?.sections || []);
      if (statTools) statTools.textContent = String(allTools().length);
      if (statCategories) statCategories.textContent = String(sections.length);
      updateUi();
    })
    .catch(() => {
      root.innerHTML = `
        <section class="empty-state">
          <h2>Couldn't load tools right now</h2>
          <p>Please try again after the catalog data is available.</p>
        </section>
      `;
      summaryEl.textContent = 'Catalog unavailable';
    });
})();
