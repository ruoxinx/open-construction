// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

(() => {
  const icons = {
    access: '<path d="M7 7h10v10"></path><path d="M7 17 17 7"></path><path d="M5 21h14a2 2 0 0 0 2-2V5"></path>',
    share: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 10.5 6.8-4"></path><path d="m8.6 13.5 6.8 4"></path>'
  };

  function content(icon, label) {
    const paths = icons[icon] || icons.access;
    return `<svg class="btn-action-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg><span class="btn-label">${String(label ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}</span>`;
  }

  window.OCActionButton = { content };
})();
