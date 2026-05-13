class WymsCartDrawerItems extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', (e) => {
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

        const isShopifyMng = input.dataset.inventoryManagement === 'shopify';
        const isDenyPolicy = input.dataset.inventoryPolicy === 'deny';
        const inventoryQty = parseInt(input.dataset.inventoryQty || 'NaN', 10);

        let newVal;
        if (/** @type {HTMLButtonElement} */ (qtyBtn).name === 'plus') {
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

  /** @param {string} message */
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
          if (source && target) {
            target.innerHTML = source.innerHTML;
            /** @type {any} */ (window).wymsCart?.initUpsell();
          }
        }
      })
      .catch((e) => console.error('[WymsCart] updateQuantity error:', e))
      .finally(() => this.setDisabled(false));
  }

  /** @param {boolean} val */
  setDisabled(val) {
    this.classList.toggle('cart__items--disabled', val);
  }
}

if (!customElements.get('cart-drawer-items')) {
  customElements.define('cart-drawer-items', WymsCartDrawerItems);
}

// ─────────────────────────────────────────────────────────────────────────────

class WymsCartDrawerController {
  constructor() {
    /** @type {HTMLElement|null} */
    this.drawer = document.getElementById('CartDrawer');
    /** @type {HTMLElement|null} */
    this.overlay = document.getElementById('WymsOverlay');
    /** @type {boolean} */
    this.isOpen = false;
    /** @type {AbortController|null} */
    this._upsellAbort = null;

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

    document.addEventListener('cart:open',       () => this.open());
    document.addEventListener('cart:refresh',    () => this.refreshFromSection());
    document.addEventListener('wyms:close-cart', () => this.close());
  }

  /**
   * @param {boolean} [skipRefresh=false]
   */
  open(skipRefresh = false) {
    if (!this.drawer) return;
    document.dispatchEvent(new CustomEvent('wyms:close-mobile-menu'));

    this.isOpen = true;
    this.drawer.classList.add('active');
    document.body.classList.add('cart-drawer-open');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.overlay?.setAttribute('aria-hidden', 'false');

    if (!skipRefresh) {
      this.refreshFromSection();
    }
  }

  close() {
    if (!this.drawer || !this.isOpen) return;
    this.isOpen = false;
    this.drawer.classList.remove('active');
    document.body.classList.remove('cart-drawer-open');
    this.drawer.setAttribute('aria-hidden', 'true');
    this.overlay?.setAttribute('aria-hidden', 'true');
  }

