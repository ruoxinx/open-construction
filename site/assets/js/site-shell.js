// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

(() => {
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
    'benchmarks': 'benchmarks',
    'benchmarks.html': 'benchmarks',
    'benchmark_task': 'benchmarks',
    'benchmark_task.html': 'benchmarks',
    'benchmark_application': 'benchmarks',
    'benchmark_application.html': 'benchmarks',
    'benchmark_results': 'benchmarks',
    'benchmark_results.html': 'benchmarks',
    'object_class': 'benchmarks',
    'object_class.html': 'benchmarks',
    'schema': 'docs',
    'schema.html': 'docs',
    'tools': 'docs',
    'tools.html': 'docs',
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
    docs: new Set(['docs'])
  };

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
    if (ROUTE_GROUPS.docs.has(route)) {
      const docsLink = document.getElementById('ddDocs') || document.getElementById('ddResourcesMenu');
      docsLink?.classList.add('active');
    }
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
      if (itemRoute === currentRoute && (currentRoute !== 'docs' || fileForHref(itemHref) === currentFile)) {
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

  function init(){
    setFooterYear();
    applyActiveNav();
  }

  window.OpenConstructionShell = {
    applyActiveNav,
    routeForPath,
    setFooterYear
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
