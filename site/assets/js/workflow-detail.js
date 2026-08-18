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
    const u = new URL(String(href).trim());
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
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

function mediaFallbackNote(label = 'Preview unavailable'){
  return `<span class="media-fallback-note" data-media-fallback-note hidden>${escapeHtml(label)}</span>`;
}

function mediaImageErrorHandler(){
  return "this.onerror=null;this.src='../assets/img/placeholder/placeholder.png';this.classList.add('is-fallback');const n=this.closest('.media-wrap')?.querySelector('[data-media-fallback-note]');if(n)n.hidden=false;";
}

function normalizeList(val){
  if (!val && val !== 0) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  return String(val).split(',').map(v => v.trim()).filter(Boolean);
}

function normKey(val){
  return String(val || '').trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

function chipLane(list){
  const items = normalizeList(list);
  if (!items.length) return '';
  return `<div class="chip-lane">${items.map(item => `<span class="chip">${escapeHtml(item)}</span>`).join('')}</div>`;
}

function metaRow(label, valueHTML){
  if (!valueHTML || !String(valueHTML).trim() || valueHTML === '—') return '';
  return `<div class="meta-row"><dt class="meta-label">${label}</dt><dd class="meta-val">${valueHTML}</dd></div>`;
}

function doiLinkHtml(value){
  const raw = String(value || '').trim();
  if (!raw) return '';
  const href = raw.startsWith('http') ? raw : `https://doi.org/${raw}`;
  const label = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}

function setBadge(id, values){
  const el = byId(id);
  const list = normalizeList(values);
  if (!el || !list.length) return;
  el.hidden = false;
  el.innerHTML = list.map(v => `<span class="badge">${escapeHtml(v)}</span>`).join('');
}

function getWorkflowId(){
  const url = new URL(window.location.href);
  return url.searchParams.get('id') || '';
}

function ytId(urlValue){
  try {
    const url = new URL(urlValue);
    const host = url.hostname.replace('www.', '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v') || null;
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null;
    }
    if (host === 'youtu.be') return url.pathname.slice(1) || null;
  } catch {}
  return null;
}

function vimeoId(urlValue){
  try {
    const url = new URL(urlValue);
    const host = url.hostname.replace('www.', '');
    if (host === 'vimeo.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : null;
    }
  } catch {}
  return null;
}

function fallbackWorkflowMedia(item){
  const providerText = [item.provider, item.links?.source, ...normalizeList(item.organizations)].join(' ').toLowerCase();
  if (providerText.includes('wakecap')) {
    return [{ type: 'image', url: 'assets/img/use-cases/wakecap.png', alt: 'Aramco construction site' }];
  }
  return [];
}

function getMediaEmbed(item){
  const media = Array.isArray(item.media) && item.media.length ? item.media : fallbackWorkflowMedia(item);
  const image = media.find(m => m && String(m.type || '').toLowerCase() === 'image' && m.url);
  const video = media.find(m => m && String(m.type || '').toLowerCase() === 'video' && m.url);
  const mediaCredit = '<div class="media-credit">Media from public websites are &copy; their respective creators unless otherwise noted.</div>';

  if (image) {
    const href = safeHref(item.links?.source) || safeHref(video?.url) || safeHref(image.url);
    const imgSrc = resolveMediaUrl(image.url);
    const imgTag = `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(image.alt || item.title || 'Workflow image')}" loading="lazy" decoding="async" referrerpolicy="strict-origin-when-cross-origin" onerror="${mediaImageErrorHandler()}">${mediaFallbackNote()}`;
    return `<figure class="media-figure"><div class="media-wrap">${href ? `<a class="d-block h-100" href="${href}" target="_blank" rel="noopener">${imgTag}</a>` : imgTag}</div>${mediaCredit}</figure>`;
  }

  if (video) {
    const youtube = ytId(video.url);
    const vimeo = vimeoId(video.url);
    if (youtube) {
      const embed = `https://www.youtube.com/embed/${encodeURIComponent(youtube)}`;
      return `<figure class="media-figure"><div class="media-wrap"><iframe src="${embed}" title="${escapeHtml(video.alt || item.title || 'Workflow video')}" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>${mediaCredit}</figure>`;
    }
    if (vimeo) {
      const embed = `https://player.vimeo.com/video/${encodeURIComponent(vimeo)}`;
      return `<figure class="media-figure"><div class="media-wrap"><iframe src="${embed}" title="${escapeHtml(video.alt || item.title || 'Workflow video')}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>${mediaCredit}</figure>`;
    }
    if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(video.url)) {
      return `<figure class="media-figure"><div class="media-wrap"><video src="${escapeHtml(resolveMediaUrl(video.url))}" controls playsinline preload="metadata"></video></div>${mediaCredit}</figure>`;
    }
    if (video.thumb) {
      return `<figure class="media-figure"><div class="media-wrap"><a class="d-block h-100" href="${escapeHtml(video.url)}" target="_blank" rel="noopener"><img src="${escapeHtml(resolveMediaUrl(video.thumb))}" alt="${escapeHtml(video.alt || item.title || 'Workflow video')}" loading="lazy" decoding="async" onerror="${mediaImageErrorHandler()}">${mediaFallbackNote()}</a></div>${mediaCredit}</figure>`;
    }
  }

  return `<div class="media-wrap placeholder"><div class="placeholder-copy">No media preview available</div></div>`;
}

