function render(list){
  els.grid.innerHTML = '';
  if(!list.length){
    els.empty.classList.remove('d-none');
    els.count.textContent = '0';
    return;
  }
  els.empty.classList.add('d-none');
  els.count.textContent = String(list.length);

  list.forEach(r=>{
    const img   = r.image || placeholderImg;
    const langs = tokens(r.language).map(x=>`<span class="tag">${x}</span>`).join('');
    const tops  = tokens(r.topics).map(x=>`<span class="tag">${x}</span>`).join('');
    const meds  = tokens(r.media).map(x=>`<span class="tag">${x}</span>`).join('');
    const lic   = r.license || 'See source';
    const added = fmtAdded(r.added);
    const year  = fmtYear(r.year || r.added);

    // ✅ Build contributor overlay (only if contributor or link provided)
    const submittedByHTML = (r.contributor || r.contributor_url)
      ? `<div class="submitted-by position-absolute bottom-0 start-0 w-100 text-center small py-1 bg-white bg-opacity-75">
           <a href="${r.contributor_url || '#'}" target="_blank" rel="noopener" class="text-muted text-decoration-none">
             Submitted by <strong>${r.contributor.startsWith('@') ? r.contributor : '@' + r.contributor}</strong>
           </a>
         </div>`
      : '';

    els.grid.insertAdjacentHTML('beforeend', `
      <div class="col-md-6 col-xl-4">
        <article class="resource-card h-100 position-relative">
          <div class="position-relative">
            <img class="thumb" src="${img}" alt="${r.title} image" onerror="this.src='${placeholderImg}'">
            ${submittedByHTML}
          </div>

          <div class="card-body d-flex flex-column">
            <div class="title mb-1">${r.title}</div>

            <!-- Provider + Year -->
            <div class="d-flex justify-content-between align-items-center mb-2 small text-muted">
              <div>
                ${r.provider ? `<span>${r.provider}</span>` : ``}
                ${year ? `<span class="badge bg-light text-dark border ms-1">${year}</span>` : ``}
              </div>
            </div>

            <div class="mb-2"><strong>Language:</strong> <div class="tag-lane mt-1">${langs || '—'}</div></div>
            <div class="mb-2"><strong>Topics:</strong> <div class="tag-lane mt-1">${tops || '—'}</div></div>
            <div class="mb-2"><strong>Media:</strong> <div class="tag-lane mt-1">${meds || '—'}</div></div>
            <div class="mb-2"><strong>License:</strong> <span class="tag">${lic}</span></div>

            <!-- Bottom row: Button + Added date -->
            <div class="mt-auto d-flex justify-content-between align-items-center">
              <a class="btn btn-primary btn-sm" href="${r.source}" target="_blank" rel="noopener">View resource</a>
              ${added ? `<div class="small text-muted ms-2">Added: <time datetime="${r.added}">${added}</time></div>` : ``}
            </div>
          </div>
        </article>
      </div>
    `);
  });
}
