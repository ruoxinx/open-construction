// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

async function fetchDatasets(){
  const candidates = [
    'data/datasets.json',
    './data/datasets.json',
    '/open-construction/data/datasets.json',
    (window.location.pathname.includes('/datasets/') ? '../data/datasets.json' : null)
  ].filter(Boolean);
  let lastErr = null;
  for(const url of candidates){
    try{
      const res = await fetch(url, { cache: 'no-cache' });
      if(res.ok){
        const txt = await res.text();
        try{ return JSON.parse(txt); }catch(parseErr){
          console.error('datasets.json parse error at', url, parseErr, txt.slice(0,200));
          lastErr = parseErr;
        }
      }else{
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
      }
    }catch(e){
      lastErr = e;
    }
  }
  showErrorBanner('Could not load data/datasets.json. Ensure the file exists. See Console for details.');
  console.error('Failed to load datasets.json from', candidates, lastErr);
  return {};
}
function showErrorBanner(msg){
  let b = document.getElementById('errBanner');
  if(!b){
    b = document.createElement('div');
    b.id = 'errBanner';
    b.className = 'alert alert-danger m-0 text-center';
    document.body.prepend(b);
  }
  b.textContent = msg;
}
function getParam(name){ const url = new URL(window.location.href); return url.searchParams.get(name); }
function formatInt(n){ if(n===null||n===undefined) return '—'; if(typeof n==='number') return n.toLocaleString(); return String(n); }
function getLocalViewsKey(id){ return 'views_'+id; }
function getViews(id){ return parseInt(localStorage.getItem(getLocalViewsKey(id))||'0',10); }
function incViews(id){ const k=getLocalViewsKey(id); const v=getViews(id)+1; localStorage.setItem(k, String(v)); return v; }
document.addEventListener('DOMContentLoaded', ()=>{ const y=document.getElementById('yearNow'); if(y) y.textContent = new Date().getFullYear(); });

function normalizeOcTaskKey(value){
  return String(value || '').trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

(function(){
  let vocabCache = null;
  let vocabPromise = null;

  function normArray(value){
    if (Array.isArray(value)) return value.filter(v => v != null && String(v).trim() !== '');
    if (value == null || String(value).trim() === '') return [];
    return [value];
  }

  function vocabCandidates(){
    return Array.from(new Set([
      'data/task-vocabulary.json',
      './data/task-vocabulary.json',
      '../data/task-vocabulary.json',
      '/open-construction/data/task-vocabulary.json'
    ]));
  }

  async function loadTaskVocabulary(){
    if (vocabCache) return vocabCache;
    if (vocabPromise) return vocabPromise;

    vocabPromise = (async () => {
      for (const url of vocabCandidates()){
        try{
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) continue;
          const payload = await res.json();
          const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
          const aliasToPreferred = new Map();
          const aliasToTask = new Map();

          tasks.forEach(task => {
            const preferred = String(task?.preferred_label || '').trim();
            const labels = [task?.preferred_label, task?.canonical_key, ...normArray(task?.aliases)];
            labels.forEach(label => {
              const key = normalizeOcTaskKey(label);
              if (!key || !preferred) return;
              aliasToPreferred.set(key, preferred);
              aliasToTask.set(key, task);
            });
          });

          vocabCache = { tasks, aliasToPreferred, aliasToTask };
          window.OC_TASK_VOCAB = vocabCache;
          return vocabCache;
        }catch(err){
          console.warn('Failed to load task vocabulary from', url, err);
        }
      }

      vocabCache = { tasks: [], aliasToPreferred: new Map(), aliasToTask: new Map() };
      window.OC_TASK_VOCAB = vocabCache;
      return vocabCache;
    })();

    return vocabPromise;
  }

  function preferredTaskLabel(raw){
    const key = normalizeOcTaskKey(raw);
    if (!key) return '';
    const aliasMap = window.OC_TASK_VOCAB?.aliasToPreferred;
    return aliasMap?.get(key) || '';
  }

  function canonicalTaskList(values){
    const seen = new Set();
    const output = [];
    normArray(values).forEach(value => {
      const label = preferredTaskLabel(value) || String(value).trim();
      const key = normalizeOcTaskKey(label);
      if (!key || seen.has(key)) return;
      seen.add(key);
      output.push(label);
    });
    return output;
  }

  window.loadTaskVocabulary = loadTaskVocabulary;
  window.ocPreferredTaskLabel = preferredTaskLabel;
  window.ocCanonicalTaskList = canonicalTaskList;

  loadTaskVocabulary().catch(() => {});
})();
