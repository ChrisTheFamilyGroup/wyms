/**
 * section-main-product.js
 * Handles: gallery navigation, pagination, sticky ATC, Ajax ATC, USP drawer
 */

class MainProduct {
    constructor() {
      this.container = document.querySelector('.js-product-section');
      if (!this.container) return;
  
      this.form            = this.container.querySelector('.js-product-form');
      this.errorEl         = this.container.querySelector('.js-atc-errors');
      this.stickyErrorEl   = this.container.querySelector('.js-sticky-atc-errors');
      this._errorTimer     = null;
  
      this.init();
    }
  
    /* ------------------------------------------------------------------
       Error display
    ------------------------------------------------------------------ */
    showError(msg) {
      [this.errorEl, this.stickyErrorEl].forEach((el) => {
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
      });
      clearTimeout(this._errorTimer);
      this._errorTimer = setTimeout(() => {
        [this.errorEl, this.stickyErrorEl].forEach((el) => {
          if (el) el.style.display = 'none';
        });
      }, 5000);
    }
  
    /* ------------------------------------------------------------------
       Inventory check
    ------------------------------------------------------------------ */
    canAddUnit(qtyInCart, inventoryQty, policy, management) {
      if (management !== 'shopify') return true;
      if (policy === 'continue') return true;
      const max = parseInt(inventoryQty, 10);
      return isNaN(max) ? true : qtyInCart + 1 <= max;
    }
  
