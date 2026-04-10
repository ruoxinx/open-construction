(function(){
  const DEFAULT_URL = 'data/institutions.json';
  const DEFAULT_DIRECTIONS = ['right', 'left', 'right'];

  function resolveUrl(url){
    return new URL(url || DEFAULT_URL, location.href).toString();
  }

  async function loadInstitutions(url){
    const response = await fetch(resolveUrl(url), { cache: 'no-store' });
    if (!response.ok) throw new Error('Cannot load institutions.json');
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.filter(item => item && item.name && item.logo);
  }

  function createLogoNode(item, index){
    const card = document.createElement('div');
    card.className = 'logo';
    card.setAttribute('role', 'listitem');

    const img = document.createElement('img');
    img.src = item.logo;
    img.alt = item.name;
    img.loading = index < 3 ? 'eager' : 'lazy';
    img.decoding = 'async';
    if (index < 3) img.setAttribute('fetchpriority', 'high');

    card.appendChild(img);
    return card;
  }

  function distribute(items, rowCount){
    const groups = Array.from({ length: rowCount }, () => []);
    items.forEach((item, index) => {
      groups[index % rowCount].push(item);
    });
    return groups;
  }

  function applyTrackAnimation(track, items, direction, baseSpeed){
    if (!track || !items.length) return;

    const nodes = items.map((item, index) => createLogoNode(item, index));
    track.replaceChildren(...nodes, ...nodes.map(node => node.cloneNode(true)));

    const speed = Number(track.getAttribute('data-speed')) || baseSpeed || 46;
    const duration = Math.min(120, speed + Math.max(0, items.length - 8) * 1.5);
    track.style.animationDuration = duration + 's';
    track.style.animationTimingFunction = 'linear';
    track.style.animationIterationCount = 'infinite';
    track.style.animationName = direction === 'right' ? 'oc-marquee-right' : 'oc-marquee-left';
  }

  function markLoaded(root){
    root.querySelectorAll('.logo img').forEach(img => {
      const parent = img.closest('.logo');
      const done = () => parent && parent.classList.add('loaded');
      if (img.complete && img.naturalWidth > 0) done();
      else img.addEventListener('load', done, { once: true });
    });
  }

  async function renderInstitutionMarquee(options){
    const settings = options || {};
    const root = typeof settings.target === 'string'
      ? document.querySelector(settings.target)
      : settings.target;
    if (!root) return { count: 0, institutions: [] };

    const institutions = await loadInstitutions(settings.url);
    const rowWrappers = Array.from(root.querySelectorAll('.row-marquee'));
    const directTrack = root.querySelector(':scope > .logo-track');

    if (rowWrappers.length) {
      const groups = distribute(institutions, rowWrappers.length);
      rowWrappers.forEach((row, index) => {
        const track = row.querySelector('.logo-track');
        const direction = row.getAttribute('data-direction') || DEFAULT_DIRECTIONS[index % DEFAULT_DIRECTIONS.length];
        applyTrackAnimation(track, groups[index], direction, settings.speed);
      });
    } else if (directTrack) {
      applyTrackAnimation(directTrack, institutions, settings.direction || 'left', settings.speed);
    }

    markLoaded(root);
    return { count: institutions.length, institutions: institutions };
  }

  window.OpenConstructionInstitutions = {
    loadInstitutions: loadInstitutions,
    renderInstitutionMarquee: renderInstitutionMarquee
  };
})();