function companyLinks(item){
  const companies = Array.isArray(item.companies) ? item.companies : [];
  return companies.map(c => {
    const name = c?.name || c;
    const url = safeHref(c?.url);
    return url ? `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(name)}</a>` : escapeHtml(name);
  }).filter(Boolean);
}

function scoreOverlap(a, b){
  const setA = new Set(normalizeList(a).map(normKey));
  const setB = new Set(normalizeList(b).map(normKey));
  let score = 0;
  setA.forEach(v => { if (setB.has(v)) score += 1; });
  return score;
}

function relatedWorkflowHtml(items){
  if (!items.length) return '<p class="text-muted small mb-0">No closely related workflows were found from the current catalog metadata.</p>';
  return items.map(other => `
    <a class="related-link" href="../workflows/details.html?id=${encodeURIComponent(other.title || '')}">
      <span class="related-link-type">Workflow</span>
      <span class="related-link-title">${escapeHtml(other.title || 'Untitled workflow')}</span>
      <span class="related-link-meta">${escapeHtml([normalizeList(other.applications)[0], normalizeList(other.ai_tech)[0]].filter(Boolean).join(' • ') || 'Similar application or implementation pattern')}</span>
    </a>
  `).join('');
}

function relatedModelHtml(items){
  if (!items.length) return '<p class="text-muted small mb-0">No closely related models were identified from the current catalog metadata.</p>';
  return items.map(model => `
    <a class="related-link" href="../models/details.html?id=${encodeURIComponent(model.id || model.title || '')}">
      <span class="related-link-type">Model</span>
      <span class="related-link-title">${escapeHtml(model.title || model.id || 'Untitled model')}</span>
      <span class="related-link-meta">${escapeHtml([normalizeList(model.applications || model.application)[0], normalizeList(model.tasks || model.task)[0]].filter(Boolean).join(' • ') || 'Related application or task coverage')}</span>
    </a>
  `).join('');
}

async function shareWorkflowLink(label){
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: label, text: `OpenConstruction workflow: ${label}`, url });
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

