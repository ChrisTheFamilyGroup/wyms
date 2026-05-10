/**
 * WYMS Collection Grid Logic
 * Handles: AJAX Filters & Sorting, Wishlist, Promo cards, and Dynamic Grid Reflow
 */

class WymsCollectionFilters {
  constructor() {
    this.gridSelector     = '.wyms-collection-grid__rows';
    this.filterSelector   = '.js-collection-filters';
    this.formSelector     = '#FacetsFilterForm';
    this.sectionRootSelector = '.wyms-collection-grid';

    /** @type {HTMLElement | null} */
    this.sectionRoot = document.querySelector(this.sectionRootSelector);
    this.sectionInstanceId = this.sectionRoot?.getAttribute('data-section-id') || null;

    // Прив'язуємо один раз — щоб можна було removeEventListener
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

  /**
   * Прив'язуємо change до форми — через onchange (не addEventListener),
   * щоб гарантовано був лише один обробник
   */
  bindForm() {
    /** @type {HTMLFormElement | null} */
    const form = /** @type {HTMLFormElement | null} */ (document.querySelector(this.formSelector));
    if (!form) return;
    form.onchange = this._onChange;
  }

  /**
   * Повністю кастомний toggle для <details> —
   * уникаємо нативної браузерної поведінки яка глючить після innerHTML-заміни
   */
  bindDetailsToggle() {
    document.querySelectorAll('.facet-details').forEach((detailsEl) => {
      /** @type {HTMLDetailsElement & { _wymsToggleBound?: boolean }} */
      // @ts-ignore - custom flag on element
      const details = /** @type {any} */ (detailsEl);
      // Прибираємо старий listener якщо є (через прапор)
      if (details._wymsToggleBound) return;
      details._wymsToggleBound = true;

      const summary = details.querySelector('summary');
      if (!summary) return;

      summary.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isOpen = details.hasAttribute('open');

        // Закриваємо всі інші
        document.querySelectorAll('.facet-details[open]').forEach(other => {
          if (other !== details) other.removeAttribute('open');
        });

        // Тоглимо поточний
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
    // Закриваємо всі дропдауни
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
      // Use the *instance* section id so it works across templates/collections.
      const sectionId = this.sectionInstanceId || 'wyms-collection-grid';
      const response = await fetch(`${url}&section_id=${encodeURIComponent(String(sectionId))}`);
      if (!response.ok) throw new Error('Network response was not ok');

      const html = new DOMParser().parseFromString(await response.text(), 'text/html');

      // 1. Оновлюємо сітку
      const newGrid = html.querySelector(this.gridSelector);
      /** @type {HTMLElement | null} */
      const curGrid = /** @type {HTMLElement | null} */ (document.querySelector(this.gridSelector));
      if (newGrid && curGrid) curGrid.innerHTML = newGrid.innerHTML;

      // 2. Оновлюємо фільтри — спочатку прибираємо open з нового HTML
      const newFilters = html.querySelector(this.filterSelector);
      /** @type {HTMLElement | null} */
      const curFilters = /** @type {HTMLElement | null} */ (document.querySelector(this.filterSelector));
      if (newFilters && curFilters) {
        newFilters.querySelectorAll('details[open]').forEach(d => d.removeAttribute('open'));
        curFilters.innerHTML = newFilters.innerHTML;
      }

      // 3. Оновлюємо URL
      if (pushToHistory) history.pushState({ path: url }, '', url);

      // 4. Перевязуємо все на нових DOM-елементах
      this.bindForm();
      this.bindDetailsToggle();
      this.syncSortFromUrl();

      if (typeof initWishlist    === 'function') initWishlist();
      if (typeof initPromoCards  === 'function') initPromoCards();
      if (typeof wymsReflowRows  === 'function') wymsReflowRows();

    } catch (err) {
      console.error('[WymsFilters] AJAX error:', err);
    } finally {
      /** @type {HTMLElement | null} */
      const g = /** @type {HTMLElement | null} */ (document.querySelector(this.gridSelector));
      if (g) g.style.opacity = '1';
    }
  }

  /**
   * Синхронізуємо radio сортування з поточним URL
   * (на випадок якщо Shopify повернув HTML без checked)
   */
  syncSortFromUrl() {
    const sortBy = new URLSearchParams(window.location.search).get('sort_by');
    /** @type {HTMLFormElement | null} */
    const form   = /** @type {HTMLFormElement | null} */ (document.querySelector(this.formSelector));
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

    // Уникаємо дублювання listeners через заміну вузла
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

document.addEventListener('DOMContentLoaded', () => {
  new WymsCollectionFilters();
  initWishlist();
  initPromoCards();
  wymsReflowRows();
});