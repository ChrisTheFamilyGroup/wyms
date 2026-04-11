/**
 * @class WymsCartDrawerItems
 * Standalone cart drawer items — no Dawn CartItems dependency.
 */
class WymsCartDrawerItems extends HTMLElement {
    connectedCallback() {
      this.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('cart-remove-button');
        if (removeBtn) {
          const index = removeBtn.dataset.index;
          this.updateQuantity(index, 0);
          return;
        }
  
        const qtyBtn = e.target.closest('.quantity__button');
        if (qtyBtn) {
          const selector = qtyBtn.closest('quantity-input');
          const input = selector?.querySelector('.quantity__input');
          if (!input) return;
          const index = input.dataset.index;
          const currentVal = parseInt(input.value, 10) || 0;
          const newVal = qtyBtn.name === 'plus' ? currentVal + 1 : Math.max(0, currentVal - 1);
          input.value = newVal;
          this.updateQuantity(index, newVal);
        }
      });
    }
  
    updateQuantity(index, quantity) {
      this.setDisabled(true);
  
      const body = JSON.stringify({
        line: index,
        quantity,
        sections: ['wyms-cart-drawer'],
        sections_url: window.location.pathname,
      });
  
      fetch(window.routes?.cart_change_url || '/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body,
      })
        .then((r) => r.json())
        .then((data) => {
          window.wymsCart?.updateCartCount(data.item_count);
  
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
  
    setDisabled(val) {
      this.classList.toggle('cart__items--disabled', val);
    }
  }
  
  if (!customElements.get('cart-drawer-items')) {
    customElements.define('cart-drawer-items', WymsCartDrawerItems);
  }
  
  /**
   * @class WymsCartDrawerController
   */
  class WymsCartDrawerController {
    constructor() {
      this.drawer = document.getElementById('CartDrawer');
      this.overlay = document.getElementById('WymsOverlay');
  
      if (!this.drawer) return;
  
      this.isOpen = false;
      this.bindEvents();
    }
  
    bindEvents() {
      document.querySelectorAll('.cart-drawer-trigger').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        });
      });
  
      this.overlay?.addEventListener('click', () => {
        if (this.isOpen) this.close();
      });
  
      this.drawer.addEventListener('click', (e) => {
        if (e.target.closest('.js-cart-close')) this.close();
      });
  
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });
  
      document.addEventListener('cart:open', () => this.open());
      document.addEventListener('wyms:close-cart', () => this.close());
    }
  
    open() {
      document.dispatchEvent(new CustomEvent('wyms:close-mobile-menu'));
      this.isOpen = true;
      this.drawer.classList.add('active');
      document.body.classList.add('cart-drawer-open');
    }
  
    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.drawer.classList.remove('active');
      document.body.classList.remove('cart-drawer-open');
    }
  
    refreshFromSection() {
      const cartUrl = window.routes?.cart_url || '/cart';
      return fetch(`${cartUrl}?section_id=wyms-cart-drawer`, { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error('Section fetch failed'))))
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const source = doc.querySelector('.cart-drawer-main-and-footer');
          const target = this.drawer.querySelector('.cart-drawer-main-and-footer');
          if (source && target) target.innerHTML = source.innerHTML;
        })
        .catch((e) => console.error('[WymsCart] refreshFromSection error:', e));
    }
  
    refreshAndOpen() {
      return this.refreshFromSection().then(() => this.open());
    }
  
    updateCartCount(count) {
      const n = Math.max(0, Number(count) || 0);
      document.querySelectorAll('.js-cart-count').forEach((el) => {
        el.textContent = String(n);
        el.classList.toggle('is-hidden', n === 0);
      });
    }
  }
  
  window.wymsCart = new WymsCartDrawerController();
  
  // Handle add-to-cart forms (non-PDP)
  document.querySelectorAll('form[action="/cart/add"]').forEach((form) => {
    if (form.classList.contains('js-product-form')) return;
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.submitter || form.querySelector('[type="submit"]');
      if (!btn || btn.disabled) return;
  
      btn.disabled = true;
      const spinner = btn.querySelector('.loading__spinner');
      if (spinner) spinner.classList.remove('hidden');
  
      const restoreBtn = () => {
        btn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
      };
  
      try {
        const res = await fetch(window.routes?.cart_add_url || '/cart/add.js', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
  
        if (!res.ok) {
          let err;
          try { err = await res.json(); } catch (_) {}
          alert(err?.description || err?.message || 'This product is currently unavailable.');
          restoreBtn();
          return;
        }
  
        try {
          const cartRes = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
          const cart = await cartRes.json();
          window.wymsCart.updateCartCount(cart.item_count);
        } catch (err) {
          console.error(err);
        }
  
        await window.wymsCart.refreshAndOpen();
      } finally {
        restoreBtn();
      }
    });
  });