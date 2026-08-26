// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

(async function(){
  if (window.OCUsageAnalytics?.ready) return;
  const script = document.currentScript;
  const PAGE = cleanPage(script?.dataset?.page || pageFromLocation());
  const GEO_CACHE_KEY = 'oc_usage_geo_v1';
  const FORM_IDS = new Set(['resourceSuggestionForm', 'skillProposalForm', 'reportIssueForm', 'emailSignInForm']);
  const loggedForms = new Set();
  const startedForms = new Set();
  const searchTimers = new WeakMap();
  const filterTimers = new WeakMap();
  const recentSearchEvents = new Map();
  const sb = window.OCAuth?.getClient?.() || (
    window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase?.createClient
      ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: 'oc-visit-logger-auth-token'
          }
        })
      : null
  );
  if (!sb) {
    console.warn('Supabase config missing; visit logger skipped');
    return;
  }

  function pageFromLocation(){
    const path = location.pathname.replace(/^\/+|\/+$/g, '');
    const withoutHtml = path.replace(/\.html$/i, '');
    return withoutHtml || 'index';
  }

  function cleanPage(value){
    const clean = String(value || 'index')
      .toLowerCase()
      .replace(/\.html$/g, '')
      .replace(/[^a-z0-9_/-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
    return clean || 'index';
  }

  function cleanText(value, limit){
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    return clean ? clean.slice(0, limit) : null;
  }

  function cleanUserAgent(value){
    const clean = cleanText(value, 500);
    return clean ? clean.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 500) || null : null;
  }

  function finiteNumber(value){
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function numericText(element){
    const match = String(element?.textContent || '').match(/\d[\d,]*/);
    return match ? Number(match[0].replace(/,/g, '')) : null;
  }

  function currentResultCount(){
    return (numericText(document.getElementById('resultCount')) ??
      numericText(document.getElementById('globalSearchNote')) ??
      document.querySelectorAll(
        '#datasetGrid > *, #modelGrid > *, #oerGrid > *, #usecaseGrid > *, #benchmarkIndex > *, #applicationIndex > *'
      ).length) || null;
  }

  function nearestLabelText(element){
    const id = element?.id;
    if (id) {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label?.textContent) return label.textContent;
    }
    const group = element?.closest?.('.mb-3, .mb-1, .oc-filter-group, fieldset, .filters, .card-body');
    return group?.querySelector?.('legend, .form-label, .card-header, label')?.textContent || '';
  }

  function filterGroupFor(element){
    const container = element?.closest?.('[id^="filter-"], .facet-list, .filters, fieldset');
    return cleanText(
      nearestLabelText(element) ||
      container?.id?.replace(/^filter-/, '') ||
      element?.name ||
      element?.id ||
      'filter',
      80
    );
  }

  function filterValueFor(element){
    if (!element) return null;
    if (element.matches('select')) return cleanText(element.selectedOptions?.[0]?.textContent || element.value, 160);
    if (element.matches('input[type="checkbox"], input[type="radio"]')) {
      const label = element.closest('label')?.textContent || document.querySelector(`label[for="${CSS.escape(element.id || '')}"]`)?.textContent;
      return cleanText(label || element.value, 160);
    }
    if (element.matches('input[type="range"]')) return cleanText(`${element.id || element.name || 'range'}:${element.value}`, 160);
    return cleanText(element.value || element.textContent, 160);
  }

  function isSearchInput(element){
    if (!element?.matches?.('input, textarea')) return false;
    const type = String(element.getAttribute('type') || '').toLowerCase();
    if (['email', 'password', 'hidden', 'url', 'range', 'checkbox', 'radio'].includes(type)) return false;
    const idName = `${element.id || ''} ${element.name || ''} ${element.placeholder || ''} ${element.getAttribute('aria-label') || ''}`.toLowerCase();
    if (type === 'search') return true;
    return /\b(search|filter|ask|query|q)\b/.test(idName) &&
      !/\b(email|name|affiliation|license|doi|url|title|description|note|summary|details)\b/.test(idName);
  }

  function eventTypeForSearch(element){
    return element?.closest?.('.oc-ask-form, #ocAiForm, #anonymousAskForm') ? 'ai_search' : 'search';
  }

  function isCatalogSearchInput(element){
    const id = String(element?.id || '').toLowerCase();
    return id === 'q' || id === 'qdock' || id === 'homesearchinput' || element?.closest?.('.hero-search, .oc-catalog-search-wrap');
  }

  function isFacetSearchInput(element){
    if (!element || isCatalogSearchInput(element)) return false;
    return Boolean(element.closest?.('.filters, .facet-list, aside'));
  }

  function searchScopeFor(element){
    const form = element?.closest?.('form');
    const scope = form?.querySelector?.('select')?.value || element?.dataset?.scope || 'all';
    return cleanText(scope, 80) || 'all';
  }

  async function sha256hex(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function getVisitorId(){
    const key = 'oc_visitor_id';
    let value = localStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, value);
    }
    return value;
  }

  async function getVisitorHash(){
    const geo = await geoPromise;
    const base = geo?.ip ? geo.ip : `vid:${getVisitorId()}`;
    return sha256hex(base);
  }

  function normalizeGeo(raw){
    if (!raw || raw.error) return null;
    const lat = finiteNumber(raw.latitude ?? raw.lat);
    const lon = finiteNumber(raw.longitude ?? raw.lon);
    const cleanGeo = {
      ip: cleanText(raw.ip, 80),
      lat,
      lon,
      city: cleanText(raw.city, 120),
      region: cleanText(raw.region || raw.regionName, 120),
      country: cleanText(raw.country_name || raw.country, 120)
    };
    return (cleanGeo.city || cleanGeo.region || cleanGeo.country || lat !== null || lon !== null)
      ? cleanGeo
      : null;
  }

  async function fetchJsonWithTimeout(url, timeoutMs = 3200){
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller?.signal
      });
      if (!response.ok) return null;
      return response.json();
    } catch (_) {
      return null;
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  function cacheGeo(cleanGeo){
    if (!cleanGeo) return;
    try {
      sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify({
        expires: Date.now() + 6 * 60 * 60 * 1000,
        geo: cleanGeo
      }));
    } catch (_) {}
  }

  async function getGeo(){
    try {
      const cached = JSON.parse(sessionStorage.getItem(GEO_CACHE_KEY) || 'null');
      if (cached?.expires > Date.now()) return cached.geo || null;
    } catch (_) {}
    for (const url of ['https://get.geojs.io/v1/ip/geo.json', 'https://ipapi.co/json/']) {
      const cleanGeo = normalizeGeo(await fetchJsonWithTimeout(url));
      if (cleanGeo) {
        cacheGeo(cleanGeo);
        return cleanGeo;
      }
    }
    return null;
  }

  async function basePayload(extra = {}){
    const geo = await geoPromise;
    return {
      page: PAGE,
      visitor_hash: await visitorHashPromise,
      country: geo?.country || null,
      region: geo?.region || null,
      county: geo?.county || null,
      city: geo?.city || null,
      lat: (geo && typeof geo.lat === 'number') ? geo.lat : null,
      lon: (geo && typeof geo.lon === 'number') ? geo.lon : null,
      ...extra
    };
  }

  async function insertUsageEvent(payload, options = {}){
    if (options.keepalive && window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.fetch) {
      const endpoint = `${String(window.SUPABASE_URL).replace(/\/+$/, '')}/rest/v1/site_usage_events`;
      const response = await fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: window.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`usage event insert failed: ${response.status}`);
      return;
    }
    const { error } = await sb.from('site_usage_events').insert(payload);
    if (error) throw error;
  }

  async function trackEvent(eventType, detail = {}, options = {}){
    try {
      const payload = await basePayload({
        event_type: eventType,
        query: cleanText(detail.query, 240),
        filter_group: cleanText(detail.filter_group, 80),
        filter_value: cleanText(detail.filter_value, 160),
        result_count: Number.isFinite(detail.result_count) ? detail.result_count : null,
        metadata: detail.metadata && typeof detail.metadata === 'object' ? detail.metadata : {}
      });
      await insertUsageEvent(payload, options);
    } catch (error) {
      console.warn('usage event failed', error);
    }
  }

  function recordSearchFromInput(input, action = 'input', options = {}){
    const query = cleanText(input?.value, 240);
    if (!query || query.length < 2) return Promise.resolve();
    if (isFacetSearchInput(input)) {
      const group = cleanText(`facet_search:${filterGroupFor(input) || input.id || 'facet'}`, 80);
      return trackEvent('filter', {
        filter_group: group,
        filter_value: query,
        result_count: currentResultCount(),
        metadata: {
          action,
          control_id: input.id || null,
          control_name: input.name || null,
          search_kind: 'facet_search'
        }
      }, options);
    }
    const scope = searchScopeFor(input);
    const eventType = eventTypeForSearch(input);
    const key = `${eventType}|${scope}|${query.toLowerCase()}`;
    const lastAt = recentSearchEvents.get(key);
    const now = Date.now();
    if (lastAt && now - lastAt < 5000) return Promise.resolve();
    recentSearchEvents.set(key, now);
    return trackEvent(eventType, {
      query,
      filter_group: 'search_scope',
      filter_value: scope,
      result_count: currentResultCount(),
      metadata: {
        action,
        control_id: input.id || null,
        control_name: input.name || null,
        form_id: input.closest?.('form')?.id || null,
        scope
      }
    }, options);
  }

  function bindSearchTracking(){
    document.addEventListener('input', event => {
      const input = event.target;
      if (!isSearchInput(input)) return;
      const query = cleanText(input.value, 240);
      window.clearTimeout(searchTimers.get(input));
      if (!query || query.length < 2) return;
      const timer = window.setTimeout(() => recordSearchFromInput(input, 'input'), 900);
      searchTimers.set(input, timer);
    }, true);
    document.addEventListener('submit', event => {
      const form = event.target;
      const input = form?.querySelector?.('input[type="search"], input[type="text"], textarea');
      if (!input || !isSearchInput(input)) return;
      window.clearTimeout(searchTimers.get(input));
      recordSearchFromInput(input, 'submit', { keepalive: true });
    }, true);
  }

  function bindInitialCatalogStateTracking(){
    window.setTimeout(() => {
      const params = new URLSearchParams(location.search);
      const query = cleanText(params.get('q'), 240);
      const input = document.getElementById('q') || document.getElementById('qDock') || document.querySelector('.oc-catalog-search-wrap input, input[type="search"]');
      if (query && input && isSearchInput(input)) {
        if (!cleanText(input.value, 240)) input.value = query;
        recordSearchFromInput(input, 'initial_query');
      }
      params.forEach((value, key) => {
        if (!value || ['q', 'sort'].includes(key)) return;
        if (/^year(min|max)$/i.test(key)) return;
        trackEvent('filter', {
          filter_group: cleanText(`url:${key}`, 80),
          filter_value: cleanText(value, 160),
          result_count: currentResultCount(),
          metadata: { action: 'initial_url_filter' }
        });
      });
    }, 1800);
  }

  function bindFilterTracking(){
    document.addEventListener('change', event => {
      const control = event.target;
      if (!control?.matches?.('select, input[type="checkbox"], input[type="radio"], input[type="range"]')) return;
      if (control.closest('#resourceSuggestionForm, #skillProposalForm, #reportIssueForm, #emailSignInForm')) return;
      const group = filterGroupFor(control);
      const value = filterValueFor(control);
      window.clearTimeout(filterTimers.get(control));
      const timer = window.setTimeout(() => {
        trackEvent('filter', {
          filter_group: group,
          filter_value: value,
          result_count: currentResultCount(),
          metadata: {
            control_id: control.id || null,
            control_name: control.name || null,
            checked: control.matches('input[type="checkbox"], input[type="radio"]') ? Boolean(control.checked) : null
          }
        });
      }, 250);
      filterTimers.set(control, timer);
    }, true);
    document.addEventListener('click', event => {
      const button = event.target.closest?.('.facet-toggle, [data-dashboard-tab], [data-resource-trend-mode], #filters .chip');
      if (!button || button.closest('#maintainerRoot')) return;
      trackEvent('filter', {
        filter_group: cleanText(button.closest('[id]')?.id || 'quick filter', 80),
        filter_value: cleanText(button.dataset.value || button.textContent, 160),
        result_count: currentResultCount(),
        metadata: { control_id: button.id || null }
      });
    }, true);
  }

  function bindFormTracking(){
    document.addEventListener('shown.bs.modal', event => {
      const form = event.target?.querySelector?.('form');
      if (!form?.id || !FORM_IDS.has(form.id) || loggedForms.has(`${form.id}:open`)) return;
      loggedForms.add(`${form.id}:open`);
      trackEvent('form_open', {
        filter_group: 'form',
        filter_value: form.id,
        metadata: { modal_id: event.target.id || null }
      });
    });
    document.addEventListener('input', event => {
      const form = event.target?.closest?.('form');
      if (!form?.id || !FORM_IDS.has(form.id) || startedForms.has(form.id)) return;
      startedForms.add(form.id);
      trackEvent('form_start', {
        filter_group: 'form',
        filter_value: form.id
      });
    }, true);
    document.addEventListener('submit', event => {
      const form = event.target;
      if (!form?.id || !FORM_IDS.has(form.id)) return;
      trackEvent('form_submit', {
        filter_group: 'form',
        filter_value: form.id
      });
    }, true);
  }

  function bindResourceClicks(){
    document.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      const href = link?.getAttribute('href') || '';
      if (!link || !href || href.startsWith('#') || href.startsWith('mailto:')) return;
      if (link.closest('#maintainerRoot')) return;
      const text = cleanText([
        link.textContent,
        link.getAttribute('aria-label'),
        link.getAttribute('title'),
        link.getAttribute('download')
      ].filter(Boolean).join(' '), 160) || '';
      const cleanHref = href.split('#')[0];
      const isCatalogResource = /(datasets\/detail|models\/details|oers\/details|workflows\/details)\.html/i.test(href) ||
        Boolean(link.closest('.search-result, .featured-card, .related-link, .index-card, [data-resource-card]'));
      const isDownload = link.hasAttribute('download') ||
        link.matches('[data-license-gate]') ||
        /\.(zip|csv|json|geojson|pdf|xlsx?|parquet|las|laz|ply|pcd|ifc|rvt|gbxml)(?:[?#]|$)/i.test(href) ||
        /\b(download|source|code|repo|repository|github|paper|doi|dataset source|view code|view paper|open .* source)\b/i.test(text);
      const isExternal = /^https?:\/\//i.test(href) && !new URL(href, location.href).hostname.endsWith(location.hostname);
      const eventType = isDownload ? 'download_click' : isCatalogResource ? 'resource_click' : isExternal ? 'outbound_click' : '';
      if (!eventType) return;
      trackEvent(eventType, {
        filter_group: isDownload ? 'download' : isCatalogResource ? 'resource' : 'outbound',
        filter_value: cleanText(cleanHref, 160),
        metadata: {
          href,
          title: text,
          external: isExternal,
          target: link.target || null
        }
      }, { keepalive: true });
    }, true);
  }

  function bindActionClicks(){
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button, [role="button"]');
      if (!button || button.closest('#maintainerRoot')) return;
      if (button.matches('.oc-search-arrow, [type="submit"]')) return;
      const actionKey = Object.keys(button.dataset || {}).find(key =>
        /^(ocShare|showMore|aiShowMore|workspaceTab|bookmark|resourceSave|resourceUnsave|export|exportCollection|badgeCertificate|q)$/i.test(key)
      );
      const idAction = /share|copy|bookmark|save|show|more|export|download|reset|filter/i.test(button.id || '') ? button.id : '';
      if (!actionKey && !idAction && !button.closest('.featured-rail-viewport')) return;
      const label = cleanText(button.textContent || button.getAttribute('aria-label') || button.getAttribute('title') || actionKey || idAction, 160);
      trackEvent('action_click', {
        filter_group: 'button',
        filter_value: label,
        result_count: currentResultCount(),
        metadata: {
          action_key: actionKey || null,
          control_id: button.id || null,
          aria_label: button.getAttribute('aria-label') || null
        }
      }, { keepalive: true });
    }, true);
  }

  const geoPromise = getGeo();
  const visitorHashPromise = getVisitorHash();

  window.OCUsageAnalytics = {
    ready: true,
    trackEvent,
    recordSearchInput: (input, action = 'input', options = {}) => recordSearchFromInput(input, action, options),
    recordSearch: (query, resultCount, metadata = {}, options = {}) => trackEvent('search', { query, result_count: resultCount, metadata }, options),
    recordFilter: (filter_group, filter_value, resultCount, metadata = {}, options = {}) => trackEvent('filter', { filter_group, filter_value, result_count: resultCount, metadata }, options),
    recordDownload: (href, title, metadata = {}, options = {}) => trackEvent('download_click', { filter_group: 'download', filter_value: href, metadata: { title, ...metadata } }, options),
    recordAction: (label, metadata = {}, options = {}) => trackEvent('action_click', { filter_group: 'action', filter_value: label, metadata }, options),
    page: PAGE
  };

  bindSearchTracking();
  bindInitialCatalogStateTracking();
  bindFilterTracking();
  bindFormTracking();
  bindResourceClicks();
  bindActionClicks();

  try {
    const geo = await geoPromise;
    const base = geo?.ip ? geo.ip : `vid:${getVisitorId()}`;
    const payload = {
      page: PAGE,
      ip_hash: await sha256hex(base),
      city: geo?.city || null,
      region: geo?.region || null,
      country: geo?.country || null,
      lat: (geo && typeof geo.lat === 'number') ? geo.lat : null,
      lon: (geo && typeof geo.lon === 'number') ? geo.lon : null,
      ua: cleanUserAgent(navigator.userAgent),
      referrer: document.referrer || null
    };

    const { error } = await sb.from('visits').insert(payload);
    if (error) console.error('visit logger insert error', error);
    await trackEvent('page_view', {
      metadata: {
        referrer: document.referrer || null
      }
    });
  } catch (error) {
    console.error('visit logger failed', error);
  }
})();
