/**
 * WYMS Collection Grid Logic
 * Handles: AJAX Filters & Sorting, Wishlist, Promo cards, Dynamic Grid Reflow,
 *          Mobile Filter Drawer
 */

class WymsCollectionFilters {
  constructor() {
    this.gridSelector        = '.wyms-collection-grid__rows';
    this.filterSelector      = '.js-collection-filters';
    this.formSelector        = '#FacetsFilterForm';
    this.sectionRootSelector = '.wyms-collection-grid';

    /** @type {HTMLElement | null} */
    this.sectionRoot = document.querySelector(this.sectionRootSelector);
    this.sectionInstanceId = this.sectionRoot?.getAttribute('data-section-id') || null;

    this._onChange = () => this.updateFilters();
    /** @param {MouseEvent} e */
    this._onOutsideClick = (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || !target.closest('.facet-details')) {
        document.querySelectorAll('.facet-details[open]').forEach(el => el.removeAttribute('open'));
      }
    };

    document.addEventListener('click', this._onOutsideClick);
    window.addEventListener('popstate', () => this.updateFilters(window.location.search, false));

    this.bindForm();
    this.bindDetailsToggle();
  }

  bindForm() {
    /** @type {HTMLFormElement | null} */
    const form = /** @type {HTMLFormElement | null} */ (document.querySelector(this.formSelector));
    if (!form) return;
    form.onchange = this._onChange;
  }

  bindDetailsToggle() {
    document.querySelectorAll('.facet-details').forEach((detailsEl) => {
      // @ts-ignore
      const details = /** @type {any} */ (detailsEl);
      if (details._wymsToggleBound) return;
      details._wymsToggleBound = true;

      const summary = details.querySelector('summary');
      if (!summary) return;

      summary.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = details.hasAttribute('open');

        document.querySelectorAll('.facet-details[open]').forEach(other => {
          if (other !== details) other.removeAttribute('open');
        });

        if (isOpen) {
          details.removeAttribute('open');
        } else {
          details.setAttribute('open', '');
        }
      });
    });
  }

  /**
   * @param {string | null} customParams
   * @param {boolean} pushToHistory
   */
  async updateFilters(customParams = null, pushToHistory = true) {
    document.querySelectorAll('.facet-details[open]').forEach(el => el.removeAttribute('open'));

    /** @type {HTMLFormElement | null} */
    const form = /** @type {HTMLFormElement | null} */ (document.querySelector(this.formSelector));
    if (!form) return;

    /** @type {string} */
    let searchParams;
    if (typeof customParams === 'string' && customParams.length) {
      searchParams = customParams.replace(/^\?/, '');
    } else {
      const fd = new FormData(form);
      const usp = new URLSearchParams();
      fd.forEach((value, key) => usp.append(key, String(value)));
      searchParams = usp.toString();
    }

    const url = `${window.location.pathname}?${searchParams}`;

    /** @type {HTMLElement | null} */
    const grid = /** @type {HTMLElement | null} */ (document.querySelector(this.gridSelector));
    if (grid) {
      grid.style.transition = 'opacity 0.2s ease';
      grid.style.opacity = '0.4';
    }

    try {
      const sectionId = this.sectionInstanceId || 'wyms-collection-grid';
      const response = await fetch(`${url}&section_id=${encodeURIComponent(String(sectionId))}`);
      if (!response.ok) throw new Error('Network response was not ok');

      const html = new DOMParser().parseFromString(await response.text(), 'text/html');

      const newGrid = html.querySelector(this.gridSelector);
      /** @type {HTMLElement | null} */
      const curGrid = /** @type {HTMLElement | null} */ (document.querySelector(this.gridSelector));
      if (newGrid && curGrid) curGrid.innerHTML = newGrid.innerHTML;

      const newFilters = html.querySelector(this.filterSelector);
      /** @type {HTMLElement | null} */
      const curFilters = /** @type {HTMLElement | null} */ (document.querySelector(this.filterSelector));
      if (newFilters && curFilters) {
        newFilters.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
        curFilters.innerHTML = newFilters.innerHTML;
      }

      if (pushToHistory) history.pushState({ path: url }, '', url);

      this.bindForm();
      this.bindDetailsToggle();
      this.syncSortFromUrl();

      if (typeof initWishlist   === 'function') initWishlist();
      if (typeof initPromoCards === 'function') initPromoCards();
      if (typeof wymsReflowRows === 'function') wymsReflowRows();

    } catch (err) {
      console.error('[WymsFilters] AJAX error:', err);
    } finally {
      /** @type {HTMLElement | null} */
      const g = /** @type {HTMLElement | null} */ (document.querySelector(this.gridSelector));
      if (g) g.style.opacity = '1';
    }
  }

  syncSortFromUrl() {
    const sortBy = new URLSearchParams(window.location.search).get('sort_by');
    /** @type {HTMLFormElement | null} */
    const form = /** @type {HTMLFormElement | null} */ (document.querySelector(this.formSelector));
    if (!sortBy || !form) return;
    form.querySelectorAll('input[name="sort_by"]').forEach((rEl) => {
      const r = /** @type {HTMLInputElement} */ (rEl);
      r.checked = (r.value === sortBy);
    });
  }
}

