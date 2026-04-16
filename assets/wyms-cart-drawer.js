class WymsCartDrawerItems extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', (e) => {
      // Fix TS errors: check if target is a DOM Element
      if (!(e.target instanceof Element)) return;

      const removeBtn = e.target.closest('cart-remove-button');
      if (removeBtn) {
        const idx = /** @type {HTMLElement} */ (removeBtn).dataset.index;
        this.updateQuantity(idx, 0);
        return;
      }

      const qtyBtn = e.target.closest('.quantity__button');
      if (qtyBtn) {
        const input = /** @type {HTMLInputElement|null} */ (
          qtyBtn.closest('quantity-input')?.querySelector('.quantity__input')
        );
        if (!input) return;

        const index = input.dataset.index;
        if (!index) return;
        const current = parseInt(input.value, 10) || 0;
        
        // Inventory checks
        const isShopifyMng = input.dataset.inventoryManagement === 'shopify';
        const isDenyPolicy = input.dataset.inventoryPolicy === 'deny';
        const inventoryQty = parseInt(input.dataset.inventoryQty || 'NaN', 10);

        let newVal;

        if ((/** @type {HTMLButtonElement} */ (qtyBtn)).name === 'plus') {
          // Block if we exceed inventory (and policy doesn't allow overselling)
          if (isShopifyMng && isDenyPolicy && !isNaN(inventoryQty) && current >= inventoryQty) {
            this.showError('Maximum available quantity reached.');
            return;
          }
          newVal = current + 1;
        } else {
          newVal = Math.max(0, current - 1);
        }

        input.value = String(newVal);
        this.updateQuantity(index, newVal);
      }
    });
  }

  /**
   * @param {string} message
   */
  showError(message) {
    const errEl = document.getElementById('CartDrawer-CartErrors');
    if (!errEl) return;
    errEl.textContent = message;
    setTimeout(() => { errEl.textContent = ''; }, 3000);
  }

  /**
   * @param {string|number|undefined} index
   * @param {number} quantity
   */
  updateQuantity(index, quantity) {
    this.setDisabled(true);

    const w = /** @type {any} */ (window);
    fetch(w.routes?.cart_change_url || '/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        line: index,
        quantity,
        sections: ['wyms-cart-drawer'],
        sections_url: window.location.pathname,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const w2 = /** @type {any} */ (window);
        if (w2.wymsCart) w2.wymsCart.updateCartCount(data.item_count);

        if (data.sections?.['wyms-cart-drawer']) {
          const html = new DOMParser().parseFromString(
            data.sections['wyms-cart-drawer'],
            'text/html'
          );
          const source = html.querySelector('.cart-drawer-main-and-footer');
          const target = this.querySelector('.cart-drawer-main-and-footer');
          if (source && target) target.innerHTML = source.innerHTML;
        }
      })
      .catch((e) => console.error('[WymsCart] updateQuantity error:', e))
      .finally(() => this.setDisabled(false));
  }

  /**
   * @param {boolean} val
   */
  setDisabled(val) {
    this.classList.toggle('cart__items--disabled', val);
  }
}

if (!customElements.get('cart-drawer-items')) {
  customElements.define('cart-drawer-items', WymsCartDrawerItems);
}

class WymsCartDrawerController {
  constructor() {
    /** @type {HTMLElement|null} */
    this.drawer = document.getElementById('CartDrawer');
    /** @type {HTMLElement|null} */
    this.overlay = document.getElementById('WymsOverlay'); // Must exist in theme.liquid
    /** @type {boolean} */
    this.isOpen = false;

    if (!this.drawer) return;

    this.bindEvents();
  }

  bindEvents() {
    document.querySelectorAll('.cart-drawer-trigger').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
      });
    });

    this.overlay?.addEventListener('click', () => {
      if (this.isOpen) this.close();
    });

    this.drawer?.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('.js-cart-close')) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    document.addEventListener('cart:open', () => this.open());
    document.addEventListener('cart:refresh', () => this.refreshFromSection());
    document.addEventListener('wyms:close-cart', () => this.close());
  }

  open() {
    if (!this.drawer) return;
    document.dispatchEvent(new CustomEvent('wyms:close-mobile-menu'));
    this.isOpen = true;
    this.drawer.classList.add('active');
    document.body.classList.add('cart-drawer-open');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.overlay?.setAttribute('aria-hidden', 'false');
  }

  close() {
    if (!this.drawer) return;
    if (!this.isOpen) return;
    this.isOpen = false;
    this.drawer.classList.remove('active');
    document.body.classList.remove('cart-drawer-open');
    this.drawer.setAttribute('aria-hidden', 'true');
    this.overlay?.setAttribute('aria-hidden', 'true');
  }

  refreshFromSection() {
    const drawer = this.drawer;
    if (!drawer) return Promise.resolve();
    // Section Rendering API endpoint (works from any page)
    return fetch(`/?section_id=wyms-cart-drawer`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('Section fetch failed'))))
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const source = doc.querySelector('.cart-drawer-main-and-footer');
        const target = drawer.querySelector('.cart-drawer-main-and-footer');
        if (source && target) target.innerHTML = source.innerHTML;
      })
      .then(async () => {
        try {
          const cartRes = await fetch('/cart.js', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
          const cart = await cartRes.json();
          this.updateCartCount(cart?.item_count);
        } catch (e) {
          console.error('[WymsCart] cart.js refresh error:', e);
        }
      })
      .catch((e) => console.error('[WymsCart] refreshFromSection error:', e));
  }

  refreshAndOpen() {
    return this.refreshFromSection().then(() => this.open());
  }

  /**
   * @param {number|string} count
   */
  updateCartCount(count) {
    const n = Math.max(0, Number(count) || 0);
    document.querySelectorAll('.js-cart-count').forEach((el) => {
      el.textContent = String(n);
      el.classList.toggle('is-hidden', n === 0);
    });
  }
}

/** @type {any} */ (window).wymsCart = new WymsCartDrawerController();

document.querySelectorAll('form[action="/cart/add"]').forEach((form) => {
  if (form.classList.contains('js-product-form')) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // TS fix
    const targetForm = e.target;
    if (!(targetForm instanceof HTMLFormElement)) return;
    
    // @ts-ignore (submitter exists on event in modern browsers)
    const btn = e.submitter || targetForm.querySelector('[type="submit"]');
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    const spinner = btn.querySelector('.loading__spinner');
    if (spinner) spinner.classList.remove('hidden');

    const restoreBtn = () => {
      btn.disabled = false;
      if (spinner) spinner.classList.add('hidden');
    };

    try {
      const w = /** @type {any} */ (window);
      const res = await fetch(w.routes?.cart_add_url || '/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(targetForm),
      });

      if (!res.ok) {
        let err;
        try { err = await res.json(); } catch (_) {}
        const msg = err?.description || err?.message || 'This product is currently unavailable.';
        const errEl = document.getElementById('CartDrawer-CartErrors');
        if (errEl) {
          errEl.textContent = msg;
          setTimeout(() => { errEl.textContent = ''; }, 4000);
        } else {
          alert(msg);
        }
        restoreBtn();
        return;
      }

      try {
        const cartRes = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
        const cart = await cartRes.json();
        const w3 = /** @type {any} */ (window);
        w3.wymsCart?.updateCartCount(cart.item_count);
      } catch (err) {
        console.error('[WymsCart] cart.js fetch error:', err);
      }

      const w4 = /** @type {any} */ (window);
      await w4.wymsCart?.refreshAndOpen?.();
    } finally {
      restoreBtn();
    }
  });
});