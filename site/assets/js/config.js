// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

// assets/js/config.js
window.SUPABASE_URL = 'https://nytzjmixkvrnwvaenxme.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55dHpqbWl4a3Zybnd2YWVueG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NjU3MTQsImV4cCI6MjA3MzQ0MTcxNH0.FCs06N70457f06fpGfIqK4aip0pfTib9qZYQ_rAvE8s';

window.OC_DATA_SOURCES = {
  datasets: [],
  benchmarkResults: []
};

window.OCData = window.OCData || {};

window.OCData.candidates = function(name, localUrl){
  return [
    ...(window.OC_DATA_SOURCES?.[name] || []),
    localUrl
  ].filter(Boolean);
};

window.OCData.loadFirstJson = async function(name, localUrl){
  const candidates = window.OCData.candidates(name, localUrl);
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res?.ok) return await res.json();
    } catch (err) {
      console.warn('Could not load', url, err);
    }
  }
  return null;
};

window.OCData.toArray = function(data){
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data && typeof data === 'object') {
    return Object.values(data).filter(v => v && typeof v === 'object');
  }
  return [];
};

window.OCData.loadFirstJsonArray = async function(name, localUrl){
  return window.OCData.toArray(await window.OCData.loadFirstJson(name, localUrl));
};