/* -----------------------------------
   Wishlist
----------------------------------- */
function initWishlist() {
  document.querySelectorAll('.wyms-product-card__wishlist').forEach((btnEl) => {
    const btn = /** @type {HTMLElement} */ (btnEl);
    const card = /** @type {HTMLElement | null} */ (btn.closest('[data-product-id]'));
    const productId = card?.dataset?.productId;
    if (!productId) return;

    const storageKey = `wishlist_${productId}`;
    if (localStorage.getItem(storageKey) === 'true') btn.classList.add('is-active');

    const fresh = /** @type {HTMLElement} */ (btn.cloneNode(true));
    btn.replaceWith(fresh);
    fresh.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      localStorage.setItem(storageKey, fresh.classList.toggle('is-active') ? 'true' : 'false');
    });
  });
}

/* -----------------------------------
   Promo Cards
----------------------------------- */
function initPromoCards() {
  document.querySelectorAll('.wyms-card-insert--promo').forEach(card => {
    const btn = card.querySelector('.wyms-card-insert__btn');
    if (!btn) return;
    const fresh = /** @type {HTMLElement} */ (card.cloneNode(true));
    card.replaceWith(fresh);
    fresh.addEventListener('click', e => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || !target.closest('.wyms-card-insert__btn')) {
        /** @type {HTMLElement | null} */
        const innerBtn = /** @type {HTMLElement | null} */ (fresh.querySelector('.wyms-card-insert__btn'));
        innerBtn?.click();
      }
    });
  });
}

/* -----------------------------------
   Grid Reflow
----------------------------------- */
function wymsReflowRows() {
  const isMobile    = window.matchMedia('(max-width: 767px)').matches;
  const isTablet    = window.matchMedia('(max-width: 1023px)').matches && !isMobile;
  const itemsPerRow = isMobile ? 1 : isTablet ? 2 : 3;

  /** @type {HTMLElement | null} */
  const rowsContainer = /** @type {HTMLElement | null} */ (document.querySelector('.wyms-collection-grid__rows'));
  if (!rowsContainer) return;

  /** @type {HTMLElement[]} */
  let segmentCards = [];
  /** @type {HTMLElement[]} */
  let segmentDefaultRows = [];

  const flushSegment = () => {
    if (!segmentDefaultRows.length) { segmentCards = []; segmentDefaultRows = []; return; }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < segmentCards.length; i += itemsPerRow) {
      const row = document.createElement('div');
      row.className = 'wyms-collection-grid__row wyms-collection-grid__row--default';
      for (let j = 0; j < itemsPerRow; j++) {
        const card = segmentCards[i + j];
        if (card) row.appendChild(card);
      }
      frag.appendChild(row);
    }
    const firstRow = segmentDefaultRows[0] || null;
    rowsContainer.insertBefore(frag, firstRow);
    segmentDefaultRows.forEach(r => r.remove());
    segmentCards = []; segmentDefaultRows = [];
  };

  Array.from(rowsContainer.children)
    .filter((n) => n instanceof HTMLElement)
    .forEach((nodeEl) => {
      const node = /** @type {HTMLElement} */ (nodeEl);
      if (node.classList.contains('wyms-collection-grid__row--default')) {
        segmentDefaultRows.push(node);
        segmentCards.push(
          ...Array.from(node.children)
            .filter((n) => n instanceof HTMLElement)
            .map((n) => /** @type {HTMLElement} */ (n))
        );
      } else if (node.classList.contains('wyms-collection-grid__row--feature')) {
        flushSegment();
      }
    });
  flushSegment();
}

/** @type {number | null} */
let wymsReflowRaf = null;
window.addEventListener('resize', () => {
  if (wymsReflowRaf) cancelAnimationFrame(wymsReflowRaf);
  wymsReflowRaf = requestAnimationFrame(() => { wymsReflowRaf = null; wymsReflowRows(); });
});

