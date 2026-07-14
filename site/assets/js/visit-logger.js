// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

(async function(){
  const script = document.currentScript;
  const PAGE = script?.dataset?.page || (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/,'') || 'index';
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

  async function getGeo(){
    try {
      const response = await fetch('https://get.geojs.io/v1/ip/geo.json', { cache:'no-store' });
      if (!response.ok) return null;
      const geo = await response.json();
      if (geo && geo.latitude && geo.longitude) {
        return {
          ip: geo.ip || null,
          lat: +geo.latitude,
          lon: +geo.longitude,
          city: geo.city || null,
          region: geo.region || null,
          country: geo.country || null
        };
      }
    } catch (_) {}
    return null;
  }

  try {
    const geo = await getGeo();
    const base = geo?.ip ? geo.ip : `vid:${getVisitorId()}`;
    const payload = {
      page: PAGE,
      ip_hash: await sha256hex(base),
      city: geo?.city || null,
      region: geo?.region || null,
      country: geo?.country || null,
      lat: (geo && typeof geo.lat === 'number') ? geo.lat : null,
      lon: (geo && typeof geo.lon === 'number') ? geo.lon : null,
      ua: navigator.userAgent,
      referrer: document.referrer || null
    };

    const { error } = await sb.from('visits').insert(payload);
    if (error) console.error('visit logger insert error', error);
  } catch (error) {
    console.error('visit logger failed', error);
  }
})();
