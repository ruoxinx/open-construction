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