/* ============================================================
   MOBILE DRAWER
   ============================================================ */

class WymsMobileDrawer {
  constructor() {
    /** @type {HTMLElement | null} */
    this.drawer  = /** @type {HTMLElement | null} */ (document.querySelector('.js-mobile-drawer'));
    /** @type {HTMLElement | null} */
    this.overlay = /** @type {HTMLElement | null} */ (document.querySelector('.js-mobile-drawer-overlay'));

    if (!this.drawer || !this.overlay) return;

    // Pending state that will be applied on "Anwenden"
    /** @type {Record<string, string[]>} */
    this._pending = {};

    this._initState();
    this._bindOpen();
    this._bindClose();
    this._bindRows();
    this._bindFooter();
    this._bindResizeClose();
  }

  /* ---------- initialise pending state from current URL ---------- */
  _initState() {
    // For chips we need labels, not values.
    // We read checked state directly from DOM (Liquid already marks active ones).

    // sort chip — read from already-checked radio label
    const checkedRadio = /** @type {HTMLInputElement | null} */ (this.drawer.querySelector('input[type="radio"]:checked'));
    const sortChipEl = this.drawer.querySelector('.js-mobile-sort-chip');
    if (sortChipEl && checkedRadio) {
      sortChipEl.textContent = checkedRadio.closest('.wyms-mobile-filter-checkbox-label')
        ?.querySelector('.wyms-mobile-filter-checkbox__text')?.textContent?.trim() || '';
    }

    // filter chips — build from checked checkboxes' label text
    this.drawer.querySelectorAll('.js-mobile-filter-row[data-filter-index]').forEach((rowEl) => {
      const row = /** @type {HTMLElement} */ (rowEl);
      const idx = row.dataset.filterIndex;
      const drop = this.drawer.querySelector(`.js-mobile-filter-dropdown[data-filter-index="${idx}"]`);
      if (!drop) return;

      /** @type {string[]} */
      const selectedLabels = [];
      drop.querySelectorAll('input[type="checkbox"]:checked').forEach((inputEl) => {
        const label = inputEl.closest('.wyms-mobile-filter-checkbox-label')
          ?.querySelector('.wyms-mobile-filter-checkbox__text')?.textContent?.trim() || '';
        if (label) selectedLabels.push(label);
      });

      const chipsWrap = row.querySelector('.js-mobile-filter-chips');
      if (chipsWrap) this._renderChips(chipsWrap, selectedLabels);
    });

    // Also populate _pending from URL for _apply() to work correctly
    const usp = new URLSearchParams(window.location.search);
    const urlSort = usp.get('sort_by');
    if (urlSort) this._pending['sort_by'] = [urlSort];

    this.drawer.querySelectorAll('.wyms-mobile-filter-dropdown[data-filter-index]').forEach((drop) => {
      drop.querySelectorAll('input[type="checkbox"]').forEach((inputEl) => {
        const input = /** @type {HTMLInputElement} */ (inputEl);
        if (!this._pending[input.name]) this._pending[input.name] = [];
        if (input.checked && !this._pending[input.name].includes(input.value)) {
          this._pending[input.name].push(input.value);
        }
      });
    });
  }

  /* ---------- open drawer ---------- */
  _bindOpen() {
    document.querySelectorAll('.js-open-mobile-filters').forEach(btn => {
      btn.addEventListener('click', () => this.open());
    });
  }

