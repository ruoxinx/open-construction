// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

(() => {
  const AWARD_URL = 'https://www.nsf.gov/awardsearch/show-award?AWD_ID=2612086';
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
        gap:.55rem;
        color:var(--oc-text,#1e2a36);
        font-weight:400;
        line-height:1.35;
      }
      .oc-footer-logo-group{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:.38rem;
        flex:0 0 auto;
      }
      .oc-footer-nsf-logo{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        text-decoration:none;
      }
      .oc-footer-oc-logo,
      .oc-footer-nsf-logo img{
        display:block;
        width:24px;
        height:24px;
        object-fit:contain;
      }
      .oc-footer-copy{
        display:inline-flex;
        align-items:center;
        gap:.25rem;
        font-weight:400;
      }
      .oc-footer-copy *{
        font-weight:400;
      }
      .oc-footer-funding{
        max-width:620px;
        margin:.38rem auto 0;
        color:var(--oc-subtle,#4f5d6c);
        font-size:.78rem;
        line-height:1.45;
      }
      .oc-footer-funding a{
        color:inherit;
        text-decoration:none;
      }
      .oc-footer-funding a:hover,
      .oc-footer-funding a:focus{
        color:var(--oc-ink,#0f2e4b);
        text-decoration:underline;
        text-underline-offset:3px;
      }
      .oc-footer-links{
        margin-top:.55rem!important;
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
    `;
    document.head.appendChild(styles);
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
    if (linksClone) linksClone.classList.add('oc-footer-links');

    container.innerHTML = `
      <div class="oc-footer-brandline">
        <span class="oc-footer-logo-group" aria-label="OpenConstruction and U.S. National Science Foundation">
          <img class="oc-footer-oc-logo" src="${assetPrefix}img/icon.png" alt="OpenConstruction logo" width="24" height="24" loading="lazy">
          <a class="oc-footer-nsf-logo" href="${AWARD_URL}" target="_blank" rel="noopener" aria-label="View U.S. National Science Foundation Award 2612086">
            <img src="${assetPrefix}img/nsf-logo.png" alt="U.S. National Science Foundation logo" width="24" height="24" loading="lazy">
          </a>
        </span>
        <span class="oc-footer-copy">&copy; <span id="yearNow"></span> OpenConstruction Open Science Initiative</span>
      </div>
      <div class="oc-footer-funding">
        <small>Supported by the U.S. National Science Foundation under <a href="${AWARD_URL}" target="_blank" rel="noopener">Award No. 2612086</a>.</small>
      </div>
    `;

    if (linksClone) container.appendChild(linksClone);
    footer.dataset.ocFooterNormalized = 'true';
    setFooterYear();
  }

  function init(){
    setFooterYear();
    applyActiveNav();
    injectFooterFundingStyles();
    normalizeFooter();
  }

  window.OpenConstructionShell = {
    applyActiveNav,
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