  refreshFromSection() {
    const drawer = this.drawer;
    if (!drawer) return Promise.resolve();

    return fetch(`/?section_id=wyms-cart-drawer`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('Section fetch failed'))))
      .then((html) => {
        const doc    = new DOMParser().parseFromString(html, 'text/html');
        const source = doc.querySelector('.cart-drawer-main-and-footer');
        const target = drawer.querySelector('.cart-drawer-main-and-footer');
        if (source && target) target.innerHTML = source.innerHTML;
      })
      .then(async () => {
        this.initUpsell();

        try {
          const cartRes = await fetch('/cart.js', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
          });
          const cart = await cartRes.json();
          this.updateCartCount(cart?.item_count);
        } catch (e) {
          console.error('[WymsCart] cart.js refresh error:', e);
        }
      })
      .catch((e) => console.error('[WymsCart] refreshFromSection error:', e));
  }

  refreshAndOpen() {
    return this.refreshFromSection().then(() => this.open(true));
  }

  // ─── UPSELL SLIDER ────────────────────────────────────────────────────────

  initUpsell() {
    const drawer = this.drawer;
    if (!drawer) return;

    const upsellBlock = /** @type {HTMLElement|null} */ (drawer.querySelector('.js-cart-upsell'));
    if (!upsellBlock) return;

    const track      = /** @type {HTMLElement|null} */ (upsellBlock.querySelector('.js-upsell-track'));
    const items      = upsellBlock.querySelectorAll('.js-upsell-item');
    const pagination = /** @type {HTMLElement|null} */ (upsellBlock.querySelector('.js-upsell-pagination'));

    if (items.length === 0) {
      upsellBlock.style.display = 'none';
      return;
    }
    upsellBlock.style.display = 'flex';

    if (this._upsellAbort) this._upsellAbort.abort();
    this._upsellAbort = new AbortController();
    const { signal } = this._upsellAbort;

    if (pagination) {
      pagination.innerHTML = '';
      const dots = /** @type {HTMLButtonElement[]} */ ([]);

      const setActiveDot = (/** @type {number} */ index) => {
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      };

      items.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type      = 'button';
        dot.className = `upsell-dot${i === 0 ? ' is-active' : ''}`;
        dot.setAttribute('aria-label', `Go to recommendation ${i + 1}`);
        dots.push(dot);
        pagination.appendChild(dot);

        dot.addEventListener('click', () => {
          if (!track) return;
          track.scrollTo({ left: i * track.offsetWidth, behavior: 'smooth' });
        }, { signal });
      });

      if (track) {
        track.addEventListener('scroll', () => {
          const index = Math.round(track.scrollLeft / (track.offsetWidth || 1));
          setActiveDot(index);
        }, { passive: true, signal });
      }
    }

    // ── Drag-to-scroll ─────────────────────────────────────────────
    if (track) {
      let isDown      = false;
      let startX      = 0;
      let scrollStart = 0;

      track.addEventListener('mousedown', (e) => {
        isDown      = true;
        startX      = e.pageX;
        scrollStart = track.scrollLeft;
        track.classList.add('is-dragging');
      }, { signal });

      window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        track.scrollLeft = scrollStart - (e.pageX - startX);
      }, { passive: false, signal });

      const stopDrag = () => {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('is-dragging');
        const index = Math.round(track.scrollLeft / (track.offsetWidth || 1));
        track.scrollTo({ left: index * track.offsetWidth, behavior: 'smooth' });
      };

      window.addEventListener('mouseup',    stopDrag, { signal });
      window.addEventListener('mouseleave', stopDrag, { signal });
    }

    upsellBlock.querySelectorAll('.js-upsell-add').forEach((btn) => {
      const addBtn   = /** @type {HTMLElement} */ (btn);
      const freshBtn = /** @type {HTMLElement} */ (addBtn.cloneNode(true));
      addBtn.replaceWith(freshBtn);

      freshBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!(freshBtn instanceof HTMLElement)) return;

        const variantId = freshBtn.dataset.variantId;
        if (!variantId) {
          console.warn('[WymsCart] initUpsell: missing data-variant-id on .js-upsell-add');
          return;
        }

        freshBtn.style.opacity       = '0.5';
        freshBtn.style.pointerEvents = 'none';

        try {
          const res = await fetch('/cart/add.js', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body:    JSON.stringify({ id: variantId, quantity: 1 }),
          });

          if (!res.ok) {
            let errData;
            try { errData = await res.json(); } catch (_) {}
            const msg =
              errData?.description ||
              errData?.message     ||
              'Could not add this item to your cart.';
            const errEl = document.getElementById('CartDrawer-CartErrors');
            if (errEl) {
              errEl.textContent = msg;
              setTimeout(() => { errEl.textContent = ''; }, 4000);
            } else {
              alert(msg);
            }
            return;
          }

          await this.refreshFromSection();
        } catch (err) {
          console.error('[WymsCart] initUpsell add error:', err);
        } finally {
          if (document.contains(freshBtn)) {
            freshBtn.style.opacity       = '1';
            freshBtn.style.pointerEvents = 'auto';
          }
        }
      }, { signal });
    });

    // ── Color picker ───────────────────────────────────────────────────────
    this.initColorPicker(upsellBlock, signal);
  }

  // ─── COLOR PICKER ─────────────────────────────────────────────────────────

  /**
   * @param {HTMLElement} upsellBlock
   * @param {AbortSignal} signal
   */
  initColorPicker(upsellBlock, signal) {
    const DOTS_INITIAL = 6; 

    /** @type {Record<string, any[]>} */
    const collectionCache = {};

    /**
     * @param {string} handle
     * @returns {Promise<any[]>}
     */
    const fetchCollection = async (handle) => {
      if (collectionCache[handle]) return collectionCache[handle];

      const all = [];
      let page = 1;

      while (true) {
        try {
          const res = await fetch(
            `/collections/${handle}/products.json?limit=50&page=${page}`,
            { credentials: 'same-origin' }
          );
          if (!res.ok) break;
          const data = await res.json();
          const batch = data.products || [];
          all.push(...batch);
          if (batch.length < 50) break;
          page++;
        } catch {
          break;
        }
      }

      collectionCache[handle] = all;
      return all;
    };

    /**
     * @param {any} product 
     * @returns {string}
     */
    const getColorHex = (product) => {
      const hexTag = (product.tags || [])
        .find((/** @type {string} */ t) => t.startsWith('color-hex:'));
      return hexTag ? hexTag.replace('color-hex:', '').trim() : '#D9D9D9';
    };

    /**
     * @param {HTMLElement} item
     * @param {any} product
     * @param {string} colorHex
     */
    const replaceSlide = (item, product, colorHex) => {
      const img = item.querySelector('.cart-upsell__image img');
      if (img instanceof HTMLImageElement && product.images?.[0]) {
        const rawSrc = product.images[0].src.split('?')[0];
        img.src    = rawSrc + '?width=200';
        img.srcset = '';
        img.alt    = product.title;
      }

      
      const nameEl  = item.querySelector('.cart-upsell__name');
      const priceEl = item.querySelector('.cart-upsell__price');
      if (nameEl) nameEl.textContent = product.title;
      if (priceEl && product.variants?.[0]) {
        const price = parseFloat(product.variants[0].price);
        priceEl.textContent = price.toFixed(2).replace('.', ',') + ' €';
      }

      const addBtn = item.querySelector('.js-upsell-add');
      if (addBtn instanceof HTMLElement && product.variants?.[0]) {
        addBtn.dataset.variantId = String(product.variants[0].id);
      }

      const newColor = (product.tags || [])
        .find((/** @type {string} */ t) => t.startsWith('upsell-color:'))
        ?.replace('upsell-color:', '') || '';

      const colorText = item.querySelector('.cart-upsell__color-text');
      if (colorText) colorText.textContent = newColor.replace(/-/g, ' ');

      item.dataset.handle   = product.handle;
      item.dataset.color    = newColor;
      item.dataset.colorHex = colorHex;

      item.querySelectorAll('.cart-upsell__color-dot').forEach((dot) => {
        if (dot instanceof HTMLElement) {
          dot.classList.toggle('is-active', dot.dataset.handle === product.handle);
        }
      });
    };

    /**
     
     * @param {HTMLElement}      item
     * @param {any[]}            siblings   
     * @param {HTMLElement}      colorList
     * @param {HTMLElement|null} showMoreBtn
     * @param {AbortSignal}      signal
     */
    const renderDots = (item, siblings, colorList, showMoreBtn, signal) => {
      const currentHandle   = item.dataset.handle   || '';
      const currentColor    = item.dataset.color    || '';
      const currentColorHex = item.dataset.colorHex || '#D9D9D9';
      const inSiblings = siblings.some((p) => p.handle === currentHandle);

      const allEntries = [
        ...(inSiblings ? [] : [{
          handle:  currentHandle,
          color:   currentColor,
          hex:     currentColorHex,
          product: /** @type {any} */ (null),
          active:  true,
        }]),
        ...siblings.map((p) => ({
          handle:  p.handle,
          color:   (p.tags || [])
            .find((/** @type {string} */ t) => t.startsWith('upsell-color:'))
            ?.replace('upsell-color:', '') || '',
          hex:     getColorHex(p),
          product: p,
          active:  p.handle === currentHandle,
        })),
      ];

      let expanded = false;

      const renderVisible = () => {
        colorList.innerHTML = '';
        const toRender = expanded ? allEntries : allEntries.slice(0, DOTS_INITIAL);

        toRender.forEach((entry) => {
          const dot = document.createElement('button');
          dot.type             = 'button';
          dot.className        = `cart-upsell__color-dot${entry.active ? ' is-active' : ''}`;
          dot.dataset.handle   = entry.handle;
          dot.style.background = entry.hex;
          dot.title            = entry.color.replace(/-/g, ' ');

          dot.addEventListener('click', (e) => {
            e.stopPropagation();
            if (entry.active) return;

            if (entry.product) replaceSlide(item, entry.product, entry.hex);

            allEntries.forEach((en) => { en.active = en.handle === entry.handle; });
            renderVisible();

            const dropdown = /** @type {HTMLElement|null} */ (
              item.querySelector('.js-upsell-dropdown')
            );
            if (dropdown) dropdown.hidden = true;
          }, { signal });

          colorList.appendChild(dot);
        });

        if (showMoreBtn) {
          const hasHidden = allEntries.length > DOTS_INITIAL && !expanded;
          showMoreBtn.hidden = !hasHidden;
        }
      };

      renderVisible();

      if (showMoreBtn) {
        const freshMore = /** @type {HTMLElement} */ (showMoreBtn.cloneNode(true));
        showMoreBtn.replaceWith(freshMore);

        freshMore.addEventListener('click', (e) => {
          e.stopPropagation();
          expanded = true;
          const cl = /** @type {HTMLElement|null} */ (
            item.querySelector('.js-upsell-color-list')
          );
          if (cl) {
            colorList.innerHTML = '';
            allEntries.forEach((entry) => {
              const dot = document.createElement('button');
              dot.type             = 'button';
              dot.className        = `cart-upsell__color-dot${entry.active ? ' is-active' : ''}`;
              dot.dataset.handle   = entry.handle;
              dot.style.background = entry.hex;
              dot.title            = entry.color.replace(/-/g, ' ');

              dot.addEventListener('click', (e) => {
                e.stopPropagation();
                if (entry.active) return;
                if (entry.product) replaceSlide(item, entry.product, entry.hex);
                allEntries.forEach((en) => { en.active = en.handle === entry.handle; });
                cl.querySelectorAll('.cart-upsell__color-dot').forEach((d) => {
                  if (d instanceof HTMLElement) {
                    d.classList.toggle('is-active', d.dataset.handle === entry.handle);
                  }
                });
                const dropdown = /** @type {HTMLElement|null} */ (
                  item.querySelector('.js-upsell-dropdown')
                );
                if (dropdown) dropdown.hidden = true;
              }, { signal });

              cl.appendChild(dot);
            });
          }
          freshMore.hidden = true;
        }, { signal });
      }
    };

    upsellBlock.querySelectorAll('.js-upsell-item').forEach((itemEl) => {
      const item      = /** @type {HTMLElement} */ (itemEl);
      const colorBtn  = item.querySelector('.js-upsell-color-btn');
      const dropdown  = /** @type {HTMLElement|null} */ (item.querySelector('.js-upsell-dropdown'));
      const colorList = /** @type {HTMLElement|null} */ (item.querySelector('.js-upsell-color-list'));
      const showMore  = /** @type {HTMLElement|null} */ (item.querySelector('.js-upsell-show-more'));
      const seeAll    = /** @type {HTMLAnchorElement|null} */ (item.querySelector('.js-upsell-see-all'));

      if (!colorBtn || !dropdown || !colorList) return;

      /** @type {any[]|null} */
      let cachedSiblings = null;

      colorBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const isOpen = !dropdown.hidden;

        upsellBlock.querySelectorAll('.js-upsell-dropdown').forEach((d) => {
          if (d instanceof HTMLElement && d !== dropdown) d.hidden = true;
        });

        if (isOpen) {
          dropdown.hidden = true;
          return;
        }

        dropdown.hidden = false;

        

        if (cachedSiblings === null) {
          const collectionHandle = item.dataset.collection || '';
          const currentGroup     = item.dataset.group      || '';
          const currentHandle    = item.dataset.handle     || '';

          colorList.innerHTML = '<span class="cart-upsell__loading">···</span>';
          if (showMore) showMore.hidden = true;

          const products = await fetchCollection(collectionHandle);

          
          cachedSiblings = products.filter((p) => {
            const tags = /** @type {string[]} */ (p.tags || []);
            return tags.includes(`upsell-group:${currentGroup}`);
          });

          if (seeAll && item.dataset.collectionUrl) {
            seeAll.href = item.dataset.collectionUrl;
          }
        }

      
        renderDots(item, cachedSiblings, colorList, showMore || null, signal);

      }, { signal });
    });

    document.addEventListener('click', () => {
      upsellBlock.querySelectorAll('.js-upsell-dropdown').forEach((d) => {
        if (d instanceof HTMLElement) d.hidden = true;
      });
    }, { signal });
  }

  // ─── CART COUNT ───────────────────────────────────────────────────────────

  /** @param {number|string} count */
  updateCartCount(count) {
    const n = Math.max(0, Number(count) || 0);
    document.querySelectorAll('.js-cart-count').forEach((el) => {
      el.textContent = String(n);
      el.classList.toggle('is-hidden', n === 0);
    });
  }
}

/** @type {any} */ (window).wymsCart = new WymsCartDrawerController();

// ── Global add-to-cart form interception ──────────────────────────────────────
document.querySelectorAll('form[action="/cart/add"]').forEach((form) => {
  if (form.classList.contains('js-product-form')) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const targetForm = e.target;
    if (!(targetForm instanceof HTMLFormElement)) return;

    // @ts-ignore
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
      const w   = /** @type {any} */ (window);
      const res = await fetch(w.routes?.cart_add_url || '/cart/add.js', {
        method:  'POST',
        headers: { Accept: 'application/json' },
        body:    new FormData(targetForm),
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
        const cart    = await cartRes.json();
        /** @type {any} */ (window).wymsCart?.updateCartCount(cart.item_count);
      } catch (err) {
        console.error('[WymsCart] cart.js fetch error:', err);
      }

      await /** @type {any} */ (window).wymsCart?.refreshAndOpen?.();
    } finally {
      restoreBtn();
    }
  });
});