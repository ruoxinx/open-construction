/* SPDX-License-Identifier: Apache-2.0 */

(() => {
  const TABLE = 'resource_endorsements';
  const COUNTS_VIEW = 'resource_endorsement_counts';
  const RESOURCE_TYPES = new Set(['dataset', 'model', 'workflow', 'oer']);
  const clean = resource => {
    const type = String(resource?.type || '').trim().toLowerCase();
    const id = String(resource?.id || '').trim();
    if (!RESOURCE_TYPES.has(type) || !id) return null;
    return {
      type,
      id,
      title: String(resource?.title || id).trim().slice(0, 240)
    };
  };
  const key = resource => `${resource.type}:${resource.id}`;
  const escapeHtml = value => window.OCAuth?.escapeHtml
    ? window.OCAuth.escapeHtml(value)
    : String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function starIcon(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="oc-recommend-fill" d="m12 3.8 2.55 5.17 5.7.83-4.13 4.03.98 5.69L12 16.84l-5.1 2.68.98-5.69-4.13-4.03 5.7-.83z"></path><path d="m12 3.8 2.55 5.17 5.7.83-4.13 4.03.98 5.69L12 16.84l-5.1 2.68.98-5.69-4.13-4.03 5.7-.83z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path></svg>';
  }

  function buttonHtml(resource){
    const item = clean(resource);
    if (!item) return '';
    const isCard = resource?.variant === 'card';
    const label = 'Like this resource';
    const cardClass = isCard ? ' oc-recommend-btn-card' : '';
    const visibleLabel = isCard ? '' : '<span class="oc-recommend-label">Star</span>';
    return `<button type="button" class="oc-recommend-btn${cardClass}" data-oc-recommend data-recommend-variant="${isCard ? 'card' : 'detail'}" data-resource-type="${escapeHtml(item.type)}" data-resource-id="${escapeHtml(item.id)}" data-resource-title="${escapeHtml(item.title)}" data-recommendation-count="0" aria-pressed="false" aria-label="${label}" title="${label}"><span class="oc-recommend-icon">${starIcon()}</span>${visibleLabel}<span class="oc-recommend-count" aria-hidden="true">0</span></button>`;
  }

  function setState(button, recommended, count, user, status){
    const safeCount = Math.max(0, Number(count) || 0);
    const label = status === 'saving'
      ? 'Saving recommendation'
      : status === 'error'
        ? 'Recommendation failed'
        : recommended
          ? 'Unlike this resource'
          : user
            ? 'Like this resource'
            : 'Sign in to like this resource';
    button.classList.toggle('active', Boolean(recommended));
    button.setAttribute('aria-pressed', recommended ? 'true' : 'false');
    button.setAttribute('aria-label', label);
    button.title = label;
    button.dataset.recommendationCount = String(safeCount);
    const countEl = button.querySelector('.oc-recommend-count');
    if (countEl) countEl.textContent = String(safeCount);
    const labelEl = button.querySelector('.oc-recommend-label');
    if (labelEl) labelEl.textContent = status === 'saving' ? 'Saving...' : (recommended ? 'Starred' : 'Star');
  }

  async function fetchState(buttons){
    const sb = window.OCAuth?.getClient?.();
    if (!sb) return new Map();
    const resources = buttons.map(button => clean({
      type: button.dataset.resourceType,
      id: button.dataset.resourceId,
      title: button.dataset.resourceTitle
    })).filter(Boolean);
    const unique = Array.from(new Map(resources.map(item => [key(item), item])).values());
    const counts = new Map();
    const byType = new Map();
    unique.forEach(item => {
      if (!byType.has(item.type)) byType.set(item.type, []);
      byType.get(item.type).push(item.id);
    });
    await Promise.all(Array.from(byType.entries()).map(async ([type, ids]) => {
      const { data, error } = await sb.from(COUNTS_VIEW)
        .select('resource_type,resource_id,endorsement_count')
        .eq('resource_type', type)
        .in('resource_id', ids);
      if (error) return;
      (data || []).forEach(row => counts.set(`${row.resource_type}:${row.resource_id}`, Number(row.endorsement_count) || 0));
    }));

    const user = await window.OCAuth.getUser?.().catch(() => null);
    const mine = new Set();
    if (user && unique.length) {
      const { data, error } = await sb.from(TABLE)
        .select('resource_type,resource_id')
        .eq('user_id', user.id);
      if (!error) (data || []).forEach(row => mine.add(`${row.resource_type}:${row.resource_id}`));
    }
    return { counts, mine, user };
  }

  async function refresh(root = document){
    const buttons = Array.from(root.querySelectorAll('[data-oc-recommend]'));
    if (!buttons.length) return;
    const state = await fetchState(buttons).catch(() => ({ counts: new Map(), mine: new Set(), user: null }));
    buttons.forEach(button => {
      const item = clean({ type: button.dataset.resourceType, id: button.dataset.resourceId });
      if (!item) return;
      setState(button, state.mine.has(key(item)), state.counts.get(key(item)) || 0, state.user);
    });
  }

  function mount(root = document){
    root.querySelectorAll('[data-oc-recommend]').forEach(button => {
      if (button.dataset.ocRecommendReady) return;
      button.dataset.ocRecommendReady = 'true';
      button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        const user = await window.OCAuth?.getUser?.().catch(() => null);
        if (!user) {
          window.OCAuth?.setReturnTo?.(window.location.href);
          window.location.href = window.OCAuth?.relHref?.('auth/sign-in.html') || 'auth/sign-in.html';
          return;
        }
        const sb = window.OCAuth?.getClient?.();
        const item = clean({ type: button.dataset.resourceType, id: button.dataset.resourceId, title: button.dataset.resourceTitle });
        if (!sb || !item) return;
        const recommended = button.classList.contains('active');
        const originalCount = Number(button.dataset.recommendationCount) || 0;
        button.disabled = true;
        setState(button, recommended, originalCount, user, 'saving');
        try {
          const request = recommended
            ? sb.from(TABLE).delete().eq('user_id', user.id).eq('resource_type', item.type).eq('resource_id', item.id)
            : sb.from(TABLE).insert({ user_id: user.id, resource_type: item.type, resource_id: item.id, resource_title: item.title });
          const { error } = await request;
          if (error) throw error;
          setState(button, !recommended, originalCount + (recommended ? -1 : 1), user);
        } catch (error) {
          console.error('Recommendation failed', error);
          setState(button, recommended, originalCount, user, 'error');
          window.setTimeout(() => setState(button, recommended, originalCount, user), 1800);
        } finally {
          button.disabled = false;
        }
      });
    });
    refresh(root).catch(error => console.warn('Recommendation refresh failed', error));
  }

  window.OCRecommend = { buttonHtml, mount, refresh };
  const init = () => mount(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('oc:auth-user', () => refresh(document));
})();
