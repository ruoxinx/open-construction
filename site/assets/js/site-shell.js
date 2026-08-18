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
        display:inline-flex;
        align-items:center;
        gap:.5rem;
        min-height:38px;
        padding:.48rem .86rem;
        border:1px solid rgba(172,96,16,.32);
        border-radius:8px;
        background:#f2a238;
        color:var(--oc-ink,#0f2e4b);
        font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        font-size:1rem;
        font-weight:800;
        font-style:normal;
        font-variant:normal;
        letter-spacing:0;
        line-height:1;
        text-transform:none;
        box-shadow:0 10px 24px rgba(15,46,75,.14);
        text-decoration:none;
        transition:border-color .15s ease, box-shadow .15s ease, transform .15s ease;
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
        box-shadow:0 14px 30px rgba(15,46,75,.18);
        transform:translateY(-1px);
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
        font-size:.86rem;
        font-weight:800;
        letter-spacing:0;
        line-height:1;
        min-width:0;
        text-transform:none;
      }
      .oc-ai-launcher-copy strong{
        color:#fff;
        display:inline-block;
        font-size:.86rem;
        font-weight:800;
        letter-spacing:0;
        line-height:1;
        margin:0;
        text-transform:none;
        white-space:nowrap;
      }
      .oc-ai-launcher-beta{
        display:inline-flex;
        align-items:center;
        min-height:18px;
        margin-left:.2rem;
        border-radius:999px;
        background:rgba(255,255,255,.22);
        color:#fff;
        font-size:.64rem;
        font-weight:800;
        line-height:1;
        letter-spacing:.04em;
        padding:.08rem .34rem;
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
      .oc-ai-panel-actions{
        display:flex;
        align-items:center;
        gap:.7rem;
        flex-wrap:wrap;
        margin:.42rem .2rem 0;
      }
      .oc-ai-panel-actions a{
        color:var(--oc-sub,#4f5d6c);
        font-size:.78rem;
        font-weight:700;
        text-decoration:none;
      }
      .oc-ai-panel-actions a:hover,
      .oc-ai-panel-actions a:focus{
        color:var(--oc-ink,#0f2e4b);
        text-decoration:underline;
        text-underline-offset:3px;
      }
      body.oc-ai-floating-mounted .issue-btn{
        display:none!important;
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

  const ANONYMOUS_AI_DAILY_LIMIT = 1;

  function todayAiUsageStamp(){
    return new Date().toISOString().slice(0, 10);
  }

  function anonymousAiUsageKey(){
    return `oc_ai_usage:anonymous:${todayAiUsageStamp()}`;
  }

  function anonymousAiUsageCount(){
    try {
      return Number(localStorage.getItem(anonymousAiUsageKey()) || '0') || 0;
    } catch (_) {
      return 0;
    }
  }

  function normalSearchHref(query){
    const text = String(query || '').toLowerCase();
    const scope = /\b(models?|checkpoints?|architectures?|scan-to-bim|point clouds?)\b/.test(text)
      ? 'model'
      : /\b(workflows?|deployments?|use cases?|pipelines?|progress tracking|monitoring)\b/.test(text)
        ? 'workflow'
        : /\b(oers?|courses?|teaching|education|tutorials?|labs?)\b/.test(text)
          ? 'oer'
          : 'dataset';
    const params = new URLSearchParams();
    params.set('scope', scope);
    const suffix = params.toString();
    return `${pagePrefix()}index.html${suffix ? `?${suffix}` : ''}#homeSearchInput`;
  }

  function mountAiAssistant(){
    if (routeForPath() === 'account' || document.getElementById('ocAiLauncher')) return;
    injectAiAssistantStyles();
    document.body.classList.add('oc-ai-floating-mounted');
    const submitHref = `${pagePrefix()}account.html?submit=resource`;
    const privacyHref = `${pagePrefix()}contribute.html#privacy`;
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
          <div class="oc-ai-panel-actions" aria-label="Related actions">
            <a href="${escapeAiAttribute(submitHref)}">Submit resource</a>
            <a href="${escapeAiAttribute(`${pagePrefix()}account.html?report=issue&page=${encodeURIComponent(window.location.href)}`)}">Report issue</a>
          </div>
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
    syncSubmitState();
    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const query = String(prompt?.value || '').trim();
      if (!query) {
        prompt?.focus();
        return;
      }
      const user = await window.OCAuth?.getUser?.().catch(() => null);
      if (!user && anonymousAiUsageCount() >= ANONYMOUS_AI_DAILY_LIMIT) {
          if (limitNote) {
            limitNote.textContent = 'Anonymous visitors are limited to 1 AI-enhanced search each day. Sign in for more searches and saved sessions.';
          }
          prompt?.focus();
          return;
      }
      window.location.href = `account.html${user ? '' : '?anon=1'}${user ? '?q=' : '&q='}${encodeURIComponent(query)}`;
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
    if (linksClone) linksClone.classList.add('oc-footer-links');

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

  function init(){
    setFooterYear();
    applyActiveNav();
    injectFooterFundingStyles();
    mountAiAssistant();
    bindSearchArrowActions();
    normalizeFooter();
  }

  window.OpenConstructionShell = {
    applyActiveNav,
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
