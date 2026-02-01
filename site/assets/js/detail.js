/* ============================================================
 * detail.js — OpenConstruction
 * Model / Dataset / Publication detail renderer
 * ============================================================ */

/* -------------------------
 * Utilities
 * ------------------------- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function metaRow(label, value) {
  if (!value) return '';
  return `
    <div class="meta-row">
      <div class="meta-label">${label}</div>
      <div class="meta-value">${value}</div>
    </div>
  `;
}

/* -------------------------
 * Abstract toggle helper
 * ------------------------- */

function abstractToggleHtml(text, opts = {}) {
  const t = (text == null) ? '' : String(text).trim();
  if (!t) return '';

  const {
    collapsedLines = 6,
    minCharsForToggle = 320
  } = opts;

  // Short abstract → no toggle
  if (t.length < minCharsForToggle) {
    return `<div class="abs small">${escapeHtml(t)}</div>`;
  }

  return `
    <div class="oc-abs-wrap" data-oc-abs>
      <div class="oc-abs-text abs small is-collapsed"
           style="--oc-abs-lines:${collapsedLines}">
        ${escapeHtml(t)}
      </div>
      <button type="button"
              class="btn btn-link btn-sm p-0 oc-abs-toggle"
              data-oc-abs-toggle
              aria-expanded="false">
        Show more
      </button>
    </div>
  `;
}

/* -------------------------
 * Main init
 * ------------------------- */

function initDetail() {
  const root = document.getElementById('detail-root');
  if (!root || !window.__DETAIL_DATA__) return;

  const data = window.__DETAIL_DATA__;
  const type = data.type;

  /* ============================================================
   * MODEL DETAIL PAGE
   * ============================================================ */

  if (type === 'model') {
    const m = data.model;

    root.innerHTML = `
      <div class="detail-hero">
        <div class="detail-main">

          <h1 class="detail-title">${escapeHtml(m.name || 'Model')}</h1>

          <div class="detail-meta">

            ${metaRow(
              'Abstract',
              abstractToggleHtml(m.abstract, {
                collapsedLines: 6,
                minCharsForToggle: 320
              })
            )}

            ${metaRow('Task', escapeHtml(m.task))}
            ${metaRow('Modality', escapeHtml(m.modality))}
            ${metaRow('License', escapeHtml(m.license))}
            ${metaRow(
              'Paper',
              m.paper_url
                ? `<a href="${m.paper_url}" target="_blank" rel="noopener">View paper</a>`
                : ''
            )}

          </div>
        </div>
      </div>

      <style>
        .abs { white-space: pre-wrap; }

        .meta-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 12px;
          margin-bottom: 10px;
        }

        .meta-label {
          font-weight: 600;
          color: #555;
        }

        .meta-value {
          color: #222;
        }

        /* Abstract toggle styles */
        .oc-abs-wrap { position: relative; }

        .oc-abs-text.is-collapsed {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: var(--oc-abs-lines, 6);
          overflow: hidden;
          position: relative;
        }

        .oc-abs-text.is-collapsed::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2.2em;
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,1)
          );
          pointer-events: none;
        }

        .oc-abs-toggle {
          font-weight: 600;
          text-decoration: none;
        }

        .oc-abs-toggle:hover {
          text-decoration: underline;
        }
      </style>
    `;

    /* ----------------------------------
     * Abstract toggle wiring
     * ---------------------------------- */

    root.querySelectorAll('[data-oc-abs]').forEach(wrap => {
      const textEl = wrap.querySelector('.oc-abs-text');
      const btn = wrap.querySelector('[data-oc-abs-toggle]');
      if (!textEl || !btn) return;

      btn.addEventListener('click', () => {
        const collapsed = textEl.classList.toggle('is-collapsed');
        btn.textContent = collapsed ? 'Show more' : 'Show less';
        btn.setAttribute(
          'aria-expanded',
          collapsed ? 'false' : 'true'
        );
      });
    });

    return;
  }

  /* ============================================================
   * OTHER DETAIL TYPES (dataset / publication)
   * ============================================================ */

  // Existing logic untouched
}

/* -------------------------
 * Boot
 * ------------------------- */

document.addEventListener('DOMContentLoaded', initDetail);