  open() {
    if (!this.drawer || !this.overlay) return;
    this.overlay.classList.add('is-visible');
    this.drawer.classList.add('is-visible');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.overlay.classList.add('is-open');
        this.drawer.classList.add('is-open');
      });
    });
  }

  /* ---------- close drawer ---------- */
  _bindClose() {
    document.querySelectorAll('.js-close-mobile-filters').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });
    this.overlay.addEventListener('click', () => this.close());
  }

  close() {
    if (!this.drawer || !this.overlay) return;

    // close all open dropdowns
    this.drawer.querySelectorAll('.wyms-mobile-filter-dropdown.is-open').forEach(d => d.classList.remove('is-open'));

    this.overlay.classList.remove('is-open');
    this.drawer.classList.remove('is-open');
    document.body.style.overflow = '';

    const onEnd = () => {
      this.overlay.classList.remove('is-visible');
      this.drawer.classList.remove('is-visible');
      this.drawer.removeEventListener('transitionend', onEnd);
    };
    this.drawer.addEventListener('transitionend', onEnd);
  }

  /* ---------- filter rows (accordion) ---------- */
  _bindRows() {
    if (!this.drawer) return;

    this.drawer.querySelectorAll('.js-mobile-filter-row').forEach((rowEl) => {
      const row = /** @type {HTMLElement} */ (rowEl);
      const type = row.dataset.type;

      row.addEventListener('click', () => {
        if (type === 'sort') {
          const drop = this.drawer.querySelector('.js-mobile-sort-dropdown');
          this._toggleDropdown(drop, row);
        } else {
          const idx = row.dataset.filterIndex;
          const drop = this.drawer.querySelector(`.js-mobile-filter-dropdown[data-filter-index="${idx}"]`);
          this._toggleDropdown(drop, row);
        }
      });
    });

    // Bind change events for sort radios
    this.drawer.querySelectorAll('.js-mobile-sort-dropdown input[type="radio"]').forEach((inputEl) => {
      const input = /** @type {HTMLInputElement} */ (inputEl);
      input.addEventListener('change', () => {
        this._pending['sort_by'] = [input.value];

        // update chip label
        const chip = this.drawer.querySelector('.js-mobile-sort-chip');
        if (chip) chip.textContent = input.closest('.wyms-mobile-filter-checkbox-label')?.querySelector('.wyms-mobile-filter-checkbox__text')?.textContent || '';
      });
    });

    // Bind change events for filter checkboxes
    this.drawer.querySelectorAll('.js-mobile-filter-dropdown[data-filter-index] input[type="checkbox"]').forEach((inputEl) => {
      const input = /** @type {HTMLInputElement} */ (inputEl);
      input.addEventListener('change', () => {
        const name = input.name;
        if (!this._pending[name]) this._pending[name] = [];
        if (input.checked) {
          if (!this._pending[name].includes(input.value)) {
            this._pending[name].push(input.value);
          }
        } else {
          this._pending[name] = this._pending[name].filter(v => v !== input.value);
        }

        // find which filter-row owns this dropdown by data-filter-index
        const drop = input.closest('.js-mobile-filter-dropdown');
        const idx  = drop?.getAttribute('data-filter-index');
        if (idx !== null && idx !== undefined) {
          const row = this.drawer.querySelector(`.js-mobile-filter-row[data-filter-index="${idx}"]`);
          if (row) this._refreshRowChips(row, name);
        }
      });
    });
  }

  /**
   * Toggle a dropdown open/closed, closing others first.
   * @param {Element | null} drop
   * @param {HTMLElement} row
   */
  _toggleDropdown(drop, row) {
    if (!drop) return;
    const isOpen = drop.classList.contains('is-open');

    // close all
    this.drawer.querySelectorAll('.wyms-mobile-filter-dropdown.is-open').forEach(d => {
      if (d !== drop) d.classList.remove('is-open');
    });

    if (isOpen) {
      drop.classList.remove('is-open');
    } else {
      drop.classList.add('is-open');
    }
  }

  /* ---------- footer buttons ---------- */
  _bindFooter() {
    const resetBtn = this.drawer?.querySelector('.js-mobile-drawer-reset');
    const applyBtn = this.drawer?.querySelector('.js-mobile-drawer-apply');

    resetBtn?.addEventListener('click', () => this._reset());
    applyBtn?.addEventListener('click', () => this._apply());
  }

  _reset() {
    // uncheck all checkboxes
    this.drawer.querySelectorAll('input[type="checkbox"]').forEach((inputEl) => {
      /** @type {HTMLInputElement} */ (inputEl).checked = false;
    });

    // reset sort to first radio
    const firstRadio = /** @type {HTMLInputElement | null} */ (this.drawer.querySelector('input[type="radio"]'));
    if (firstRadio) {
      this.drawer.querySelectorAll('input[type="radio"]').forEach(r => /** @type {HTMLInputElement} */ (r).checked = false);
      firstRadio.checked = true;
      this._pending['sort_by'] = [firstRadio.value];
      const chip = this.drawer.querySelector('.js-mobile-sort-chip');
      if (chip) chip.textContent = firstRadio.closest('.wyms-mobile-filter-checkbox-label')?.querySelector('.wyms-mobile-filter-checkbox__text')?.textContent || '';
    }

    // clear pending filters
    Object.keys(this._pending).forEach(k => {
      if (k !== 'sort_by') this._pending[k] = [];
    });

    this._refreshAllChips();
  }

  _apply() {
    const usp = new URLSearchParams();

    // sort
    const sortVal = (this._pending['sort_by'] || [])[0];
    if (sortVal) usp.set('sort_by', sortVal);

    // filters
    Object.entries(this._pending).forEach(([key, vals]) => {
      if (key === 'sort_by') return;
      vals.forEach(v => { if (v) usp.append(key, v); });
    });

    const url = `${window.location.pathname}?${usp.toString()}`;

    this.close();

    // Trigger AJAX update via the desktop filter instance
    if (window._wymsFiltersInstance) {
      window._wymsFiltersInstance.updateFilters(usp.toString(), true);
    } else {
      window.location.href = url;
    }
  }

  /* ---------- chip rendering ---------- */

  /**
   * Refresh chips for a single filter row by reading checked labels from its dropdown.
   * @param {Element} row
   * @param {string} _name  (unused, kept for API compat)
   */
  _refreshRowChips(row, _name) {
    const chipsWrap = row.querySelector('.js-mobile-filter-chips');
    if (!chipsWrap) return;

    const idx = /** @type {HTMLElement} */ (row).dataset.filterIndex;
    const drop = this.drawer.querySelector(`.js-mobile-filter-dropdown[data-filter-index="${idx}"]`);
    if (!drop) return;

    /** @type {string[]} */
    const selectedLabels = [];
    drop.querySelectorAll('input[type="checkbox"]:checked').forEach((inputEl) => {
      const label = inputEl.closest('.wyms-mobile-filter-checkbox-label')
        ?.querySelector('.wyms-mobile-filter-checkbox__text')?.textContent?.trim() || '';
      if (label) selectedLabels.push(label);
    });

    this._renderChips(chipsWrap, selectedLabels);
  }

  /** Refresh all filter rows chips from current DOM checked state */
  _refreshAllChips() {
    if (!this.drawer) return;

    // sort row chip
    const checkedRadio = /** @type {HTMLInputElement | null} */ (this.drawer.querySelector('input[type="radio"]:checked'));
    const sortChip = this.drawer.querySelector('.js-mobile-sort-chip');
    if (sortChip && checkedRadio) {
      sortChip.textContent = checkedRadio.closest('.wyms-mobile-filter-checkbox-label')
        ?.querySelector('.wyms-mobile-filter-checkbox__text')?.textContent?.trim() || '';
    }

    // filter rows
    this.drawer.querySelectorAll('.js-mobile-filter-row[data-filter-index]').forEach((rowEl) => {
      const row = /** @type {HTMLElement} */ (rowEl);
      this._refreshRowChips(row, '');
    });
  }

  /**
   * Renders chips into a chips wrapper, respecting max-2 visible rule with overflow badge.
   * @param {Element} wrap
   * @param {string[]} labels
   */
  _renderChips(wrap, labels) {
    wrap.innerHTML = '';
    if (!labels.length) return;

    const MAX_CHIPS = 2;
    const MAX_CHIP_WIDTH_PX = 100; // rough px cap per chip (controlled by CSS too)

    // We show up to MAX_CHIPS chips. If there are more, we show a +N badge.
    // The overflow logic for "too long" is handled via CSS (max-width + text-overflow on the chip).
    // For the +N count: always show how many did NOT fit (i.e. total - shown).

    const shown = labels.slice(0, MAX_CHIPS);
    const overflow = labels.length - shown.length;

    shown.forEach(label => {
      const chip = document.createElement('span');
      chip.className = 'wyms-mobile-filter-chip';
      chip.textContent = label;
      wrap.appendChild(chip);
    });

    if (overflow > 0) {
      const badge = document.createElement('span');
      badge.className = 'wyms-mobile-filter-chip--overflow';
      badge.textContent = `+${overflow}`;
      wrap.appendChild(badge);
    }
  }
  /** Close drawer automatically when viewport widens to desktop (>= 768px) */
  _bindResizeClose() {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (/** @type {MediaQueryListEvent | MediaQueryList} */ e) => {
      if (e.matches && this.drawer?.classList.contains('is-open')) {
        this.close();
      }
    };
    // Modern browsers
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    } else {
      // Safari < 14 fallback
      mq.addListener(handler);
    }
  }
}

/* -----------------------------------
   DOMContentLoaded — boot everything
----------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  window._wymsFiltersInstance = new WymsCollectionFilters();
  new WymsMobileDrawer();
  initWishlist();
  initPromoCards();
  wymsReflowRows();
});