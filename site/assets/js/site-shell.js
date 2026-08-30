// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

(() => {
  const AWARD_URL = 'https://www.nsf.gov/awardsearch/show-award?AWD_ID=2612086';
  const LINKEDIN_URL = 'https://www.linkedin.com/company/openconstruction-open-science-initiative/';
  const GITHUB_URL = 'https://github.com/ruoxinx/open-construction';
  const scriptSrc = document.currentScript?.getAttribute('src') || 'assets/js/site-shell.js';
  const assetPrefix = scriptSrc.replace(/assets\/js\/site-shell\.js(?:\?.*)?$/, 'assets/');

  const ROUTE_BY_FILE = {
    '': 'index',
    'index': 'index',
    'index.html': 'index',
    'dataset': 'dataset',
    'dataset.html': 'dataset',
    'taxonomy': 'dataset',
    'taxonomy.html': 'dataset',
    'models': 'models',
    'models.html': 'models',
    'deployments': 'deployments',
    'deployments.html': 'deployments',
    'workflows': 'deployments',
    'workflow': 'deployments',
    'oer': 'oer',
    'oer.html': 'oer',
    'oers': 'oer',
    'benchmarks': 'catalog_analytics',
    'benchmarks.html': 'catalog_analytics',
    'benchmark_explorer': 'benchmark_explorer',
    'benchmark_explorer.html': 'benchmark_explorer',
    'benchmark_task': 'benchmark_explorer',
    'benchmark_task.html': 'benchmark_explorer',
    'benchmark_results': 'benchmark_explorer',
    'benchmark_results.html': 'benchmark_explorer',
    'object_class': 'benchmark_explorer',
    'object_class.html': 'benchmark_explorer',
    'tutorials': 'learn',
    'tutorials.html': 'learn',
    'references': 'learn',
    'references.html': 'learn',
    'schema': 'docs',
    'schema.html': 'docs',
    'guides': 'docs',
    'guides.html': 'docs',
    'mcp': 'docs',
    'mcp.html': 'docs',
    'contribute': 'contribute',
    'contribute.html': 'contribute',
    'contributors': 'contributors',
    'contributors.html': 'contributors',
    'monthly-highlights': 'contributors',
    'monthly-highlights.html': 'contributors',
    'account': 'account',
    'account.html': 'account',
    'maintainer': 'account',
    'maintainer.html': 'account'
  };

  const SECTION_ROUTE_BY_PATH = [
    { pattern: /\/datasets\//, route: 'dataset' },
    { pattern: /\/models\//, route: 'models' },
    { pattern: /\/workflows\//, route: 'deployments' },
    { pattern: /\/oers\//, route: 'oer' }
  ];

  const ROUTE_GROUPS = {
    libraries: new Set(['dataset', 'models', 'deployments', 'oer']),
    insights: new Set(['catalog_analytics', 'benchmark_explorer']),
    learn: new Set(['learn'])
  };

  const CATALOG_TITLE_FILES = new Set(['dataset.html', 'models.html', 'deployments.html', 'oer.html']);
  const DOCS_TITLE_FILES = new Set(['tutorials.html', 'references.html', 'schema.html', 'guides.html', 'mcp.html']);
  const PAGE_TITLE_FILES = new Set(['benchmarks.html', 'benchmark_explorer.html', 'contribute.html', 'contributors.html']);

  const CATALOG_META = {
    dataset: {
      label: 'Datasets',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="oc-icon-fill" d="M4 7.2 12 3.8l8 3.4-8 3.4-8-3.4Z"></path><path d="M4 7.2 12 3.8l8 3.4-8 3.4-8-3.4Z"></path><path d="m4 12 8 3.4 8-3.4"></path><path d="m4 16.8 8 3.4 8-3.4"></path></svg>'
    },
    models: {
      label: 'Models',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="oc-icon-fill" cx="7" cy="8" r="2.5"></circle><circle class="oc-icon-fill" cx="17" cy="6" r="2.5"></circle><circle class="oc-icon-fill" cx="17" cy="18" r="2.5"></circle><circle cx="7" cy="8" r="2.5"></circle><circle cx="17" cy="6" r="2.5"></circle><circle cx="17" cy="18" r="2.5"></circle><path d="m9.4 7.5 5.2-1"></path><path d="m8.7 10 6.6 6"></path><path d="M7 10.5v4.8"></path><circle cx="7" cy="17.8" r="1.8"></circle></svg>'
    },
    deployments: {
      label: 'Workflows',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2.5"></circle><circle cx="18" cy="18" r="2.5"></circle><path d="M8.5 6H12a3 3 0 0 1 3 3v6"></path><path d="m12.5 12 2.5 3 2.5-3"></path></svg>'
    },
    oer: {
      label: 'OERs',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"></path><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21.5v-16Z"></path></svg>'
    }
  };

  const DOCS_META = {
    'tutorials.html': {
      label: 'Tutorial',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"></rect><path d="m10 9 5 3-5 3V9Z"></path></svg>'
    },
    'references.html': {
      label: 'Documentation',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2"></rect><path d="M8.5 8h7"></path><path d="M8.5 12h7"></path><path d="M8.5 16h4.5"></path><path d="M17 3.5v4h2"></path></svg>'
    },
    'schema.html': {
      label: 'Schema',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"></rect><path d="M8 8h8"></path><path d="M8 12h8"></path><path d="M8 16h5"></path></svg>'
    },
    'guides.html': {
      label: 'Guides',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H11v17H7.5A2.5 2.5 0 0 0 5 22V5.5Z"></path><path d="M19 5.5A2.5 2.5 0 0 0 16.5 3H13v17h3.5A2.5 2.5 0 0 1 19 22V5.5Z"></path></svg>'
    },
    'mcp.html': {
      label: 'API & MCP',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8 4 12l4 4"></path><path d="m16 8 4 4-4 4"></path><path d="m14 5-4 14"></path></svg>'
    }
  };

  const PAGE_TITLE_META = {
    'benchmarks.html': {
      label: 'Analytics',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16"></path><path d="M5 14.5 9 11l3.2 2.6L18.5 6.8"></path><path d="M14.5 6.8h4v4"></path></svg>'
    },
    'benchmark_explorer.html': {
      label: 'Benchmark',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 15.5 11-11 4 4-11 11-4-4Z"></path><path d="m8.2 11.8 1.4 1.4"></path><path d="m10.8 9.2 1.4 1.4"></path><path d="m13.4 6.6 1.4 1.4"></path></svg>'
    },
    'contribute.html': {
      label: 'Contribute',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="oc-icon-fill" d="M5 16.5h14V20H5v-3.5Z"></path><path d="M5 16.5V20h14v-3.5"></path><path d="M12 4v10"></path><path d="m8 8 4-4 4 4"></path><path d="M8.5 12.5h-2A1.5 1.5 0 0 0 5 14v2.5"></path><path d="M15.5 12.5h2A1.5 1.5 0 0 1 19 14v2.5"></path></svg>'
    },
    'contributors.html': {
      label: 'Community',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="oc-icon-fill" cx="12" cy="8" r="3"></circle><circle cx="12" cy="8" r="3"></circle><path d="M5 19c2.2-3.2 5-4.8 7-4.8s4.8 1.6 7 4.8"></path><path d="M4 15.5c1.1-1.5 2.5-2.3 4.1-2.6"></path><path d="M20 15.5c-1.1-1.5-2.5-2.3-4.1-2.6"></path></svg>'
    }
  };

  const TOP_NAV_META = {
    catalog: {
      label: 'Catalog',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.2 12 3.8l8 3.4-8 3.4-8-3.4Z"></path><path d="m4 12 8 3.4 8-3.4"></path><path d="m4 16.8 8 3.4 8-3.4"></path></svg>',
      dropdown: true
    },
    benchmarks: {
      label: 'Insights',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16"></path><path d="M5 14.5 9 11l3.2 2.6L18.5 6.8"></path><path d="M14.5 6.8h4v4"></path></svg>',
      dropdown: true
    },
    learn: {
      label: 'Learn',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9 12 4l9 5-9 5-9-5Z"></path><path d="M7 11.2v4.1c0 1.4 2.2 2.7 5 2.7s5-1.3 5-2.7v-4.1"></path><path d="M21 9v5"></path></svg>',
      dropdown: true
    },
    contribute: {
      label: 'Contribute',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16.5V20h14v-3.5"></path><path d="M12 4v10"></path><path d="m8 8 4-4 4 4"></path><path d="M8.5 12.5h-2A1.5 1.5 0 0 0 5 14v2.5"></path><path d="M15.5 12.5h2A1.5 1.5 0 0 1 19 14v2.5"></path></svg>'
    },
    contributors: {
      label: 'Community',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"></circle><path d="M5 19c2.2-3.2 5-4.8 7-4.8s4.8 1.6 7 4.8"></path></svg>'
    }
  };

  function catalogMetaForRoute(route){
    return CATALOG_META[route] || null;
  }

  function iconHtml(meta, className, modifier){
    if (!meta) return '';
    return `<span class="${className} ${modifier}" aria-hidden="true">${meta.icon}</span>`;
  }

  function catalogIconHtml(route, className){
    return iconHtml(catalogMetaForRoute(route), className, `oc-catalog-icon-${route}`);
  }

  function docsMetaForHref(href){
    return DOCS_META[fileForHref(href)] || null;
  }

  function docsIconHtml(href, className){
    const file = fileForHref(href);
    return iconHtml(DOCS_META[file], className, `oc-docs-icon-${file.replace(/\.html$/, '')}`);
  }

  function pageTitleIconHtml(file, className){
    return iconHtml(PAGE_TITLE_META[file], className, `oc-page-icon-${file.replace(/\.html$/, '')}`);
  }

  function topNavIconHtml(key){
    const meta = TOP_NAV_META[key];
    if (!meta) return '';
    return iconHtml(meta, 'oc-top-nav-icon', `oc-top-nav-icon-${key}`);
  }

  function topNavCaretHtml(){
    return '<span class="oc-top-nav-caret" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"></path></svg></span>';
  }

  function cleanFile(value){
    return String(value || '')
      .split('#')[0]
      .split('?')[0]
      .split('/')
      .pop() || '';
  }

  function routeForPath(pathname = window.location.pathname){
    const path = String(pathname || '');
    const section = SECTION_ROUTE_BY_PATH.find(item => item.pattern.test(path));
    if (section) return section.route;
    return ROUTE_BY_FILE[cleanFile(path)] || '';
  }

  function pagePrefix(){
    return assetPrefix.replace(/assets\/$/, '');
  }

  function routeForHref(href){
    if (!href) return '';
    if (String(href).trim().startsWith('#')) return '';
    try {
      const url = new URL(href, window.location.href);
      return routeForPath(url.pathname);
    } catch {
      return ROUTE_BY_FILE[cleanFile(href)] || '';
    }
  }

  function fileForHref(href){
    if (!href) return '';
    if (String(href).trim().startsWith('#')) return '';
    try {
      return cleanFile(new URL(href, window.location.href).pathname);
    } catch {
      return cleanFile(href);
    }
  }

  function markActive(element){
    if (!element) return;
    element.classList.add('active');
    element.setAttribute('aria-current', 'page');
  }

  function clearActive(nav){
    nav.querySelectorAll('.nav-link.plain.active, .dropdown-item.active').forEach(element => {
      element.classList.remove('active');
      if (element.getAttribute('aria-current') === 'page') {
        element.removeAttribute('aria-current');
      }
    });
  }

  function markDropdownParent(route){
    if (ROUTE_GROUPS.libraries.has(route)) {
      document.getElementById('ddLibraries')?.classList.add('active');
    }
    if (ROUTE_GROUPS.insights.has(route)) {
      document.getElementById('ddInsights')?.classList.add('active');
    }
    if (ROUTE_GROUPS.learn.has(route)) {
      document.getElementById('ddResourcesMenu')?.classList.add('active');
    }
  }

  function normalizeInsightsNav(navList){
    const prefix = pagePrefix();
    const existingToggle = navList.querySelector('#ddInsights');
    if (existingToggle) {
      const existingItem = existingToggle.closest('.nav-item');
      if (existingItem) existingItem.classList.add('dropdown');
      let menu = existingItem?.querySelector('.dropdown-menu');
      if (!menu && existingItem) {
        existingItem.insertAdjacentHTML('beforeend', '<ul class="dropdown-menu dropdown-menu-end" aria-labelledby="ddInsights"></ul>');
        menu = existingItem.querySelector('.dropdown-menu');
      }
      if (menu) {
        menu.innerHTML = `
          <li><a class="dropdown-item" href="${prefix}benchmarks.html">Analytics</a></li>
          <li><a class="dropdown-item" href="${prefix}benchmark_explorer.html">Benchmark</a></li>
        `;
      }
      existingToggle.classList.add('dropdown-toggle');
      existingToggle.setAttribute('data-bs-toggle', 'dropdown');
      existingToggle.setAttribute('role', 'button');
      existingToggle.setAttribute('aria-expanded', 'false');
      return existingToggle;
    }

    const insightsLink = navList.querySelector('.nav-link.plain[data-route="benchmarks"], .nav-link.plain[href$="benchmarks.html"]');
    const insightsItem = insightsLink?.closest('.nav-item');
    if (!insightsItem) return null;
    insightsItem.classList.add('dropdown');
    insightsItem.innerHTML = `
      <a class="nav-link plain dropdown-toggle" href="#" id="ddInsights" role="button" data-bs-toggle="dropdown" aria-expanded="false">Insights</a>
      <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="ddInsights">
        <li><a class="dropdown-item" href="${prefix}benchmarks.html">Analytics</a></li>
        <li><a class="dropdown-item" href="${prefix}benchmark_explorer.html">Benchmark</a></li>
      </ul>
    `;
    return insightsItem.querySelector('#ddInsights');
  }

  function normalizeHeaderNav(){
    const nav = document.querySelector('.navbar');
    const navList = nav?.querySelector('.navbar-nav');
    if (!navList || navList.dataset.ocHeaderNormalized === 'true') return;

    navList.querySelector('.nav-link.plain[data-route="index"], .nav-link.plain[href$="index.html"]')
      ?.closest('.nav-item')
      ?.remove();

    const catalogToggle = navList.querySelector('#ddLibraries, #ddCatalogs');
    if (catalogToggle) catalogToggle.textContent = 'Catalog';
    normalizeInsightsNav(navList);

    [
      { selector: '#ddLibraries, #ddCatalogs', key: 'catalog' },
      { selector: '#ddInsights, .nav-link.plain[data-route="benchmarks"], .nav-link.plain[href$="benchmarks.html"]', key: 'benchmarks' },
      { selector: '#ddResourcesMenu', key: 'learn' },
      { selector: '.nav-link.plain[data-route="contribute"], .nav-link.plain[href$="contribute.html"]', key: 'contribute' },
      { selector: '.nav-link.plain[data-route="contributors"], .nav-link.plain[href$="contributors.html"]', key: 'contributors' }
    ].forEach(({ selector, key }) => {
      const link = navList.querySelector(selector);
      const meta = TOP_NAV_META[key];
      if (!link || !meta || link.dataset.ocTopNavIcon === 'true') return;
      link.classList.add('oc-nav-link-with-icon');
      link.innerHTML = `${topNavIconHtml(key)}<span>${meta.label}</span>${meta.dropdown ? topNavCaretHtml() : ''}`;
      link.dataset.ocTopNavIcon = 'true';
    });

    navList.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
      const href = item.getAttribute('href');
      const route = routeForHref(href);
      const meta = catalogMetaForRoute(route);
      if (meta) {
        item.innerHTML = `${catalogIconHtml(route, 'oc-nav-menu-icon')}<span>${meta.label}</span>`;
        return;
      }
      const docsMeta = docsMetaForHref(href);
      if (docsMeta) {
        item.innerHTML = `${docsIconHtml(href, 'oc-nav-menu-icon')}<span>${docsMeta.label}</span>`;
        return;
      }
      const pageMeta = PAGE_TITLE_META[fileForHref(href)];
      if (pageMeta) {
        item.innerHTML = `${pageTitleIconHtml(fileForHref(href), 'oc-nav-menu-icon')}<span>${pageMeta.label}</span>`;
      }
    });

    navList.dataset.ocHeaderNormalized = 'true';
  }

  function normalizeCatalogTitle(){
    if (!CATALOG_TITLE_FILES.has(cleanFile(window.location.pathname))) return;
    const route = routeForPath();
    const meta = catalogMetaForRoute(route);
    const title = document.querySelector('header.hero h1');
    if (!meta || !title || title.dataset.ocCatalogTitleIcon === 'true') return;
    const text = title.textContent.trim();
    if (!text) return;
    title.classList.add('oc-catalog-title', `oc-catalog-title-${route}`);
    title.innerHTML = `${catalogIconHtml(route, 'oc-catalog-title-icon')}<span>${text}</span>`;
    title.dataset.ocCatalogTitleIcon = 'true';
  }

  function docsTitleForFile(file){
    if (file === 'schema.html') return document.querySelector('main h1.oc-title');
    if (file === 'mcp.html') return document.querySelector('.page-hero h1');
    return document.querySelector('header.hero h1');
  }

  function normalizeDocsTitle(){
    const file = cleanFile(window.location.pathname);
    if (!DOCS_TITLE_FILES.has(file)) return;
    const meta = DOCS_META[file];
    const title = docsTitleForFile(file);
    if (!meta || !title || title.dataset.ocDocsTitleIcon === 'true') return;
    const content = title.innerHTML.trim();
    if (!content) return;
    title.classList.add('oc-docs-title', `oc-docs-title-${file.replace(/\.html$/, '')}`);
    title.innerHTML = `${docsIconHtml(file, 'oc-docs-title-icon')}<span class="oc-docs-title-copy">${content}</span>`;
    title.dataset.ocDocsTitleIcon = 'true';
  }

  function normalizePageTitle(){
    const file = cleanFile(window.location.pathname);
    if (!PAGE_TITLE_FILES.has(file)) return;
    const meta = PAGE_TITLE_META[file];
    const title = document.querySelector('header.hero h1');
    if (!meta || !title || title.dataset.ocPageTitleIcon === 'true') return;
    const text = title.textContent.trim();
    if (!text) return;
    title.classList.add('oc-page-title', `oc-page-title-${file.replace(/\.html$/, '')}`);
    title.innerHTML = `${pageTitleIconHtml(file, 'oc-page-title-icon')}<span class="oc-page-title-copy">${text}</span>`;
    title.dataset.ocPageTitleIcon = 'true';
  }

  function normalizeYearRangeControls(){
    document.querySelectorAll('.filters .range-container').forEach(range => {
      const group = range.closest('.mb-3, .mb-1, .oc-filter-group');
      const min = range.querySelector('#yearRangeMin, input[type="range"]:first-of-type');
      const max = range.querySelector('#yearRangeMax, input[type="range"]:last-of-type');
      const readout = group?.querySelector('.small.text-muted');
      if (!group || !min || !max || !readout) return;

      readout.classList.add('oc-year-readout');
      if (readout.dataset.ocYearReadoutCleaned !== 'true') {
        Array.from(readout.childNodes).forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) node.remove();
        });
        readout.dataset.ocYearReadoutCleaned = 'true';
      }
      const minAvailable = Number(min.min);
      const maxAvailable = Number(max.max);
      const minValue = Math.min(Number(min.value) || minAvailable, Number(max.value) || maxAvailable);
      const maxValue = Math.max(Number(min.value) || minAvailable, Number(max.value) || maxAvailable);
      const hasSingleYear = Number.isFinite(minAvailable) && Number.isFinite(maxAvailable) && minAvailable === maxAvailable;

      group.classList.toggle('oc-year-single', hasSingleYear);
      if (hasSingleYear) {
        readout.dataset.singleLabel = `${minAvailable} only`;
        readout.setAttribute('aria-label', `Release year ${minAvailable} only`);
        min.disabled = true;
        max.disabled = true;
      } else {
        readout.dataset.singleLabel = '';
        readout.setAttribute('aria-label', `Release years from ${minValue} to ${maxValue}`);
        min.disabled = false;
        max.disabled = false;
      }
    });
  }

  function bindYearRangeNormalization(){
    if (document.body.dataset.ocYearRangeNormalized === 'true') return;
    document.body.dataset.ocYearRangeNormalized = 'true';
    normalizeYearRangeControls();
    window.setTimeout(normalizeYearRangeControls, 250);
    window.setTimeout(normalizeYearRangeControls, 1000);
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(normalizeYearRangeControls);
    });
    document.querySelectorAll('.filters .range-container input[type="range"]').forEach(input => {
      observer.observe(input, {
        attributes:true,
        attributeFilter:['min', 'max', 'value']
      });
      input.addEventListener('input', normalizeYearRangeControls);
      input.addEventListener('change', normalizeYearRangeControls);
    });
  }

  function normalizeFilterToggleLabels(){
    document.querySelectorAll('.facet-toggle').forEach(button => {
      const text = button.textContent.trim();
      if (text === 'Show all classes') button.textContent = 'Show all';
      if (text === 'Show less classes') button.textContent = 'Show less';
    });
  }

  function bindFilterToggleNormalization(){
    if (document.body.dataset.ocFilterToggleNormalized === 'true') return;
    document.body.dataset.ocFilterToggleNormalized = 'true';
    normalizeFilterToggleLabels();
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(normalizeFilterToggleLabels);
    });
    observer.observe(document.body, {
      childList:true,
      subtree:true,
      characterData:true
    });
  }

  async function syncProtectedNavigation(){
    const mcpLink = document.querySelector('.navbar a[href$="mcp.html"], .navbar a[href*="mcp.html"]');
    const mcpItem = mcpLink?.closest('li') || mcpLink;
    if (mcpItem) mcpItem.hidden = true;
    try {
      const canUseAgentDocs = await window.OCAuth?.canUseAgentDocs?.();
      if (mcpItem) mcpItem.hidden = !canUseAgentDocs;
    } catch (error) {
      if (mcpItem) mcpItem.hidden = true;
    }
  }

  function refreshProtectedShell(){
    syncProtectedNavigation();
    mountAiAssistant();
  }

  function bindProtectedShellRefresh(){
    if (document.body.dataset.ocProtectedShellBound === 'true') return;
    document.body.dataset.ocProtectedShellBound = 'true';
    document.addEventListener('oc:auth-user', refreshProtectedShell);
    document.addEventListener('oc:auth-roles', refreshProtectedShell);
  }

  function applyActiveNav(){
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    const currentRoute = routeForPath();
    const currentFile = cleanFile(window.location.pathname);
    clearActive(nav);

    nav.querySelectorAll('.nav-link.plain').forEach(link => {
      const linkRoute = link.dataset.route || routeForHref(link.getAttribute('href'));
      if (linkRoute && linkRoute === currentRoute) markActive(link);
    });

    nav.querySelectorAll('.dropdown-item').forEach(item => {
      const itemHref = item.getAttribute('href');
      const itemRoute = routeForHref(itemHref);
      if (itemRoute === currentRoute && (!['docs', 'learn'].includes(currentRoute) || fileForHref(itemHref) === currentFile)) {
        item.classList.add('active');
      }
    });

    markDropdownParent(currentRoute);
  }

  function setFooterYear(){
    document.querySelectorAll('#yearNow').forEach(element => {
      element.textContent = new Date().getFullYear();
    });
  }

  function injectFooterFundingStyles(){
    if (document.getElementById('ocFooterFundingStyles')) return;
    const styles = document.createElement('style');
    styles.id = 'ocFooterFundingStyles';
    styles.textContent = `
      .oc-footer-brandline{
        display:flex;
        align-items:center;
        justify-content:center;
        flex-wrap:wrap;
        gap:.42rem;
        color:inherit;
        font-weight:inherit;
        line-height:inherit;
      }
      .oc-footer-oc-logo{
        display:block;
        width:24px;
        height:24px;
        object-fit:contain;
      }
      .oc-footer-links{
        margin-top:.25rem!important;
      }
      .oc-footer-links small{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex-wrap:wrap;
        gap:.25rem .45rem;
      }
      .oc-footer-links a{
        color:var(--oc-subtle,#4f5d6c)!important;
        text-decoration:none;
      }
      .oc-footer-links a:hover,
      .oc-footer-links a:focus{
        color:var(--oc-ink,#0f2e4b)!important;
        text-decoration:underline;
        text-underline-offset:3px;
      }
      .oc-footer-socials{
        display:inline-flex;
        align-items:center;
        gap:.38rem;
      }
      .oc-footer-social-link{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:1.45rem;
        height:1.45rem;
        border-radius:999px;
        color:var(--oc-subtle,#4f5d6c)!important;
        line-height:1;
        vertical-align:middle;
        transition:background-color .15s ease, transform .15s ease;
      }
      .oc-footer-social-link:hover,
      .oc-footer-social-link:focus{
        color:var(--oc-ink,#0f2e4b)!important;
        background:#f4f7fb;
        text-decoration:none!important;
        transform:translateY(-1px);
      }
      .oc-footer-social-link svg,
      .oc-footer-social-icon{
        display:block;
        width:.95rem;
        height:.95rem;
        fill:currentColor;
        transition:opacity .15s ease;
      }
      .oc-footer-social-link[aria-label*="LinkedIn"]:hover .oc-footer-social-icon,
      .oc-footer-social-link[aria-label*="LinkedIn"]:focus .oc-footer-social-icon,
      .oc-footer-social-link[aria-label*="GitHub"]:hover .oc-footer-social-icon,
      .oc-footer-social-link[aria-label*="GitHub"]:focus .oc-footer-social-icon{
        opacity:.82;
      }
      .navbar .navbar-nav{
        align-items:center;
      }
      .navbar .nav-link.plain{
        color:#526071!important;
        min-height:36px;
        font-size:.92rem;
        font-weight:590!important;
        letter-spacing:0;
        padding:.42rem .48rem!important;
        display:inline-flex;
        align-items:center;
        gap:.38rem;
        position:relative;
        text-decoration:none!important;
      }
      .navbar .navbar-nav{
        column-gap:.42rem!important;
        row-gap:.25rem;
      }
      .navbar .nav-link.plain:hover,
      .navbar .nav-link.plain:focus,
      .navbar .nav-link.plain.active{
        color:var(--oc-ink,#0f2e4b)!important;
        text-decoration:none!important;
      }
      .navbar .nav-link.plain.active{
        font-weight:620!important;
      }
      .navbar .nav-link.plain::before{
        content:"";
        position:absolute;
        left:.48rem;
        right:.48rem;
        bottom:.18rem;
        height:2px;
        border-radius:999px;
        background:var(--oc-accent,#f2a238);
        opacity:.78;
        transform:scaleX(0);
        transform-origin:center;
        transition:transform .16s ease;
      }
      .navbar .nav-link.plain:hover::before,
      .navbar .nav-link.plain:focus::before,
      .navbar .nav-link.plain.active::before{
        transform:scaleX(1);
      }
      .navbar .dropdown-toggle::after{
        display:none!important;
      }
      .oc-top-nav-icon{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
        width:.94rem;
        height:.94rem;
        color:currentColor;
        opacity:.72;
        transform:translateY(.01em);
        transition:opacity .16s ease;
      }
      .oc-top-nav-icon svg{
        display:block;
        width:100%;
        height:100%;
        fill:none;
        stroke:currentColor;
        stroke-width:1.9;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .navbar .nav-link.plain:hover .oc-top-nav-icon,
      .navbar .nav-link.plain:focus .oc-top-nav-icon,
      .navbar .nav-link.plain.active .oc-top-nav-icon{
        opacity:.9;
      }
      .oc-top-nav-caret{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
        width:.58rem;
        height:.58rem;
        margin-left:-.12rem;
        color:currentColor;
        opacity:.34;
        pointer-events:none;
        transition:opacity .14s ease;
      }
      .oc-top-nav-caret svg{
        display:block;
        width:100%;
        height:100%;
        fill:none;
        stroke:currentColor;
        stroke-width:2.2;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .navbar .dropdown-toggle:hover .oc-top-nav-caret,
      .navbar .dropdown-toggle:focus .oc-top-nav-caret,
      .navbar .dropdown-toggle.show .oc-top-nav-caret{
        opacity:.68;
      }
      .navbar .dropdown-menu:not(.oc-auth-menu){
        min-width:154px!important;
        border:1px solid var(--oc-border,#e7edf3)!important;
        border-radius:7px!important;
        box-shadow:0 12px 28px rgba(15,46,75,.10)!important;
        padding:.32rem!important;
      }
      .navbar .dropdown-menu:not(.oc-auth-menu) .dropdown-item{
        display:flex;
        align-items:center;
        gap:.48rem;
        min-height:34px;
        border-radius:6px;
        color:#3f4c5b!important;
        font-size:.84rem;
        font-weight:560;
        line-height:1.2;
        padding:.4rem .52rem!important;
        letter-spacing:0;
        transition:background-color .14s ease, color .14s ease;
      }
      .oc-catalog-menu-icon,
      .oc-nav-menu-icon,
      .oc-catalog-title-icon,
      .oc-docs-title-icon,
      .oc-page-title-icon{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        flex:0 0 auto;
        color:var(--oc-ink,#0f2e4b);
      }
      .oc-catalog-menu-icon,
      .oc-nav-menu-icon{
        width:.94rem;
        height:.94rem;
        opacity:.72;
      }
      .oc-catalog-menu-icon svg,
      .oc-nav-menu-icon svg,
      .oc-catalog-title-icon svg,
      .oc-docs-title-icon svg,
      .oc-page-title-icon svg{
        display:block;
        width:100%;
        height:100%;
        fill:none;
        stroke:currentColor;
        stroke-width:1.8;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .oc-catalog-title-icon svg,
      .oc-docs-title-icon svg,
      .oc-page-title-icon svg{
        stroke-width:1.95;
      }
      .oc-catalog-menu-icon .oc-icon-fill,
      .oc-nav-menu-icon .oc-icon-fill,
      .oc-catalog-title-icon .oc-icon-fill,
      .oc-docs-title-icon .oc-icon-fill,
      .oc-page-title-icon .oc-icon-fill{
        fill:rgba(242,162,56,.14);
      }
      .navbar .dropdown-menu:not(.oc-auth-menu) .dropdown-item:hover,
      .navbar .dropdown-menu:not(.oc-auth-menu) .dropdown-item:focus{
        background:#f7fafc!important;
        color:var(--oc-ink,#0f2e4b)!important;
      }
      .navbar .dropdown-menu:not(.oc-auth-menu) .dropdown-item:hover .oc-nav-menu-icon,
      .navbar .dropdown-menu:not(.oc-auth-menu) .dropdown-item:focus .oc-nav-menu-icon,
      .navbar .dropdown-menu:not(.oc-auth-menu) .dropdown-item.active .oc-nav-menu-icon{
        opacity:.9;
      }
      .navbar .dropdown-menu:not(.oc-auth-menu) .dropdown-item.active,
      .navbar .dropdown-menu:not(.oc-auth-menu) .dropdown-item:active{
        background:#f3f7fb!important;
        color:var(--oc-ink,#0f2e4b)!important;
      }
      .oc-catalog-title,
      .oc-docs-title,
      .oc-page-title{
        display:flex;
        align-items:center;
        justify-content:center;
        flex-wrap:wrap;
        gap:.52rem;
        position:relative;
        isolation:isolate;
        width:fit-content;
        max-width:100%;
        margin-left:auto;
        margin-right:auto;
        line-height:1.08;
        text-wrap:balance;
      }
      .oc-catalog-title > span:last-child{
        min-width:0;
      }
      .oc-catalog-title-icon,
      .oc-docs-title-icon,
      .oc-page-title-icon{
        width:.94em;
        height:.94em;
        opacity:.96;
        transform:translateY(.025em);
      }
      .oc-docs-title-icon{
        width:.98em;
        height:.98em;
      }
      .oc-docs-title{
        justify-content:flex-start;
        margin-left:0;
        margin-right:0;
      }
      header.hero h1.oc-docs-title{
        max-width:100%;
      }
      .oc-docs-title-copy{
        min-width:0;
      }
      .oc-page-title-copy{
        min-width:0;
      }
      header.hero h1.oc-page-title{
        justify-content:center;
        margin-left:auto!important;
        margin-right:auto!important;
        text-align:center;
      }
      .page-hero .oc-docs-title{
        justify-content:flex-start;
        gap:.6rem;
      }
      .page-hero h1 .oc-docs-title-icon{
        display:inline-flex;
      }
      .page-hero h1 .oc-docs-title-copy,
      .page-hero h1 .oc-docs-title-copy span{
        display:block;
      }
      @media (max-width:575.98px){
        .oc-catalog-title,
        .oc-docs-title,
        .oc-page-title{
          gap:.46rem;
        }
        .oc-catalog-title-icon,
        .oc-docs-title-icon,
        .oc-page-title-icon{
          width:.9em;
          height:.9em;
        }
        .navbar .dropdown-toggle .oc-top-nav-caret{
          opacity:.45;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  function injectAiAssistantStyles(){
    if (document.getElementById('ocAiAssistantStyles')) return;
    const styles = document.createElement('style');
    styles.id = 'ocAiAssistantStyles';
    styles.textContent = `
      .oc-ai-launcher{
        appearance:none;
        -webkit-appearance:none;
        position:fixed;
        right:20px;
        bottom:20px;
        z-index:1040;
        isolation:isolate;
        display:inline-flex;
        align-items:center;
        gap:.42rem;
        min-height:38px;
        padding:.46rem .82rem;
        border:1px solid rgba(172,96,16,.32);
        border-radius:8px;
        background:#f2a238;
        color:var(--oc-ink,#0f2e4b);
        font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        font-size:1rem;
        font-weight:700;
        font-style:normal;
        font-variant:normal;
        letter-spacing:0;
        line-height:1;
        text-transform:none;
        box-shadow:0 10px 24px rgba(15,46,75,.14), 0 0 0 5px rgba(242,162,56,.12);
        text-decoration:none;
        transition:border-color .15s ease, box-shadow .15s ease, transform .15s ease, background .15s ease;
      }
      .oc-ai-launcher::before{
        content:"";
        position:absolute;
        inset:-8px;
        z-index:-1;
        border-radius:14px;
        background:radial-gradient(circle at 50% 50%, rgba(242,162,56,.22), rgba(242,162,56,0) 68%);
        opacity:.72;
        pointer-events:none;
        transition:opacity .15s ease, transform .15s ease;
      }
      .oc-ai-launcher *{
        box-sizing:border-box;
        font-family:inherit;
      }
      .oc-ai-launcher:hover,
      .oc-ai-launcher:focus{
        color:#fff;
        border-color:rgba(172,96,16,.5);
        background:#f5ad4b;
        box-shadow:0 14px 30px rgba(15,46,75,.18), 0 0 0 7px rgba(242,162,56,.18), 0 0 34px rgba(242,162,56,.34);
        transform:translateY(-1px);
      }
      .oc-ai-launcher:hover::before,
      .oc-ai-launcher:focus::before{
        opacity:1;
        transform:scale(1.04);
      }
      .oc-ai-launcher-mark{
        display:inline-block;
        color:#fff;
        font-size:1rem;
        font-weight:900;
        letter-spacing:0;
        line-height:1;
        text-transform:none;
        transform:translateY(-.02rem);
      }
      .oc-ai-launcher-copy{
        display:inline;
        color:#fff;
        font-size:.84rem;
        font-weight:700;
        letter-spacing:0;
        line-height:1;
        min-width:0;
        text-transform:none;
      }
      .oc-ai-launcher-copy strong{
        color:#fff;
        display:inline-block;
        font-size:.84rem;
        font-weight:700;
        letter-spacing:0;
        line-height:1;
        margin:0;
        text-transform:none;
        white-space:nowrap;
      }
      .oc-ai-launcher-beta{
        position:absolute;
        top:-7px;
        right:-7px;
        display:inline-flex;
        align-items:center;
        min-height:15px;
        margin-left:0;
        border:1px solid rgba(255,255,255,.72);
        border-radius:999px;
        background:#fff;
        color:#9a5a0c;
        font-size:.55rem;
        font-weight:700;
        line-height:1;
        letter-spacing:.05em;
        padding:.05rem .26rem;
        box-shadow:0 4px 10px rgba(15,46,75,.12);
        text-transform:uppercase;
      }
      .oc-ai-panel{
        position:fixed;
        right:20px;
        bottom:78px;
        z-index:1040;
        width:min(420px, calc(100vw - 40px));
        border:1px solid var(--oc-border,#e7edf3);
        border-radius:12px;
        background:#fff;
        box-shadow:0 16px 36px rgba(15,46,75,.16);
        padding:.65rem;
      }
      .oc-ai-panel[hidden]{
        display:none!important;
      }
      .oc-ai-close{
        position:absolute;
        top:.3rem;
        right:.35rem;
        z-index:1;
        width:28px;
        height:28px;
        display:grid;
        place-items:center;
        border:0;
        border-radius:6px;
        background:transparent;
        color:var(--oc-sub,#4f5d6c);
        font-size:1.1rem;
        line-height:1;
      }
      .oc-ai-close:hover,
      .oc-ai-close:focus{
        background:#f3f4f6;
        color:var(--oc-ink,#0f2e4b);
      }
      .oc-ai-panel-body{
        padding:0;
      }
      .oc-ai-panel-prompt{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        align-items:end;
        gap:.35rem;
        border:1px solid #cfcfcf;
        border-radius:10px;
        background:#fff;
        box-shadow:0 2px 8px rgba(15,46,75,.12);
        padding:.35rem;
      }
      .oc-ai-panel textarea{
        min-height:74px;
        resize:vertical;
        border:0;
        box-shadow:none;
        border-radius:8px;
        font-size:.92rem;
        padding:.62rem 1.65rem .62rem .68rem;
      }
      .oc-ai-panel textarea::placeholder{
        color:#8a929d;
        opacity:1;
      }
      .oc-ai-panel textarea:focus{
        box-shadow:none;
      }
      .oc-ai-panel-submit{
        width:38px;
        height:38px;
        display:grid;
        place-items:center;
        border:0;
        border-radius:8px;
        background:transparent;
        color:#3f3f46;
        padding:0;
      }
      .oc-ai-panel-submit:hover,
      .oc-ai-panel-submit:focus{
        background:#f3f4f6;
        color:var(--oc-ink,#0f2e4b);
      }
      .oc-ai-panel-submit:disabled{
        color:#a7b0ba;
        cursor:default;
      }
      .oc-ai-panel-submit:disabled:hover,
      .oc-ai-panel-submit:disabled:focus{
        background:transparent;
        color:#a7b0ba;
      }
      .oc-ai-panel-submit svg{
        width:20px;
        height:20px;
        fill:none;
        stroke:currentColor;
        stroke-width:1.9;
        stroke-linecap:round;
        stroke-linejoin:round;
      }
      .oc-ai-panel-note{
        color:var(--oc-sub,#4f5d6c);
        font-size:.75rem;
        line-height:1.35;
        margin:.5rem .2rem .05rem;
      }
      .oc-ai-panel-note a{
        color:inherit;
        text-decoration:underline;
        text-underline-offset:3px;
      }
      @media (max-width:575.98px){
        .oc-ai-launcher{
          right:14px;
          bottom:14px;
        }
        .oc-ai-panel{
          right:14px;
          bottom:76px;
          width:calc(100vw - 28px);
        }
      }
    `;
    document.head.appendChild(styles);
  }

  function escapeAiAttribute(value){
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function mountAiAssistant(){
    if (routeForPath() === 'account' || document.getElementById('ocAiLauncher')) return;
    const canUseAsk = window.OCAuth?.canUseAskBeta
      ? await window.OCAuth.canUseAskBeta().catch(() => false)
      : false;
    if (!canUseAsk) return;
    if (document.getElementById('ocAiLauncher')) return;
    injectAiAssistantStyles();
    document.body.classList.add('oc-ai-floating-mounted');
    const privacyHref = `${pagePrefix()}references.html#privacy`;
    const examplePrompt = 'e.g. Find datasets for construction safety with worker, PPE, or equipment annotations';
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <button type="button" class="oc-ai-launcher" id="ocAiLauncher" aria-expanded="false" aria-controls="ocAiPanel">
        <span class="oc-ai-launcher-mark" aria-hidden="true">&#10022;</span>
        <span class="oc-ai-launcher-copy">
          <strong>Ask OpenConstruction</strong>
          <span class="oc-ai-launcher-beta">Beta</span>
        </span>
      </button>
      <section class="oc-ai-panel" id="ocAiPanel" aria-label="Ask OpenConstruction" hidden>
        <button type="button" class="oc-ai-close" id="ocAiClose" aria-label="Close">&times;</button>
        <form class="oc-ai-panel-body" id="ocAiForm">
          <label class="visually-hidden" for="ocAiPrompt">Question</label>
          <div class="oc-ai-panel-prompt">
            <textarea class="form-control" id="ocAiPrompt" placeholder="${examplePrompt}"></textarea>
            <button type="submit" class="oc-ai-panel-submit" aria-label="Send" disabled>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11.5h10"></path><path d="m13 7.5 4 4-4 4"></path></svg>
            </button>
          </div>
          <p class="oc-ai-panel-note">Ask OpenConstruction is experimental and can make mistakes. Do not include private or confidential data. <a href="${escapeAiAttribute(privacyHref)}">Data &amp; Privacy</a>.</p>
          <p class="oc-ai-panel-note oc-ai-panel-limit" id="ocAiLimitNote">Limited beta. Normal search remains available.</p>
        </form>
      </section>
    `;
    document.body.appendChild(wrap);

    const launcher = document.getElementById('ocAiLauncher');
    const panel = document.getElementById('ocAiPanel');
    const close = document.getElementById('ocAiClose');
    const form = document.getElementById('ocAiForm');
    const prompt = document.getElementById('ocAiPrompt');
    const submit = form?.querySelector('button[type="submit"]');
    const limitNote = document.getElementById('ocAiLimitNote');

    function setOpen(open){
      panel.hidden = !open;
      launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        window.setTimeout(() => {
          prompt?.focus();
        }, 0);
      }
    }

    function syncSubmitState(){
      if (submit) submit.disabled = !String(prompt?.value || '').trim();
    }

    launcher?.addEventListener('click', () => setOpen(panel.hidden));
    close?.addEventListener('click', () => setOpen(false));
    prompt?.addEventListener('input', syncSubmitState);
    prompt?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        if (typeof form?.requestSubmit === 'function') {
          form.requestSubmit();
        } else {
          form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }
    });
    syncSubmitState();
    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const query = String(prompt?.value || '').trim();
      if (!query) {
        prompt?.focus();
        return;
      }
      window.location.href = `${pagePrefix()}account.html?tab=ask&q=${encodeURIComponent(query)}`;
    });
  }

  function normalizeFooter(){
    const footer = document.querySelector('footer[role="contentinfo"], footer');
    if (!footer || footer.dataset.ocFooterNormalized === 'true') return;
    const openConstructionLogo = footer.querySelector('img[alt="OpenConstruction logo"]');
    if (!openConstructionLogo) return;
    const container = footer.querySelector('.container') || footer;
    const linksBlock = Array.from(container.children).find(element =>
      /Terms/i.test(element.textContent || '') && /Privacy/i.test(element.textContent || '')
    );
    const linksClone = linksBlock?.cloneNode(true);
    if (linksClone) {
      linksClone.classList.add('oc-footer-links');
      const linkWrap = linksClone.querySelector('small') || linksClone;
      linkWrap.querySelectorAll('a[href*="references.html#referencesTitle"]').forEach(link => {
        link.textContent = 'Documentation';
        link.setAttribute('href', (link.getAttribute('href') || '').replace('#referencesTitle', ''));
      });
      if (!linkWrap.querySelector('.oc-footer-socials')) {
        linkWrap.querySelectorAll('a[href*="linkedin.com/company/openconstruction-open-science-initiative"], a[href*="github.com/ruoxinx/open-construction"]').forEach(link => {
          link.previousElementSibling?.matches?.('span[aria-hidden="true"]') && link.previousElementSibling.remove();
          link.remove();
        });
        linkWrap.insertAdjacentHTML(
          'beforeend',
          ` <span aria-hidden="true">&middot;</span>
          <span class="oc-footer-socials" aria-label="OpenConstruction social links">
            <a href="${LINKEDIN_URL}" class="text-muted oc-footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="OpenConstruction on LinkedIn" title="LinkedIn">
              <img class="oc-footer-social-icon" src="${assetPrefix}img/footer-linkedin.svg?v=20260825-footer-social-icons-color" alt="" width="16" height="16">
            </a>
            <a href="${GITHUB_URL}" class="text-muted oc-footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="OpenConstruction on GitHub" title="GitHub">
              <img class="oc-footer-social-icon" src="${assetPrefix}img/footer-github.svg?v=20260825-footer-social-icons-color" alt="" width="16" height="16">
            </a>
          </span>`
        );
      }
    }

    container.innerHTML = `
      <div class="oc-footer-brandline">
        <img class="oc-footer-oc-logo" src="${assetPrefix}img/icon.png" alt="OpenConstruction logo" width="24" height="24" loading="lazy">
        <span>&copy; <span id="yearNow"></span> OpenConstruction Open Science Initiative</span>
      </div>
    `;

    if (linksClone) container.appendChild(linksClone);
    footer.dataset.ocFooterNormalized = 'true';
    setFooterYear();
  }

  function bindSearchArrowActions(){
    if (document.body.dataset.ocSearchArrowsBound === 'true') return;
    document.body.dataset.ocSearchArrowsBound = 'true';
    document.addEventListener('click', event => {
      const button = event.target.closest?.('.oc-search-arrow');
      if (!button) return;
      const shell = button.closest('.oc-catalog-search-wrap, .hero-search-field');
      const input = shell?.querySelector('input[type="search"], input[type="text"]');
      if (!input) return;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus({ preventScroll: true });
    });
  }

  function loadUsageLogger(){
    if (window.OCUsageAnalytics?.ready || document.querySelector('script[data-oc-usage-logger="true"]')) return;
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase?.createClient) return;
    const pageFile = cleanFile(window.location.pathname);
    if (!pageFile || pageFile === 'index.html') return;
    const script = document.createElement('script');
    script.src = `${assetPrefix}js/visit-logger.js?v=20260826-geo-ua-cleanup`;
    script.async = true;
    script.dataset.ocUsageLogger = 'true';
    script.dataset.page = window.location.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/i, '') || 'index';
    document.head.appendChild(script);
  }

  function init(){
    setFooterYear();
    normalizeHeaderNav();
    normalizeCatalogTitle();
    normalizeDocsTitle();
    normalizePageTitle();
    bindYearRangeNormalization();
    bindFilterToggleNormalization();
    bindProtectedShellRefresh();
    refreshProtectedShell();
    applyActiveNav();
    injectFooterFundingStyles();
    [250, 1000, 2500].forEach(delay => window.setTimeout(refreshProtectedShell, delay));
    bindSearchArrowActions();
    normalizeFooter();
    loadUsageLogger();
  }

  window.OpenConstructionShell = {
    applyActiveNav,
    normalizeHeaderNav,
    mountAiAssistant,
    normalizeFooter,
    routeForPath,
    setFooterYear
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