async function initWorkflowDetail(){
  const root = byId('detail-root');
  if (!root) return;

  try {
    const [workflowsPayload, modelsPayload] = await Promise.all([
      fetch('../data/use-cases.json', { cache: 'no-cache' }).then(r => r.json()),
      fetch('../data/models.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => [])
    ]);

    const workflows = Array.isArray(workflowsPayload?.use_cases) ? workflowsPayload.use_cases : (Array.isArray(workflowsPayload) ? workflowsPayload : []);
    const models = Array.isArray(modelsPayload) ? modelsPayload : (Array.isArray(modelsPayload?.models) ? modelsPayload.models : Object.values(modelsPayload || {}));
    const id = getWorkflowId();
    const item = workflows.find(u => (u.title || '') === id);

    if (!item) {
      root.innerHTML = '<div class="alert alert-warning">Workflow not found.</div>';
      return;
    }

    document.title = `${item.title || 'Workflow'} · Workflow Details`;
    byId('yearNow').textContent = new Date().getFullYear();
    setBadge('badge-phase', item.phase ? [item.phase] : []);
    setBadge('badge-apps', (item.applications || []).slice(0, 2));
    setBadge('badge-tech', (item.ai_tech || []).slice(0, 2));
    setBadge('badge-stage', item.deployment_stage ? [item.deployment_stage] : []);

    const companies = companyLinks(item);
    const sourceUrl = safeHref(item.links?.source);
    const paperUrl = safeHref(item.links?.paper);
    const codeUrl = safeHref(item.links?.code);
    const doiValue = item.links?.doi || '';

    const relatedWorkflows = workflows
      .filter(other => other && other !== item)
      .map(other => {
        const appScore = scoreOverlap(item.applications, other.applications);
        const techScore = scoreOverlap(item.ai_tech, other.ai_tech);
        const stakeholderScore = scoreOverlap(item.stakeholders, other.stakeholders);
        const score = appScore * 4 + techScore * 3 + stakeholderScore * 2;
        return score > 0 ? { other, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (b.other.year || 0) - (a.other.year || 0))
      .slice(0, 3)
      .map(({ other }) => other);

    const relatedModels = models
      .map(model => {
        const appScore = scoreOverlap(item.applications, model.applications || model.application);
        const modalityScore = scoreOverlap(item.data_modalities, model.modalities || model.modality || model.data_modalities);
        const score = appScore * 4 + modalityScore;
        return score > 0 ? { model, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || (b.model.year || 0) - (a.model.year || 0))
      .slice(0, 3)
      .map(({ model }) => model);

    const quickFacts = [
      { label: 'Year', value: escapeHtml(item.year || '—') },
      { label: 'Phase', value: escapeHtml(item.phase || '—') },
      { label: 'Deployment', value: escapeHtml(item.deployment_stage || '—') },
      { label: 'Evidence', value: escapeHtml(item.evidence_level || '—') },
      { label: 'Provider', value: escapeHtml(item.provider || '—') },
      { label: 'Geography', value: escapeHtml(item.geography || '—') }
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
        .media-wrap{ width:100%; aspect-ratio:16 / 9; border-radius:14px 14px 0 0; overflow:hidden; background:#f3f6fa; border-bottom:1px solid var(--oc-border); position:relative; }
        .media-wrap img{ width:100%; height:100%; object-fit:contain; object-position:center; border:0; display:block; background:#fff; }
        .media-wrap iframe,.media-wrap video{ width:100%; height:100%; object-fit:cover; border:0; display:block; }
        .media-wrap img.is-fallback{ padding:1.25rem; background:#f8fafc; }
        .media-fallback-note{ position:absolute; left:50%; bottom:10px; transform:translateX(-50%); max-width:calc(100% - 24px); border:1px solid var(--oc-border); border-radius:999px; background:rgba(255,255,255,.94); color:var(--oc-sub); font-size:.76rem; font-weight:800; padding:.16rem .55rem; text-align:center; white-space:nowrap; z-index:4; }
        .media-wrap.placeholder{ display:flex; align-items:center; justify-content:center; }
        .media-credit{ padding:.55rem 1rem; color:var(--oc-sub); font-size:.82rem; line-height:1.35; text-align:center; border-bottom:1px solid var(--oc-border); }
        .placeholder-copy{ color:var(--oc-sub); font-weight:600; }
        @media (max-width: 991.98px){ .meta-row{ grid-template-columns:1fr; gap:.35rem; } .detail-body{ padding:20px 18px; } .detail-section{ padding:1.05rem 1rem; } .detail-subcard{ padding:.9rem; } }
      </style>

      <div class="row g-4">
        <div class="col-lg-8">
          <div class="detail-card mb-3">
            ${getMediaEmbed(item)}
            <div class="detail-body">
              <h1 class="detail-title">${escapeHtml(item.title || 'Untitled workflow')}</h1>
              <div class="detail-meta-line">${escapeHtml([item.year || '', item.geography || '', item.provider || ''].filter(Boolean).join(' • ') || 'Workflow metadata not yet available')}</div>
              <div class="chip-lane">
                ${chipLane(item.applications).replace(/^<div class="chip-lane">|<\/div>$/g, '')}
                ${chipLane(item.ai_tech).replace(/^<div class="chip-lane">|<\/div>$/g, '')}
                ${window.OCBookmark ? window.OCBookmark.buttonHtml({ type: 'workflow', id: item.id || item.title, title: item.title || 'Workflow', url: window.location.href }) : ''}
              </div>
            </div>
          </div>

          <section id="overview" class="detail-section">
            <div class="detail-kicker">Overview</div>
            <h2 class="detail-heading">What this workflow demonstrates</h2>
            <p class="mb-0">${escapeHtml(item.summary || 'No summary is available for this workflow yet.')}</p>
          </section>

          <section id="implementation-context" class="detail-section">
            <div class="detail-kicker">Implementation Context</div>
            <h2 class="detail-heading">Who used it and how</h2>
            <dl class="meta mb-0">
              ${metaRow('Applications', chipLane(item.applications))}
              ${metaRow('Stakeholders', chipLane(item.stakeholders))}
              ${metaRow('AI technologies', chipLane(item.ai_tech))}
              ${metaRow('Data modalities', chipLane(item.data_modalities))}
              ${metaRow('Organizations', chipLane(item.organizations))}
              ${metaRow('Companies', companies.length ? companies.join(', ') : '—')}
              ${metaRow('Tags', chipLane(item.tags))}
            </dl>
          </section>

          <section id="evidence-and-links" class="detail-section">
            <div class="detail-kicker">Evidence & Access</div>
            <h2 class="detail-heading">What supports this workflow</h2>
            <dl class="meta mb-0">
              ${metaRow('Deployment stage', escapeHtml(item.deployment_stage || '—'))}
              ${metaRow('Evidence level', escapeHtml(item.evidence_level || '—'))}
              ${metaRow('Source', sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener">${escapeHtml(sourceUrl)}</a>` : '—')}
              ${metaRow('Paper', paperUrl ? `<a href="${paperUrl}" target="_blank" rel="noopener">${escapeHtml(paperUrl)}</a>` : '—')}
              ${metaRow('Code', codeUrl ? `<a href="${codeUrl}" target="_blank" rel="noopener">${escapeHtml(codeUrl)}</a>` : '—')}
              ${metaRow('DOI', doiValue ? doiLinkHtml(doiValue) : '—')}
              ${metaRow('License', escapeHtml(item.license || '—'))}
              ${metaRow('Notes', escapeHtml(item.notes || '—'))}
            </dl>
          </section>

          <section id="related-resources" class="detail-section">
            <div class="detail-kicker">Related Resources</div>
            <h2 class="detail-heading">Keep exploring from here</h2>
            <div class="row g-4">
              <div class="col-lg-6">
                <div class="detail-subcard h-100">
                  <div class="detail-subhead">Related workflows</div>
                  ${relatedWorkflowHtml(relatedWorkflows)}
                </div>
              </div>
              <div class="col-lg-6">
                <div class="detail-subcard h-100">
                  <div class="detail-subhead">Related models</div>
                  ${relatedModelHtml(relatedModels)}
                </div>
              </div>
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
                <h2 class="h6 text-uppercase text-muted mb-3">Workflow Links</h2>
                <div class="d-grid gap-2">
                  ${sourceUrl ? `<a class="btn btn-primary btn-sm" href="${sourceUrl}" target="_blank" rel="noopener">View Source</a>` : ''}
                  ${paperUrl ? `<a class="btn btn-outline-secondary btn-sm" href="${paperUrl}" target="_blank" rel="noopener">View Paper</a>` : ''}
                  ${codeUrl ? `<a class="btn btn-outline-secondary btn-sm" href="${codeUrl}" target="_blank" rel="noopener">View Code</a>` : ''}
                  ${doiValue ? `<a class="btn btn-outline-secondary btn-sm" href="${escapeHtml((String(doiValue).startsWith('http') ? doiValue : `https://doi.org/${doiValue}`))}" target="_blank" rel="noopener">DOI</a>` : ''}
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-3">
              <div class="card-body">
                <h2 class="h6 text-uppercase text-muted mb-3">Share</h2>
                <div class="d-grid gap-2">
                  <button type="button" class="btn btn-outline-secondary btn-sm" id="shareWorkflowBtn">Share or Copy Link</button>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm mb-3">
              <div class="card-body section-nav">
                <h2 class="h6 text-uppercase text-muted mb-3">On This Page</h2>
                <div class="d-grid gap-2 small">
                  <a href="#overview">Overview</a>
                  <a href="#implementation-context">Implementation Context</a>
                  <a href="#evidence-and-links">Evidence & Access</a>
                  <a href="#related-resources">Related Resources</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const shareBtn = byId('shareWorkflowBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const original = shareBtn.textContent;
        const result = await shareWorkflowLink(item.title || 'Workflow');
        if (result === 'cancelled') return;
        shareBtn.textContent = result === 'shared' ? 'Shared' : (result === 'copied' ? 'Link Copied' : 'Copy Failed');
        window.setTimeout(() => { shareBtn.textContent = original; }, 1800);
      });
    }
    window.OCBookmark?.mount(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = '<div class="alert alert-danger">Failed to load workflow details.</div>';
  }
}

document.addEventListener('DOMContentLoaded', initWorkflowDetail);
