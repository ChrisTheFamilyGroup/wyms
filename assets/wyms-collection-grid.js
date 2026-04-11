document.querySelectorAll('.wyms-product-card__wishlist').forEach(btn => {
    /** @type {HTMLElement|null} */
    const card = /** @type {HTMLElement|null} */ (btn.closest('[data-product-id]'));
    const productId = card?.dataset?.productId;
    if (!productId) return;
  
    const storageKey = `wishlist_${productId}`;
    if (localStorage.getItem(storageKey) === 'true') {
      btn.classList.add('is-active');
    }
  
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const active = btn.classList.toggle('is-active');
      localStorage.setItem(storageKey, active ? 'true' : 'false');
    });
  });
  
  document.querySelectorAll('.wyms-card-insert--promo').forEach(card => {
    const btn = card.querySelector('.wyms-card-insert__btn');
    if (!btn) return;
  
    card.addEventListener('click', e => {
      const target = /** @type {HTMLElement|null} */ (e.target instanceof HTMLElement ? e.target : null);
      if (target?.closest('.wyms-card-insert__btn')) return;
      /** @type {HTMLElement} */ (btn).click();
    });
  });

function wymsReflowRows() {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const isTablet = window.matchMedia('(max-width: 1023px)').matches && !isMobile;

  let itemsPerRow = 3; // desktop
  if (isTablet) itemsPerRow = 2;
  if (isMobile) itemsPerRow = 1;

  const rowsContainer = document.querySelector('.wyms-collection-grid__rows');
  if (!rowsContainer) return;

  const children = Array.from(rowsContainer.children).filter(n => n instanceof HTMLElement);

  let segmentCards = [];
  let segmentDefaultRows = [];

  const flushSegment = () => {
    if (!segmentDefaultRows.length) {
      segmentCards = [];
      segmentDefaultRows = [];
      return;
    }

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

    const anchor = segmentDefaultRows[0];
    if (anchor) {
      rowsContainer.insertBefore(frag, anchor);
    }

    segmentDefaultRows.forEach(r => r.remove());

    segmentCards = [];
    segmentDefaultRows = [];
  };

  for (const node of children) {
    const isDefaultRow = node.classList?.contains('wyms-collection-grid__row--default');
    const isFeatureRow = node.classList?.contains('wyms-collection-grid__row--feature');

    if (isDefaultRow) {
      segmentDefaultRows.push(node);
      segmentCards.push(...Array.from(node.children).filter(n => n instanceof HTMLElement));
      continue;
    }

    if (isFeatureRow) {
      flushSegment();
      continue;
    }
  }

  flushSegment();
}

/** @type {number|null} */
let wymsReflowRaf = null;
function wymsScheduleReflow() {
  if (wymsReflowRaf) cancelAnimationFrame(wymsReflowRaf);
  wymsReflowRaf = requestAnimationFrame(() => {
    wymsReflowRaf = null;
    wymsReflowRows();  });
}

wymsScheduleReflow();
window.addEventListener('resize', wymsScheduleReflow);