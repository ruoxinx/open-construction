// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

(() => {
  const LOCAL_BOOKMARKS_KEY = 'oc_local_bookmarks';
  const RETURN_TO_KEY = 'oc_auth_return_to';
  const AUTH_NAV_ID = 'ocAuthNavItem';
  const CLIENT_OPTIONS = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  };

  let client = null;
  let currentUser = null;
  let bookmarkCache = null;
  let roleCache = null;

  function ensureAuthStyles(){
    if (document.getElementById('oc-auth-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'oc-auth-runtime-style';
    style.textContent = `
      #${AUTH_NAV_ID}{display:flex;align-items:center}
      #${AUTH_NAV_ID} .oc-auth-link{display:inline-flex!important;align-items:center!important;gap:.45rem!important;line-height:1!important;white-space:nowrap}
      #${AUTH_NAV_ID} .oc-auth-user{width:34px!important;height:34px!important;justify-content:center!important;padding:.2rem!important;border:1px solid transparent!important;border-radius:999px!important}
      #${AUTH_NAV_ID} .oc-auth-user:hover{border-color:#d7e3ef!important;background:#f8fafc!important}
      #${AUTH_NAV_ID} .oc-auth-avatar{width:28px!important;height:28px!important;max-width:28px!important;max-height:28px!important;min-width:28px!important;min-height:28px!important;border-radius:50%!important;object-fit:cover!important;border:1px solid #e7edf3!important;background:#f6f9fc!important;display:block!important}
      #${AUTH_NAV_ID} .oc-auth-initials{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:28px!important;height:28px!important;border-radius:50%!important;border:1px solid #d7e3ef!important;background:#f5f9ff!important;color:#0f2e4b!important;font-size:.72rem!important;font-weight:800!important;letter-spacing:0!important}
      #${AUTH_NAV_ID} .oc-auth-user::after{display:none!important}
      #${AUTH_NAV_ID} .oc-auth-menu{border:1px solid #e7edf3;border-radius:10px;box-shadow:0 14px 32px rgba(15,46,75,.12);padding:.35rem;min-width:170px}
      #${AUTH_NAV_ID} .oc-auth-menu .dropdown-item{border-radius:8px;font-size:.94rem;font-weight:600;padding:.48rem .6rem}
      #${AUTH_NAV_ID} .oc-auth-menu .dropdown-header{color:#4f5d6c;font-size:.68rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:.35rem .6rem .25rem}
      .oc-bookmark-btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:6px!important;color:#5c6873!important;background:transparent!important}
      .oc-bookmark-btn-icon{width:30px!important;height:30px!important;padding:0!important;border:0!important}
      .oc-bookmark-btn-text{width:100%!important;min-height:34px!important;padding:.38rem .7rem!important;border:1px solid #f2a238!important;color:#8a5a0a!important;font-size:.875rem!important;font-weight:700!important;background:#fff!important}
      .oc-bookmark-btn:hover{color:#f2a238!important;background:#fff8ec!important}
      .oc-bookmark-btn.active{color:#f2a238!important}
      .oc-bookmark-btn-icon.active{background:transparent!important}
      .oc-bookmark-btn-text.active{background:#fff8ec!important;border-color:#f2a238!important}
      .oc-bookmark-btn svg{width:17px!important;height:17px!important;display:block!important}
      .oc-bookmark-btn .oc-bookmark-fill{fill:transparent!important}
      .oc-bookmark-btn.active .oc-bookmark-fill{fill:currentColor!important}
    `;
    document.head.appendChild(style);
  }

  function pageDepthPrefix(){
    const path = window.location.pathname || '';
    return /\/(auth|datasets|models|oers|workflows)\//.test(path) ? '../' : '';
  }

  function rootUrl(){
    return new URL(pageDepthPrefix() || './', window.location.href);
  }

  function siteHref(path){
    return new URL(path.replace(/^\//, ''), rootUrl()).href;
  }

  function relHref(path){
    return pageDepthPrefix() + path.replace(/^\//, '');
  }

  function getClient(){
    if (client) return client;
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase?.createClient) return null;
    client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, CLIENT_OPTIONS);
    return client;
  }

  function escapeHtml(value){
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function authErrorMessage(error, fallback = 'Authentication could not be completed. Please try again.'){
    const message = String(error?.message || error?.error_description || error || '').trim();
    const lower = message.toLowerCase();
    if (lower.includes('identity is already linked') || lower.includes('already linked to another user')) {
      return 'This provider is already connected to another OpenConstruction account. Sign in with that provider first, or email support@openconstruction.org to merge accounts.';
    }
    if (lower.includes('manual linking') || lower.includes('linking is disabled')) {
      return 'Account linking is not enabled for this OpenConstruction project yet. Please email support@openconstruction.org.';
    }
    return message || fallback;
  }

  function cleanResource(resource){
    const type = String(resource?.type || '').trim().toLowerCase();
    const id = String(resource?.id || '').trim();
    if (!type || !id) return null;
    return {
      type,
      id,
      title: String(resource?.title || id).trim(),
      url: String(resource?.url || window.location.href).trim()
    };
  }

  function localBookmarks(){
    try{
      const parsed = JSON.parse(localStorage.getItem(LOCAL_BOOKMARKS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }catch{
      return [];
    }
  }

  function saveLocalBookmarks(rows){
    localStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify(rows));
  }

  function bookmarkKey(type, id){
    return `${type}:${id}`;
  }

  function localBookmarkKey(resource){
    return bookmarkKey(resource.type, resource.id);
  }

  function setReturnTo(url = window.location.href){
    localStorage.setItem(RETURN_TO_KEY, url);
  }

  function takeReturnTo(){
    const fallback = relHref('account.html');
    const value = localStorage.getItem(RETURN_TO_KEY) || fallback;
    localStorage.removeItem(RETURN_TO_KEY);
    return value;
  }

  function roleHomeHref(roles = []){
    const roleSet = new Set(roles);
    return roleSet.has('admin') || roleSet.has('reviewer')
      ? relHref('maintainer.html')
      : relHref('account.html');
  }

  async function resolvePostSignInHref(preferredHref = ''){
    const fallback = relHref('account.html');
    let href = preferredHref || fallback;
    let target;
    try {
      target = new URL(href, window.location.href);
    } catch {
      href = fallback;
      target = new URL(fallback, window.location.href);
    }
    if (target.hash === '#linked-identities') return href;
    const path = target.pathname || '';
    const shouldUseRoleHome = /\/account\.html$/.test(path) || /\/auth\/(sign-in|callback)\.html$/.test(path);
    if (!shouldUseRoleHome) return href;
    const roles = await getRoles().catch(() => []);
    return roleHomeHref(roles);
  }

  function clearAuthStorage(){
    [localStorage, sessionStorage].forEach(storage => {
      try {
        Object.keys(storage)
          .filter(key => key === RETURN_TO_KEY || key === 'supabase.auth.token' || /^sb-.+-auth-token$/.test(key))
          .forEach(key => storage.removeItem(key));
      } catch {
        // Storage can be unavailable in private browsing modes.
      }
    });
  }

  function userDisplayName(user){
    const meta = user?.user_metadata || {};
    const identities = Array.isArray(user?.identities) ? user.identities : [];
    const identityNames = identities.map(identity => {
      const data = identity?.identity_data || {};
      return data.name || data.full_name || data.preferred_username ||
        [data.given_name, data.family_name].filter(Boolean).join(' ');
    }).filter(Boolean);
    return meta.full_name || meta.name || meta.user_name || meta.preferred_username ||
      identityNames[0] || user?.email?.split('@')[0] || 'OpenConstruction member';
  }

  function userAffiliation(user){
    const meta = user?.user_metadata || {};
    const identities = Array.isArray(user?.identities) ? user.identities : [];
    const identityAffiliations = identities.map(identity => {
      const data = identity?.identity_data || {};
      return data.affiliation || data.organization || data.institution || data.company;
    }).filter(Boolean);
    return meta.affiliation || meta.organization || meta.institution || meta.company || identityAffiliations[0] || '';
  }

  function isGenericDisplayName(value){
    return ['openconstruction user', 'openconstruction member', 'oc'].includes(String(value || '').trim().toLowerCase());
  }

  function isMissingAffiliationColumn(error){
    const message = String(error?.message || error?.details || '');
    return message.includes("'affiliation' column") || message.includes('schema cache');
  }

  function initials(value){
    const parts = String(value || 'OC').trim().split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : String(parts[0] || 'OC').slice(0, 2);
    return letters.toUpperCase();
  }

  function githubUsername(user){
    const meta = user?.user_metadata || {};
    const identity = (user?.identities || []).find(item => item.provider === 'github');
    const identityMeta = identity?.identity_data || {};
    return meta.user_name || meta.preferred_username || identityMeta.user_name || identityMeta.preferred_username || '';
  }

  async function upsertProfile(user){
    const sb = getClient();
    if (!sb || !user) return;
    const meta = user.user_metadata || {};
    const { data: existing } = await sb
      .from('profiles')
      .select('display_name,github_username,affiliation')
      .eq('user_id', user.id)
      .maybeSingle();
    const profile = {
      user_id: user.id,
      display_name: existing?.display_name && !isGenericDisplayName(existing.display_name)
        ? existing.display_name
        : userDisplayName(user),
      avatar_url: meta.avatar_url || meta.picture || '',
      github_username: existing?.github_username || githubUsername(user) || null,
      affiliation: existing?.affiliation || userAffiliation(user) || null,
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await sb.from('profiles').upsert(profile, { onConflict: 'user_id' });
    if (isMissingAffiliationColumn(profileError)) {
      const fallbackProfile = { ...profile };
      delete fallbackProfile.affiliation;
      await sb.from('profiles').upsert(fallbackProfile, { onConflict: 'user_id' });
    } else if (profileError) {
      console.warn('Profile sync failed', profileError);
    }

    const identities = Array.isArray(user.identities) ? user.identities : [];
    await Promise.all(identities
      .filter(identity => ['github', 'google', 'custom:orcid'].includes(identity.provider))
      .map(identity => {
        const identityMeta = identity.identity_data || {};
        return sb.from('user_identities').upsert({
          user_id: user.id,
          provider: identity.provider,
          provider_subject: String(identity.id || identity.identity_id || identity.user_id || ''),
          username: identityMeta.user_name || identityMeta.preferred_username || identityMeta.email ||
            identityMeta.name || [identityMeta.given_name, identityMeta.family_name].filter(Boolean).join(' ') || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'provider,provider_subject' });
      }));
  }

  async function getUser(){
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    currentUser = data?.user || null;
    if (currentUser) await upsertProfile(currentUser);
    return currentUser;
  }

  async function getRoles(){
    const sb = getClient();
    const user = currentUser || await getUser();
    if (!sb || !user) return [];
    if (roleCache) return roleCache;

    const roles = new Set(['user']);
    const { data, error } = await sb.rpc('current_role_summary');
    if (!error) {
      (data || []).forEach(row => {
        const role = typeof row === 'string' ? row : row?.role;
        if (role) roles.add(role);
      });
    } else {
      console.warn('Role summary failed', error);
      const fallback = await sb.rpc('is_maintainer').catch(err => ({ error: err }));
      if (!fallback.error && fallback.data) roles.add('admin');
    }

    if (roles.has('admin')) roles.add('reviewer');
    roleCache = Array.from(roles);
    return roleCache;
  }

  async function hasRole(role){
    const roles = await getRoles();
    if (role === 'reviewer') return roles.includes('reviewer') || roles.includes('admin');
    return roles.includes(role);
  }

  async function isAdmin(){
    return hasRole('admin');
  }

  async function isReviewer(){
    return hasRole('reviewer');
  }

  async function isMaintainer(){
    return isAdmin();
  }

  async function signInWithProvider(provider){
    const sb = getClient();
    if (!sb) throw new Error('Supabase is not configured.');
    const isSignInPage = /\/auth\/sign-in\.html$/.test(window.location.pathname || '');
    setReturnTo(isSignInPage ? siteHref('account.html') : window.location.href);
    return sb.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: siteHref('auth/callback.html'),
        scopes: provider === 'github' ? 'read:user user:email' : undefined
      }
    });
  }

  async function linkIdentity(provider){
    const sb = getClient();
    if (!sb) throw new Error('Supabase is not configured.');
    setReturnTo(siteHref('account.html') + '#linked-identities');
    return sb.auth.linkIdentity({
      provider,
      options: {
        redirectTo: siteHref('auth/callback.html'),
        scopes: provider === 'github' ? 'read:user user:email' : undefined
      }
    });
  }

  async function getUserIdentities(){
    const sb = getClient();
    if (!sb) throw new Error('Supabase is not configured.');
    const { data, error } = await sb.auth.getUserIdentities();
    if (error) throw error;
    return data?.identities || [];
  }

  async function unlinkIdentity(identity){
    const sb = getClient();
    if (!sb) throw new Error('Supabase is not configured.');
    const { data, error } = await sb.auth.unlinkIdentity(identity);
    if (error) throw error;
    currentUser = null;
    await getUser().catch(() => null);
    return data;
  }

  async function signInWithEmail(email, captchaToken = ''){
    const sb = getClient();
    if (!sb) throw new Error('Supabase is not configured.');
    const cleanEmail = String(email || '').trim();
    if (!cleanEmail) throw new Error('Enter an email address.');
    const isSignInPage = /\/auth\/sign-in\.html$/.test(window.location.pathname || '');
    setReturnTo(isSignInPage ? siteHref('account.html') : window.location.href);
    return sb.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: siteHref('auth/callback.html'),
        shouldCreateUser: true,
        ...(captchaToken ? { captchaToken } : {})
      }
    });
  }

  async function signOut(){
    const sb = getClient();
    if (sb) {
      const { error } = await sb.auth.signOut();
      if (error) console.warn('Supabase sign out failed', error);
    }
    currentUser = null;
    bookmarkCache = null;
    roleCache = null;
    clearAuthStorage();
    updateAuthNav(null);
    refreshBookmarkButtons();
  }

  async function handleCallback(){
    const sb = getClient();
    if (!sb) throw new Error('Supabase is not configured.');
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) throw new Error(oauthError);
    const code = params.get('code');
    if (code) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw error;
    }
    const user = await getUser();
    if (!user) throw new Error('Sign in could not be completed. Please try again.');
    await syncLocalBookmarks();
    return user;
  }

  async function listBookmarks(){
    const sb = getClient();
    const user = currentUser || await getUser();
    if (!sb || !user) return localBookmarks();
    const { data, error } = await sb
      .from('resource_bookmarks')
      .select('resource_type,resource_id,resource_title,resource_url,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const rows = (data || []).map(row => ({
      type: row.resource_type,
      id: row.resource_id,
      title: row.resource_title || row.resource_id,
      url: row.resource_url || '',
      created_at: row.created_at
    }));
    bookmarkCache = new Set(rows.map(localBookmarkKey));
    return rows;
  }

  async function loadBookmarkCache(){
    const user = currentUser || await getUser();
    if (!user) return new Set(localBookmarks().map(cleanResource).filter(Boolean).map(localBookmarkKey));
    if (!bookmarkCache) await listBookmarks();
    return bookmarkCache || new Set();
  }

  async function isBookmarked(resource){
    const clean = cleanResource(resource);
    if (!clean) return false;
    const user = currentUser || await getUser();
    if (!user) return localBookmarks().some(row => localBookmarkKey(row) === localBookmarkKey(clean));
    const cache = await loadBookmarkCache();
    return cache.has(localBookmarkKey(clean));
  }

  async function toggleBookmark(resource){
    const clean = cleanResource(resource);
    if (!clean) return { saved: false, local: false };
    const user = currentUser || await getUser();
    if (!user) {
      const key = localBookmarkKey(clean);
      const rows = localBookmarks();
      const exists = rows.some(row => localBookmarkKey(row) === key);
      saveLocalBookmarks(exists ? rows.filter(row => localBookmarkKey(row) !== key) : [{ ...clean, created_at: new Date().toISOString() }, ...rows]);
      return { saved: !exists, local: true };
    }

    const sb = getClient();
    const exists = await isBookmarked(clean);
    if (exists) {
      const { error } = await sb
        .from('resource_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('resource_type', clean.type)
        .eq('resource_id', clean.id);
      if (error) throw error;
      bookmarkCache?.delete(localBookmarkKey(clean));
      return { saved: false, local: false };
    }

    const { error } = await sb.from('resource_bookmarks').insert({
      user_id: user.id,
      resource_type: clean.type,
      resource_id: clean.id,
      resource_title: clean.title,
      resource_url: clean.url
    });
    if (error) throw error;
    bookmarkCache?.add(localBookmarkKey(clean));
    return { saved: true, local: false };
  }

  async function syncLocalBookmarks(){
    const sb = getClient();
    const user = currentUser || await getUser();
    const rows = localBookmarks().map(cleanResource).filter(Boolean);
    if (!sb || !user || !rows.length) return;
    const { error } = await sb.from('resource_bookmarks').upsert(rows.map(row => ({
      user_id: user.id,
      resource_type: row.type,
      resource_id: row.id,
      resource_title: row.title,
      resource_url: row.url
    })), { onConflict: 'user_id,resource_type,resource_id' });
    if (error) throw error;
    bookmarkCache = null;
    saveLocalBookmarks([]);
  }

  function bookmarkButtonHtml(resource){
    const clean = cleanResource(resource);
    if (!clean) return '';
    const variant = resource?.variant === 'text' ? 'text' : 'icon';
    const content = variant === 'text' ? '<span>Save</span>' : bookmarkIcon();
    return `<button type="button" class="oc-bookmark-btn oc-bookmark-btn-${variant}" data-oc-bookmark data-bookmark-variant="${variant}" data-resource-type="${escapeHtml(clean.type)}" data-resource-id="${escapeHtml(clean.id)}" data-resource-title="${escapeHtml(clean.title)}" data-resource-url="${escapeHtml(clean.url)}" aria-pressed="false" aria-label="Save this resource" title="Save this resource">${content}</button>`;
  }

  function bookmarkIcon(){
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="oc-bookmark-fill" d="M6 3.75h12v16.5l-6-3.4-6 3.4z"></path><path d="M6 3.75h12v16.5l-6-3.4-6 3.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path></svg>`;
  }

  function setBookmarkButtonState(button, saved, user, status){
    button.classList.toggle('active', Boolean(saved));
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    const isText = button.dataset.bookmarkVariant === 'text';
    const label = status === 'saving'
      ? (isText ? 'Saving...' : 'Saving resource')
      : status === 'error'
        ? (isText ? 'Save failed' : 'Bookmark failed')
        : saved
          ? (isText ? 'Unsave' : 'Remove from saved resources')
          : user
            ? (isText ? 'Save' : 'Save this resource')
            : (isText ? 'Sign in to save' : 'Sign in to save this resource');
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = isText ? `<span>${escapeHtml(label)}</span>` : bookmarkIcon();
  }

  async function refreshBookmarkButtons(root = document){
    const buttons = Array.from(root.querySelectorAll('[data-oc-bookmark]'));
    const user = currentUser || await getUser().catch(() => null);
    if (!user) {
      buttons.forEach(button => setBookmarkButtonState(button, false, null));
      return;
    }
    await loadBookmarkCache().catch(() => new Set());
    await Promise.all(buttons.map(async button => {
      const resource = {
        type: button.dataset.resourceType,
        id: button.dataset.resourceId,
        title: button.dataset.resourceTitle,
        url: button.dataset.resourceUrl
      };
      const saved = await isBookmarked(resource).catch(() => false);
      setBookmarkButtonState(button, saved, user);
    }));
  }

  function mountBookmarkButtons(root = document){
    root.querySelectorAll('[data-oc-bookmark]').forEach(button => {
      if (button.dataset.ocBookmarkReady) return;
      button.dataset.ocBookmarkReady = 'true';
      button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        const user = currentUser || await getUser().catch(() => null);
        if (!user) {
          setReturnTo(window.location.href);
          window.location.href = relHref('auth/sign-in.html');
          return;
        }
        button.disabled = true;
        const originalSaved = button.classList.contains('active');
        setBookmarkButtonState(button, originalSaved, user, 'saving');
        try{
          const result = await toggleBookmark({
            type: button.dataset.resourceType,
            id: button.dataset.resourceId,
            title: button.dataset.resourceTitle,
            url: button.dataset.resourceUrl
          });
          setBookmarkButtonState(button, result.saved, user);
          if (result.local) {
            setReturnTo(window.location.href);
            window.setTimeout(() => {
              window.location.href = relHref('auth/sign-in.html');
            }, 350);
          }
        }catch(err){
          console.error('Bookmark failed', err);
          setBookmarkButtonState(button, originalSaved, user, 'error');
          window.setTimeout(() => setBookmarkButtonState(button, originalSaved, user), 1800);
        }finally{
          button.disabled = false;
        }
      });
    });
    refreshBookmarkButtons(root).catch(err => console.warn('Bookmark refresh failed', err));
  }

  function renderAuthNav(user){
    ensureAuthStyles();
    const nav = document.querySelector('.navbar-nav');
    if (!nav) return;
    if (document.getElementById(AUTH_NAV_ID)) {
      updateAuthNav(user);
      return;
    }
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.id = AUTH_NAV_ID;
    nav.appendChild(li);
    updateAuthNav(user);
  }

  function updateAuthNav(user){
    ensureAuthStyles();
    const li = document.getElementById(AUTH_NAV_ID);
    if (!li) return;
    if (!user) {
      li.innerHTML = `<a class="nav-link plain oc-auth-link" href="${relHref('auth/sign-in.html')}">Sign in</a>`;
      return;
    }
    const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
    const name = userDisplayName(user);
    li.innerHTML = `
      <div class="dropdown">
        <a class="nav-link plain oc-auth-link oc-auth-user dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" title="${escapeHtml(name)}" aria-label="Open account menu">
          ${avatar ? `<img src="${escapeHtml(avatar)}" alt="" class="oc-auth-avatar" width="28" height="28">` : `<span class="oc-auth-initials" aria-hidden="true">${escapeHtml(initials(name))}</span>`}
        </a>
        <div class="dropdown-menu dropdown-menu-end oc-auth-menu">
          <div class="dropdown-header">${escapeHtml(name)}</div>
          <a class="dropdown-item" href="${relHref('account.html')}">Workspace</a>
          <button type="button" class="dropdown-item" data-oc-signout>Sign out</button>
        </div>
      </div>
    `;
    li.querySelector('[data-oc-signout]')?.addEventListener('click', async event => {
      event.preventDefault();
      try {
        await signOut();
      } catch (err) {
        console.warn('Sign out failed', err);
      } finally {
        window.location.replace(relHref('auth/sign-in.html'));
      }
    });
    getRoles().then(roles => {
      const isAdminUser = roles.includes('admin');
      const isReviewerUser = roles.includes('reviewer') || isAdminUser;
      if (!isReviewerUser) return;
      const signOutButton = li.querySelector('[data-oc-signout]');
      if (!signOutButton || li.querySelector('[data-oc-maintainer-link]')) return;
      signOutButton.insertAdjacentHTML('beforebegin', `<a class="dropdown-item" data-oc-maintainer-link href="${relHref('maintainer.html')}">${isAdminUser ? 'Admin console' : 'Review queue'}</a>`);
    });
  }

  function initAuthNav(){
    renderAuthNav(null);
    getUser()
      .then(user => {
        updateAuthNav(user);
        mountBookmarkButtons(document);
      })
      .catch(err => console.warn('Auth initialization failed', err));
    const sb = getClient();
    sb?.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      bookmarkCache = null;
      roleCache = null;
      if (currentUser) upsertProfile(currentUser).catch(err => console.warn('Profile sync failed', err));
      updateAuthNav(currentUser);
      refreshBookmarkButtons().catch(() => {});
    });
  }

  window.OCAuth = {
    getClient,
    getUser,
    authErrorMessage,
    displayName: userDisplayName,
    affiliation: userAffiliation,
    signInWithProvider,
    signInWithEmail,
    signOut,
    handleCallback,
    upsertProfile,
    getRoles,
    hasRole,
    isAdmin,
    isReviewer,
    isMaintainer,
    roleHomeHref,
    resolvePostSignInHref,
    linkIdentity,
    getUserIdentities,
    unlinkIdentity,
    listBookmarks,
    syncLocalBookmarks,
    takeReturnTo,
    relHref,
    siteHref,
    escapeHtml
  };

  window.OCBookmark = {
    buttonHtml: bookmarkButtonHtml,
    mount: mountBookmarkButtons,
    refresh: refreshBookmarkButtons,
    list: listBookmarks,
    toggle: toggleBookmark,
    localBookmarks
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthNav);
  } else {
    initAuthNav();
  }
})();