    /* ------------------------------------------------------------------
       Gallery
    ------------------------------------------------------------------ */
    initGallery() {
      const track = this.container.querySelector('.js-media-track');
      const dots  = this.container.querySelectorAll('.js-pagination .pagination-dot');
      if (!track) return;
  
      const getStep = () => window.innerWidth >= 990 ? track.offsetWidth / 2 : track.offsetWidth;
  
      const updateDots = () => {
        const step  = getStep();
        const index = Math.round(track.scrollLeft / (step || 1));
        dots.forEach((dot, i) => {
          dot.classList.toggle('is-active', i === index);
          dot.setAttribute('aria-selected', String(i === index));
        });
      };
  
      track.addEventListener('scroll', updateDots, { passive: true });
  
      // Arrow navigation
      this.container.querySelector('.js-prev')?.addEventListener('click', () => {
        track.scrollBy({ left: -getStep(), behavior: 'smooth' });
      });
      this.container.querySelector('.js-next')?.addEventListener('click', () => {
        track.scrollBy({ left: getStep(), behavior: 'smooth' });
      });
  
      // Dot click navigation
      dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
          track.scrollTo({ left: getStep() * i, behavior: 'smooth' });
        });
      });
    }
  
    /* ------------------------------------------------------------------
       Sibling / variant navigation
    ------------------------------------------------------------------ */
    initVariants() {
      this.container.addEventListener('click', (e) => {
        const swatch = e.target.closest('.swatch-item');
        if (!swatch) return;
        e.preventDefault();
        const url = swatch.getAttribute('href');
        if (url) {
          this.container.style.opacity = '0.5';
          window.location.href = url;
        }
      });
    }
  
    /* ------------------------------------------------------------------
       Sticky ATC
    ------------------------------------------------------------------ */
    initStickyATC() {
      const mainBtn   = this.container.querySelector('.js-atc-button');
      const stickyBar = this.container.querySelector('.js-sticky-atc');
      const stickyBtn = this.container.querySelector('.js-sticky-submit');
      if (!mainBtn || !stickyBar) return;
  
      // Show/hide sticky bar based on main button visibility
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const belowFold = !entry.isIntersecting && window.scrollY > entry.boundingClientRect.top + window.scrollY;
          stickyBar.classList.toggle('sticky-atc--active', belowFold);
          stickyBar.setAttribute('aria-hidden', String(!belowFold));
        });
      }, { threshold: 0 });
      observer.observe(mainBtn);
  
      // Clone sticky button to avoid duplicate event listeners
      if (stickyBtn) {
        const clone = stickyBtn.cloneNode(true);
        stickyBtn.parentNode.replaceChild(clone, stickyBtn);
        clone.addEventListener('click', () => {
          this.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        });
      }
    }
  
    /* ------------------------------------------------------------------
       Ajax ATC
    ------------------------------------------------------------------ */
    async handleAdd(e) {
      e.preventDefault();
      if (!this.form) return;
  
      const mainBtn   = this.form.querySelector('.js-atc-button');
      const stickyBtn = this.container.querySelector('.js-sticky-submit');
  
      if (mainBtn?.disabled) return;
  
      const setLoading = (on) => {
        [mainBtn, stickyBtn].forEach((btn) => {
          if (!btn) return;
          btn.classList.toggle('is-loading', on);
          btn.disabled = on;
        });
      };
  
      const formData  = new FormData(this.form);
      const variantId = formData.get('id');
      setLoading(true);
  
      try {
        // Check existing cart quantity
        const cartRes = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`, {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });
        const cart     = await cartRes.json();
        const line     = cart.items.find((item) => String(item.variant_id) === String(variantId));
        const qtyInCart = line ? line.quantity : 0;
  
        if (!this.canAddUnit(
          qtyInCart,
          mainBtn?.dataset.inventory,
          mainBtn?.dataset.policy,
          mainBtn?.dataset.management,
        )) {
          this.showError("This is all the stock we have available for this product.");
          return;
        }
  
        // Add to cart
        const addRes = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'same-origin',
        });
  
        if (!addRes.ok) {
          const result = await addRes.json();
          this.showError(result.description || 'Error adding to cart.');
          return;
        }
  
        // Open cart drawer (theme-agnostic: try common patterns)
        if (window.wymsCart && typeof window.wymsCart.refreshAndOpen === 'function') {
          // Оновлюємо іконку кошика в хедері
          const newCartRes = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`);
          const newCart = await newCartRes.json();
          window.wymsCart.updateCartCount(newCart.item_count);
          
          // Оновлюємо вміст і відкриваємо
          await window.wymsCart.refreshAndOpen();
        } else {
          document.dispatchEvent(new CustomEvent('cart:open'));
          document.dispatchEvent(new CustomEvent('cart:refresh'));
        }
      } catch (err) {
        console.error(err);
        this.showError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  
    initAjaxATC() {
      this.form?.addEventListener('submit', (e) => this.handleAdd(e));
    }
  
    /* ------------------------------------------------------------------
       Init
    ------------------------------------------------------------------ */
    init() {
      this.initGallery();
      this.initVariants();
      this.initStickyATC();
      this.initAjaxATC();
    }
  }
  
  /* --------------------------------------------------------------------------
     USP Drawer
     Separate class — completely independent from product logic.
     
     FIX for overlay not appearing:
     The overlay MUST be a direct child of <body> or at minimum outside of any
     element that has transform, filter, or will-change applied — those CSS
     properties create a new stacking context which clips fixed-position children.
     In Shopify themes this often happens because section wrappers get
     transform: translateZ(0) or will-change: transform for animation.
     The overlay is rendered as a sibling to .usp-drawer inside the section,
     but because both are position:fixed they escape the section's stacking
     context — UNLESS the section itself has transform/filter/will-change.
     
     If the overlay still doesn't appear: add this to your theme.liquid just
     before </body>:
       <div id="usp-overlay-portal" class="usp-drawer-overlay js-usp-overlay"></div>
       <div id="usp-drawer-portal" class="usp-drawer js-usp-drawer">...</div>
     and remove them from the section liquid. The JS below handles both cases.
  -------------------------------------------------------------------------- */
  class USPDrawer {
    constructor() {
      // Support both in-section and portal (body-level) placement
      this.overlay   = document.querySelector('.js-usp-overlay');
      this.drawer    = document.querySelector('.js-usp-drawer');
      this.titleEl   = document.querySelector('.js-usp-title');
      this.descEl    = document.querySelector('.js-usp-desc');
      this.iconEl    = document.querySelector('.js-usp-icon');
      this.imageEl   = document.querySelector('.js-usp-image');
  
      if (!this.drawer) return;
      this.isOpen = false;
      this._init();
    }
  
    open(data) {
      if (this.titleEl)  this.titleEl.textContent  = data.title || '';
      if (this.descEl)   this.descEl.innerHTML      = data.description || '';
  
      if (this.iconEl) {
        if (data.icon) {
          this.iconEl.src          = data.icon;
          this.iconEl.style.display = 'block';
        } else {
          this.iconEl.style.display = 'none';
        }
      }
  
      if (this.imageEl && data.imgUrl) {
        this.imageEl.innerHTML = `<img src="${data.imgUrl}" alt="" loading="lazy">`;
      }
  
      this.isOpen = true;
      this.drawer.classList.add('is-active');
      this.drawer.setAttribute('aria-hidden', 'false');
      this.overlay?.classList.add('is-active');
      this.overlay?.setAttribute('aria-hidden', 'false');
      document.body.classList.add('usp-drawer-open');
      document.body.style.overflow = 'hidden';
    }
  
    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.drawer.classList.remove('is-active');
      this.drawer.setAttribute('aria-hidden', 'true');
      this.overlay?.classList.remove('is-active');
      this.overlay?.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('usp-drawer-open');
      document.body.style.overflow = '';
    }
  
    _init() {
      // Open on trigger click
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.js-usp-trigger');
        if (trigger) {
          e.preventDefault();
          this.open({
            title:       trigger.dataset.uspTitle,
            description: trigger.dataset.uspDescription,
            icon:        trigger.dataset.uspIcon,
            imgUrl:      trigger.dataset.uspImage,
          });
          return;
        }
  
        // Close on close button or overlay click
        if (e.target.closest('.js-usp-close') || e.target === this.overlay) {
          this.close();
        }
      });
  
      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    new MainProduct();
    new USPDrawer();
  });
  