// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

/* Shared advisory link-health rendering for catalog detail pages. */
(() => {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeHref(value) {
    if (!value) return '';
    try {
      const url = new URL(String(value).trim());
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  async function loadCache() {
    const candidates = ['../data/link-health.json', '/open-construction/data/link-health.json'];
    for (const url of candidates) {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) return await response.json();
      } catch {}
    }
    return null;
  }

  function record(cache, resourceType, resourceId, field, url) {
    const records = cache?.records;
    if (!records) return null;
    const key = `${resourceType}:${resourceId}:${field}`;
    const candidate = Array.isArray(records)
      ? records.find(item => item?.resource_type === resourceType && item?.resource_id === resourceId && item?.field === field)
      : records[key];
    if (!candidate?.checked_at) return null;
    const checkedUrl = safeHref(candidate.url) || candidate.url;
    const currentUrl = safeHref(url) || url;
    const age = Date.now() - Date.parse(candidate.checked_at);
    return checkedUrl === currentUrl && Number.isFinite(age) && age >= 0 && age <= 45 * 86400000 ? candidate : null;
  }

  function issueHref(resourceType, resourceId, title, field, url) {
    const params = new URLSearchParams({
      report: 'issue',
      issue_type: 'Broken link',
      page: window.location.href,
      summary: `Review ${String(field).replace(/_/g, ' ')} link for ${title}`,
      details: `Resource type: ${resourceType}\nResource ID: ${resourceId}\nField: ${field}\nCurrent URL: ${url}\n\nPlease verify the source link and update it if an authoritative replacement is available.`
    });
    return `../account.html?${params.toString()}`;
  }

  function html(cache, resourceType, resourceId, title, field, url) {
    const item = record(cache, resourceType, resourceId, field, url);
    const linkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9.5 14.5-1.8 1.8a3.1 3.1 0 0 1-4.4-4.4l3.3-3.3a3.1 3.1 0 0 1 4.4 0"></path><path d="m14.5 9.5 1.8-1.8a3.1 3.1 0 0 1 4.4 4.4l-3.3 3.3a3.1 3.1 0 0 1-4.4 0"></path><path d="m8.5 15.5 7-7"></path></svg>';
    const suggestHref = escapeHtml(issueHref(resourceType, resourceId, title, field, url));
    if (!item) {
      return `<a class="oc-link-health-suggest" href="${suggestHref}" title="Suggest a replacement" aria-label="Suggest a replacement">${linkIcon}</a>`;
    }
    const checked = new Date(item.checked_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    if (item.status === 'working') {
      return `<span class="oc-link-health oc-link-health-working" title="Link checked ${escapeHtml(checked)}" aria-label="Working link, checked ${escapeHtml(checked)}">✓</span><a class="oc-link-health-suggest" href="${suggestHref}" title="Suggest a replacement" aria-label="Suggest a replacement">${linkIcon}</a>`;
    }
    const review = item.status === 'needs_review';
    const label = review ? 'Link could not be verified' : 'Link may be unavailable';
    return `<span class="oc-link-health ${review ? 'oc-link-health-review' : 'oc-link-health-broken'}" title="${label}. Checked ${escapeHtml(checked)}" aria-label="${label}. Checked ${escapeHtml(checked)}">!</span><a class="oc-link-health-suggest" href="${suggestHref}" title="Suggest a replacement" aria-label="Suggest a replacement">${linkIcon}</a>`;
  }

  function bindNotes(root) {
    root?.querySelectorAll('.oc-link-health-working, .oc-link-health-review, .oc-link-health-broken').forEach(status => {
      if (status.dataset.ocLinkHealthReady) return;
      status.dataset.ocLinkHealthReady = 'true';
      status.setAttribute('role', 'button');
      status.setAttribute('tabindex', '0');
      status.setAttribute('aria-expanded', 'false');
      const toggle = () => {
        const existing = status.nextElementSibling?.classList.contains('oc-link-health-note') ? status.nextElementSibling : null;
        if (existing) {
          existing.remove();
          status.setAttribute('aria-expanded', 'false');
          return;
        }
        const title = String(status.getAttribute('title') || '').replace(/\.\s*Checked\s+/i, ', checked ');
        const note = document.createElement('span');
        note.className = 'oc-link-health-note';
        note.textContent = title || 'Link status';
        status.insertAdjacentElement('afterend', note);
        status.setAttribute('aria-expanded', 'true');
      };
      status.addEventListener('click', toggle);
      status.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggle();
      });
    });
  }

  window.OCLinkHealth = { loadCache, html, bindNotes };
})();
