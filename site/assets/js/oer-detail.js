// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

function byId(id){ return document.getElementById(id); }

function escapeHtml(value){
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(href){
  if (!href) return '';
  try {
    const url = new URL(String(href).trim());
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {}
  return '';
}

function resolveMediaUrl(url){
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('../') || raw.startsWith('./') || raw.startsWith('/')) {
    return raw;
  }
  if (raw.startsWith('assets/')) return `../${raw}`;
  return raw;
}

function normalizeList(val){
  if (!val && val !== 0) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  return String(val).split(',').map(v => v.trim()).filter(Boolean);
}

function normKey(val){
  return String(val || '').trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

function setBadge(id, values){
  const el = byId(id);
  const list = normalizeList(values);
  if (!el || !list.length) return;
  el.hidden = false;
  el.innerHTML = list.map(v => `<span class="badge">${escapeHtml(v)}</span>`).join('');
}

function fmtDate(value){
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function chipLane(values){
  const items = normalizeList(values);
  if (!items.length) return '';
  return `<div class="chip-lane">${items.map(item => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>`;
}

function metaRow(label, valueHTML){
  if (!valueHTML || !String(valueHTML).trim() || valueHTML === '—') return '';
  return `<div class="meta-row"><dt class="meta-label">${label}</dt><dd class="meta-val">${valueHTML}</dd></div>`;
}

function formatLicense(licenseValue){
  const norm = String(licenseValue || '').trim();
  if (!norm || norm === '—' || norm === 'â€”') return '';

  const key = norm.toUpperCase();
  const licenseMap = {
    'APACHE-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'APACHE 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'CC0': 'https://creativecommons.org/public-domain/cc0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC-BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    'CC BY-NC-ND 3.0': 'https://creativecommons.org/licenses/by-nc-nd/3.0/',
    'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'CC BY-ND 4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
    'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'AGPL 3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'GNU 3.0': 'https://www.gnu.org/licenses/gpl-3.0.en.html',
    'GNU 2.1': 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html',
    'LGPL-3.0': 'https://www.gnu.org/licenses/lgpl-3.0.html',
    'MIT': 'https://opensource.org/licenses/MIT',
    'ODC-BY': 'https://opendatacommons.org/licenses/by/',
    'BSD 3-CLAUSE': 'https://opensource.org/license/bsd-3-clause'
  };

  const href = licenseMap[key];
  return href ? `<a href="${href}" target="_blank" rel="noopener">${escapeHtml(norm)}</a>` : escapeHtml(norm);
}

function licenseHrefFor(licenseValue){
  const norm = String(licenseValue || '').trim();
  if (!norm || norm === '—' || norm === 'â€”') return '';

  const key = norm.toUpperCase();
  const licenseMap = {
    'APACHE-2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'APACHE 2.0': 'https://www.apache.org/licenses/LICENSE-2.0',
    'CC0': 'https://creativecommons.org/public-domain/cc0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC BY-NC 4.0': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC-BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/',
    'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC BY-NC-SA 4.0': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    'CC BY-NC-ND 3.0': 'https://creativecommons.org/licenses/by-nc-nd/3.0/',
    'CC BY-NC-ND 4.0': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'CC BY-ND 4.0': 'https://creativecommons.org/licenses/by-nd/4.0/',
    'GPL-3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'AGPL 3.0': 'https://www.gnu.org/licenses/gpl-3.0.html',
    'GNU 3.0': 'https://www.gnu.org/licenses/gpl-3.0.en.html',
    'GNU 2.1': 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.en.html',
    'LGPL-3.0': 'https://www.gnu.org/licenses/lgpl-3.0.html',
    'MIT': 'https://opensource.org/licenses/MIT',
    'ODC-BY': 'https://opendatacommons.org/licenses/by/',
    'BSD 3-CLAUSE': 'https://opensource.org/license/bsd-3-clause'
  };
  return licenseMap[key] || '';
}

function licenseNoticeFor(licenseValue){
  const norm = String(licenseValue || '').trim();
  const key = norm ? norm.toUpperCase() : '';
  const notices = [
    'No warranties are given. The license may not give you all permissions necessary for your intended use; other rights such as publicity, privacy, or moral rights may limit how you use the material.',
    'This summary highlights key license features for convenience and has no legal value. Review the original license terms before using the material.'
  ];
  const unspecified = {
    freedoms: [],
    terms: [
      'Do not assume permission to download, reuse, adapt, redistribute, or use the resource for research, teaching, commercial, or public-facing purposes.',
      'If you would like to know more about permitted usage, please contact the authors or the original provider before using this resource.'
    ],
    notices: [
      'The external source may include access terms, data use agreements, citation requirements, privacy restrictions, or other conditions not captured in this catalog record.',
      'OpenConstruction indexes metadata and links to the original source; it does not grant additional rights to third-party resources.'
    ]
  };
  const cc = {
    'CC BY 4.0': {
      freedoms: [
        'Share — copy and redistribute the material in any medium or format for any purpose, even commercially.',
        'Adapt — remix, transform, and build upon the material for any purpose, even commercially.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — Give appropriate credit, provide a link to the license, and indicate if changes were made.',
        'No additional restrictions — Do not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-NC 4.0': {
      freedoms: [
        'Share — copy and redistribute the material in any medium or format.',
        'Adapt — remix, transform, and build upon the material.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — Give appropriate credit, provide a link to the license, and indicate if changes were made.',
        'NonCommercial — You may not use the material for commercial purposes.',
        'No additional restrictions — Do not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-SA 4.0': {
      freedoms: [
        'Share — copy and redistribute the material in any medium or format for any purpose, even commercially.',
        'Adapt — remix, transform, and build upon the material for any purpose, even commercially.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — Give appropriate credit, provide a link to the license, and indicate if changes were made.',
        'ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.',
        'No additional restrictions — Do not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-NC-SA 4.0': {
      freedoms: [
        'Share — copy and redistribute the material in any medium or format.',
        'Adapt — remix, transform, and build upon the material.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — Give appropriate credit, provide a link to the license, and indicate if changes were made.',
        'NonCommercial — You may not use the material for commercial purposes.',
        'ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.',
        'No additional restrictions — Do not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-ND 4.0': {
      freedoms: [
        'Share — copy and redistribute the material in any medium or format for any purpose, even commercially.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — Give appropriate credit, provide a link to the license, and indicate if changes were made.',
        'NoDerivatives — If you remix, transform, or build upon the material, you may not distribute the modified material.',
        'No additional restrictions — Do not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-NC-ND 4.0': {
      freedoms: [
        'Share — copy and redistribute the material in any medium or format.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.',
        'NonCommercial — You may not use the material for commercial purposes.',
        'NoDerivatives — If you remix, transform, or build upon the material, you may not distribute the modified material.',
        'No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    },
    'CC BY-NC-ND 3.0': {
      freedoms: [
        'Share — copy and redistribute the material in any medium or format.',
        'The licensor cannot revoke these freedoms as long as you follow the license terms.'
      ],
      terms: [
        'Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.',
        'NonCommercial — You may not use the material for commercial purposes.',
        'NoDerivatives — If you remix, transform, or build upon the material, you may not distribute the modified material.',
        'No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.'
      ],
      notices
    }
  };
  cc['CC-BY 4.0'] = cc['CC BY 4.0'];
  cc['CC-BY-NC'] = cc['CC BY-NC 4.0'];

  if (!key || /UNSPECIFIED|UNKNOWN|NOT SPECIFIED/.test(key)) return unspecified;
  if (cc[key]) return cc[key];
  if (key === 'CC0') {
    return {
      freedoms: ['You may copy, modify, distribute, and perform the work, including for commercial purposes, without asking permission.'],
      terms: [
        'Although attribution may not be legally required under CC0, scholarly and professional norms may still require citation of the original authors or source.',
        'Review the source page for any additional access, privacy, or data-use notes.'
      ],
      notices: [
        'This summary is provided for convenience and is not legal advice.',
        'If any license term is unclear, please contact the authors or the original provider before using the material.'
      ]
    };
  }
  return {
    freedoms: [],
    terms: [
      'Follow the permissions, conditions, attribution requirements, redistribution rules, and warranty disclaimers stated by the original license.',
      'Some licenses may restrict commercial use, redistribution, derivative works, sublicensing, patent rights, or use of associated trademarks.'
    ],
    notices: [
      'This summary is provided for convenience and is not legal advice.',
      'If any license term is unclear, please contact the authors or the original provider before using the material.'
    ]
  };
}

function licenseListHtml(items){
  if (!items || !items.length) return '';
  return `<ul class="license-list">${items.map(item => {
    const [label, ...rest] = String(item).split(' — ');
    const detail = rest.join(' — ');
    return detail
      ? `<li><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span></li>`
      : `<li><span>${escapeHtml(item)}</span></li>`;
  }).join('')}</ul>`;
}

function oerLicenseModalHtml(item){
  const licenseLabel = item?.license ? String(item.license).trim() : 'Unspecified license';
  const notice = licenseNoticeFor(item?.license);
  const licenseUrl = licenseHrefFor(item?.license);
  const licenseTerms = licenseUrl
    ? `<a href="${licenseUrl}" target="_blank" rel="noopener">${escapeHtml(licenseLabel)}</a>`
    : escapeHtml(licenseLabel);
  return `
    <div class="modal fade" id="licenseDownloadModal" tabindex="-1" aria-labelledby="licenseDownloadTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content license-modal">
          <div class="modal-header">
            <div>
              <div class="detail-kicker mb-1">Before you continue</div>
              <h2 class="modal-title h5 mb-0" id="licenseDownloadTitle">Review OER license</h2>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="license-summary">
              <div class="license-summary-row">
                <div class="license-summary-label">License terms</div>
                <div>${licenseTerms}</div>
              </div>
            </div>
            ${notice.freedoms.length ? `
              <section class="license-section">
                <h3>You are free to</h3>
                ${licenseListHtml(notice.freedoms)}
              </section>` : ''}
            <section class="license-section">
              <h3>Under the following terms</h3>
              ${licenseListHtml(notice.terms)}
            </section>
            <section class="license-section">
              <h3>Notices</h3>
              ${licenseListHtml(notice.notices)}
              <p class="small text-muted mb-0">If any license item is unclear, please contact the authors or the original provider before using this resource.</p>
            </section>
          </div>
          <div class="modal-footer license-footer">
            <div class="form-check text-start me-auto">
              <input class="form-check-input" type="checkbox" value="" id="licenseDownloadCheck">
              <label class="form-check-label" for="licenseDownloadCheck">
                I have reviewed the license terms for this OER.
              </label>
            </div>
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" data-license-continue disabled>Open OER source</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function wireLicenseGate(root){
  const modalEl = root.querySelector('#licenseDownloadModal');
  if (!modalEl) return;
  const checkbox = modalEl.querySelector('#licenseDownloadCheck');
  const continueBtn = modalEl.querySelector('[data-license-continue]');
  let pendingUrl = '';

  root.querySelectorAll('[data-license-gate]').forEach(link => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href') || '';
      if (!href || href === '#') return;
      event.preventDefault();
      pendingUrl = href;
      if (checkbox) checkbox.checked = false;
      if (continueBtn) continueBtn.disabled = true;
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    });
  });

  if (checkbox && continueBtn) {
    checkbox.addEventListener('change', () => {
      continueBtn.disabled = !checkbox.checked;
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      if (!pendingUrl || continueBtn.disabled) return;
      window.open(pendingUrl, '_blank', 'noopener');
      bootstrap.Modal.getInstance(modalEl)?.hide();
    });
  }
}

function getOerId(){
  const url = new URL(window.location.href);
  return url.searchParams.get('id') || '';
}

function scoreOverlap(a, b){
  const setA = new Set(normalizeList(a).map(normKey));
  const setB = new Set(normalizeList(b).map(normKey));
  let score = 0;
  setA.forEach(v => { if (setB.has(v)) score += 1; });
  return score;
}

function normalizeResource(record){
  return {
    id: record.id || '',
    title: record.title || record.name || record.resource_title || '',
    provider: record.provider || record.authors || record.author || record.creator || '',
    year: record.year || '',
    source: record.source || record.url || record.link || '',
    image: record.image || record.image_url || record.thumbnail || record.thumb || '',
    language: normalizeList(record.language || record.languages || record.lang),
    topics: normalizeList(record.topics || record.topic || record.tags || record.keywords || record.subjects),
    license: record.license || record.licence || record.license_name || '',
    media: normalizeList(record.media || record.format || record.formats || record.media_format),
    added: record.added || record.added_date || record.created_at || '',
    publisher: record.publisher || '',
    institutions: normalizeList(record.institutions || record.institution || record.affiliations),
    contributor: record.contributor || record.submitter || record.submitted_by || '',
    contributorUrl: record.contributor_url || record.submitter_url || record.user_url || '',
    raw: record
  };
}

function buildOverview(item){
  const parts = [];
  if (item.provider) parts.push(`${item.title} is provided by ${item.provider}.`);
  else parts.push(`${item.title} is cataloged as an open educational resource in OpenConstruction.`);

  if (item.topics.length) parts.push(`It covers ${item.topics.slice(0, 3).join(', ')}${item.topics.length > 3 ? ', and related topics' : ''}.`);
  if (item.media.length) parts.push(`The resource is available as ${item.media.join(', ')}.`);
  if (item.institutions.length) parts.push(`Institutional context includes ${item.institutions.join(', ')}.`);
  if (item.license) parts.push(`It is listed with a ${item.license} license.`);
  return parts.join(' ');
}

function getMediaEmbed(item){
  const sourceUrl = safeHref(item.source);
  const imageUrl = resolveMediaUrl(item.image);
  if (imageUrl) {
    const imgTag = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title || 'OER preview')}" loading="lazy" decoding="async" referrerpolicy="strict-origin-when-cross-origin" onerror="this.onerror=null;this.src='../assets/img/placeholder/placeholder.png';">`;
    return `<figure class="media-figure"><div class="media-wrap">${sourceUrl ? `<a class="d-block h-100" href="${sourceUrl}" target="_blank" rel="noopener" data-license-gate>${imgTag}</a>` : imgTag}</div><div class="media-credit">Media from public websites are &copy; their respective creators unless otherwise noted.</div></figure>`;
  }
  return `<div class="media-wrap placeholder"><div class="placeholder-copy">No preview image available</div></div>`;
}

function relatedOerHtml(items){
  if (!items.length) return '<p class="text-muted small mb-0">No closely related OERs were found from the current catalog metadata.</p>';
  return items.map(other => `
    <a class="related-link" href="../oers/details.html?id=${encodeURIComponent(other.id || other.title || '')}">
      <span class="related-link-type">OER</span>
      <span class="related-link-title">${escapeHtml(other.title || 'Untitled resource')}</span>
      <span class="related-link-meta">${escapeHtml([normalizeList(other.topics)[0], normalizeList(other.media)[0], other.year || ''].filter(Boolean).join(' • ') || 'Related learning resource')}</span>
    </a>
  `).join('');
}

async function shareOerLink(label){
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: label, text: `OpenConstruction OER: ${label}`, url });
      return 'shared';
    }
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled';
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      window.prompt('Copy link: Ctrl/Cmd+C, Enter', url);
    }
    return 'copied';
  } catch {
    return 'failed';
  }
}

async function initOerDetail(){
  const root = byId('detail-root');
  const yearNow = byId('yearNow');
  if (yearNow) yearNow.textContent = new Date().getFullYear();
  if (!root) return;

  try {
    const payload = await fetch('../data/oer.json', { cache: 'no-cache' }).then(r => r.json());
    const resources = Array.isArray(payload?.resources) ? payload.resources : (Array.isArray(payload) ? payload : []);
    const id = getOerId();
    const all = resources.map(normalizeResource);
    const item = all.find(entry => (entry.id || '') === id || (entry.title || '') === id);

    if (!item) {
      root.innerHTML = '<div class="alert alert-warning">OER not found.</div>';
      return;
    }

    document.title = `${item.title || 'OER'} · OER Details`;
    setBadge('badge-topics', item.topics.slice(0, 2));
    setBadge('badge-media', item.media.slice(0, 2));
    setBadge('badge-license', item.license ? [item.license] : []);

    const sourceUrl = safeHref(item.source);
    const contributorUrl = safeHref(item.contributorUrl);
    const related = all
      .filter(other => other !== item)
      .map(other => {
        const topicScore = scoreOverlap(item.topics, other.topics);
        const mediaScore = scoreOverlap(item.media, other.media);
        const langScore = scoreOverlap(item.language, other.language);
        const score = topicScore * 4 + mediaScore * 2 + langScore;
        return score > 0 ? { other, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || String(b.other.year || '').localeCompare(String(a.other.year || '')))
      .slice(0, 4)
      .map(({ other }) => other);

    const quickFacts = [
      { label: 'Year', value: escapeHtml(item.year || '—') },
      { label: 'Provider', value: escapeHtml(item.provider || '—') },
      { label: 'Publisher', value: escapeHtml(item.publisher || '—') },
      { label: 'Language', value: escapeHtml(item.language.join(', ') || '—') },
      { label: 'Media', value: escapeHtml(item.media.join(', ') || '—') },
      { label: 'License', value: formatLicense(item.license) || '—' },
      { label: 'Added', value: escapeHtml(fmtDate(item.added) || '—') }
    ];

    root.innerHTML = `
      <style>
        .detail-card,.detail-section,.detail-subcard,.quickfact-card{ border:1px solid var(--oc-border); border-radius:16px; box-shadow:var(--oc-shadow); background:#fff; }
        .detail-body{ padding:24px 28px; }
        .detail-title{ font-size:clamp(1.35rem,1.05rem + 1.2vw,2rem); font-weight:700; color:var(--oc-ink); margin-bottom:.25rem; }
        .detail-meta-line{ color:var(--oc-sub); margin-bottom:.9rem; line-height:1.45; }
        .meta{ margin:0; }
        .meta-row{ display:grid; grid-template-columns:180px 1fr; gap:14px; padding:10px 0; align-items:start; }
        .meta-row + .meta-row{ border-top:1px solid var(--oc-border); }
        .meta-label{ color:var(--oc-sub); font-size:.92rem; white-space:nowrap; }
        .meta-val{ font-weight:600; line-height:1.45; }
        .chip-lane{ display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; }
        .chip{ display:inline-flex; align-items:center; padding:.28rem .6rem; background:var(--oc-muted); border:1px solid var(--oc-border); border-radius:999px; font-weight:600; font-size:.82rem; color:var(--oc-text); }
        .detail-section{ padding:1.25rem 1.35rem; margin-bottom:1rem; }
        .detail-kicker{ color:var(--oc-sub); font-size:.76rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; margin-bottom:.45rem; }
        .detail-heading{ font-size:1.1rem; font-weight:700; color:var(--oc-ink); margin:0 0 .85rem; }
        .detail-subcard{ padding:1rem; }
        .detail-subhead{ font-size:.92rem; font-weight:700; color:var(--oc-ink); margin-bottom:.8rem; }
        .quickfact-grid{ display:grid; gap:0; }
        .quickfact-row{ display:grid; gap:.16rem; padding:.55rem 0; }
        .quickfact-row + .quickfact-row{ border-top:1px solid var(--oc-border); }
        .quickfact-label{ color:var(--oc-sub); font-size:.8rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
        .quickfact-value{ font-weight:700; line-height:1.35; }
        .related-link{ display:flex; flex-direction:column; gap:.18rem; padding:.8rem 0; color:inherit; text-decoration:none; }
        .related-link + .related-link{ border-top:1px solid var(--oc-border); }
        .related-link:hover .related-link-title{ color:var(--oc-link); }
        .related-link-type{ color:var(--oc-sub); font-size:.75rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
        .related-link-title{ font-weight:700; color:var(--oc-ink); transition:color .15s ease; }
        .related-link-meta{ color:var(--oc-sub); font-size:.9rem; }
        .section-nav a{ color:var(--oc-link); text-decoration:none; }
        .section-nav a:hover{ text-decoration:underline; }
        .media-figure{ margin:0; }
        .media-wrap{ width:100%; aspect-ratio:16 / 9; border-radius:14px 14px 0 0; overflow:hidden; background:#f3f6fa; border-bottom:1px solid var(--oc-border); }
        .media-wrap img{ width:100%; height:100%; object-fit:contain; background:#fff; display:block; }
        .media-wrap.placeholder{ display:flex; align-items:center; justify-content:center; }
        .media-credit{ padding:.55rem 1rem; color:var(--oc-sub); font-size:.82rem; line-height:1.35; text-align:center; border-bottom:1px solid var(--oc-border); }
        .placeholder-copy{ color:var(--oc-sub); font-weight:600; }
        .license-modal{ border:0; border-radius:14px; box-shadow:0 22px 64px rgba(15,46,75,.2); overflow:hidden; }
        .license-modal .modal-header{ align-items:flex-start; border-bottom:1px solid var(--oc-border); padding:1.25rem 1.4rem 1.1rem; background:#fff; }
        .license-modal .modal-body{ padding:1.15rem 1.4rem 1.1rem; }
        .license-summary{ border:1px solid #d8e4ef; border-radius:10px; background:#f8fbff; margin-bottom:1.1rem; overflow:hidden; }
        .license-summary-row{ display:grid; grid-template-columns:132px 1fr; gap:1rem; padding:.82rem .95rem; align-items:center; }
        .license-summary-row + .license-summary-row{ border-top:1px solid var(--oc-border); }
        .license-summary-label{ color:var(--oc-sub); font-size:.8rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; }
        .license-section{ margin-top:1rem; padding-top:1rem; border-top:1px solid var(--oc-border); }
        .license-summary + .license-section{ border-top:0; padding-top:0; }
        .license-section h3{ color:var(--oc-ink); font-size:.94rem; font-weight:700; margin:0 0 .55rem; }
        .license-list{ display:grid; gap:.5rem; margin:0; padding:0; color:var(--oc-text); list-style:none; }
        .license-list li{ display:grid; gap:.12rem; line-height:1.45; padding-left:.85rem; border-left:3px solid #d8e4ef; }
        .license-list li strong{ color:var(--oc-ink); font-size:.9rem; }
        .license-list li span{ color:#334155; }
        .license-footer{ gap:.75rem; align-items:center; border-top:1px solid var(--oc-border); padding:1rem 1.4rem; background:#f8fafc; }
        .license-footer .form-check{ max-width:520px; }
        .license-footer .form-check-label{ color:#334155; font-size:.92rem; }
        @media (max-width: 991.98px){ .meta-row{ grid-template-columns:1fr; gap:.35rem; } .detail-body{ padding:20px 18px; } .detail-section{ padding:1.05rem 1rem; } .detail-subcard{ padding:.9rem; } .license-summary-row{ grid-template-columns:1fr; gap:.2rem; } .license-footer{ align-items:stretch; } .license-footer .form-check{ width:100%; max-width:none; } }
      </style>

      <div class="row g-4">
        <div class="col-lg-8">
          <div class="detail-card mb-3">
            ${getMediaEmbed(item)}
            <div class="detail-body">
              <h1 class="detail-title">${escapeHtml(item.title || 'Untitled OER')}</h1>
              <div class="detail-meta-line">${escapeHtml([item.provider || '', item.year || '', item.publisher || ''].filter(Boolean).join(' • ') || 'OER metadata not yet available')}</div>
              <div class="chip-lane">
                ${chipLane(item.topics).replace(/^<div class="chip-lane">|<\/div>$/g, '')}
                ${chipLane(item.media).replace(/^<div class="chip-lane">|<\/div>$/g, '')}
                ${window.OCBookmark ? window.OCBookmark.buttonHtml({ type: 'oer', id: item.id || item.title, title: item.title || 'OER', url: window.location.href }) : ''}
              </div>
            </div>
          </div>

          <section id="overview" class="detail-section">
            <div class="detail-kicker">Overview</div>
            <h2 class="detail-heading">What this OER offers</h2>
            <p class="mb-0">${escapeHtml(buildOverview(item))}</p>
          </section>

          <section id="learning-profile" class="detail-section">
            <div class="detail-kicker">Learning Profile</div>
            <h2 class="detail-heading">Topics, formats, and context</h2>
            <dl class="meta mb-0">
              ${metaRow('Topics', chipLane(item.topics))}
              ${metaRow('Media', chipLane(item.media))}
              ${metaRow('Language', chipLane(item.language))}
              ${metaRow('Institutions', chipLane(item.institutions))}
              ${metaRow('Provider', escapeHtml(item.provider || '—'))}
              ${metaRow('Publisher', escapeHtml(item.publisher || '—'))}
            </dl>
          </section>

          <section id="access-and-usage" class="detail-section">
            <div class="detail-kicker">Access & Usage</div>
            <h2 class="detail-heading">How to access and verify it</h2>
            <dl class="meta mb-0">
              ${metaRow('OER source', sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener" data-license-gate>${escapeHtml(sourceUrl)}</a>` : '—')}
              ${metaRow('License', formatLicense(item.license) || '—')}
              ${metaRow('Added to catalog', escapeHtml(fmtDate(item.added) || '—'))}
              ${metaRow('Submitted by', item.contributor ? (contributorUrl ? `<a href="${contributorUrl}" target="_blank" rel="noopener">${escapeHtml(item.contributor)}</a>` : escapeHtml(item.contributor)) : '—')}
            </dl>
          </section>

          <section id="related-resources" class="detail-section">
            <div class="detail-kicker">Related Resources</div>
            <h2 class="detail-heading">More OERs with similar coverage</h2>
            <div class="detail-subcard">
              ${relatedOerHtml(related)}
            </div>
          </section>
        </div>

        <div class="col-lg-4">
          <div class="position-sticky" style="top:88px">
            <div class="quickfact-card mb-3">
              <div class="card-body" style="padding:1.4rem 1.5rem;">
                <h2 class="h6 text-uppercase text-muted mb-3">Quick Facts</h2>
                <div class="quickfact-grid">
                  ${quickFacts.map(f => `<div class="quickfact-row"><div class="quickfact-label">${escapeHtml(f.label)}</div><div class="quickfact-value">${f.value}</div></div>`).join('')}
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-3">
              <div class="card-body">
                <h2 class="h6 text-uppercase text-muted mb-3">OER Links</h2>
                <div class="d-grid gap-2">
                  ${sourceUrl ? `<a class="btn btn-primary btn-sm" href="${sourceUrl}" target="_blank" rel="noopener" data-license-gate>Source</a>` : ''}
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-3">
              <div class="card-body">
                <h2 class="h6 text-uppercase text-muted mb-3">Share</h2>
                <div class="d-grid gap-2">
                  <button type="button" class="btn btn-outline-secondary btn-sm" id="shareOerBtn">Share or Copy Link</button>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-3">
              <div class="card-body section-nav">
                <h2 class="h6 text-uppercase text-muted mb-3">On This Page</h2>
                <div class="d-grid gap-2 small">
                  <a href="#overview">Overview</a>
                  <a href="#learning-profile">Learning Profile</a>
                  <a href="#access-and-usage">Access & Usage</a>
                  <a href="#related-resources">Related Resources</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${oerLicenseModalHtml(item)}
    `;

    const shareBtn = byId('shareOerBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const original = shareBtn.textContent;
        const result = await shareOerLink(item.title || 'OER');
        if (result === 'cancelled') return;
        shareBtn.textContent = result === 'shared' ? 'Shared' : (result === 'copied' ? 'Link Copied' : 'Copy Failed');
        window.setTimeout(() => { shareBtn.textContent = original; }, 1800);
      });
    }
    wireLicenseGate(root);
    window.OCBookmark?.mount(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = '<div class="alert alert-danger">Failed to load OER details.</div>';
  }
}

document.addEventListener('DOMContentLoaded', initOerDetail);
