class WymsProductNav extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    /** @type {HTMLElement | null} */
    this.navWrapper = /** @type {HTMLElement | null} */ (this.querySelector('.js-product-nav-sticky'));
    /** @type {HTMLElement | null} */
    this.shopifySection = /** @type {HTMLElement | null} */ (this.closest('.shopify-section'));

    /** @type {NodeListOf<HTMLElement>} */
    this.navLinks = /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('.js-product-nav-link'));

    if (!this.navWrapper || !this.shopifySection) return;

    /** @type {number} */
    this._stickStartY = 0;

    this.filterMissingTargets();
    this.initStickyPadding();
    this.initNavLinks();
  }

  disconnectedCallback() {
    this._scrollHandler && window.removeEventListener('scroll', this._scrollHandler);
    this._resizeHandler && window.removeEventListener('resize', this._resizeHandler);
    if (this._stickyInsetHandler) {
      document.removeEventListener('wyms:sticky-top-inset', this._stickyInsetHandler);
      document.removeEventListener('wyms:header-visible', this._stickyInsetHandler);
      document.removeEventListener('wyms:header-hidden', this._stickyInsetHandler);
    }
  }

  getStickyTopInsetPx() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--wyms-sticky-top-inset').trim();
    const num = Number.parseFloat(raw);
    return Number.isFinite(num) ? num : 0;
  }

  recalcStickStartY() {
    if (!this.shopifySection) return;
    const stickyTopInset = this.getStickyTopInsetPx();
    const rect = this.shopifySection.getBoundingClientRect();
    this._stickStartY = window.scrollY + rect.top - stickyTopInset;
  }

  initStickyPadding() {
    if (!this.shopifySection) return;

    this.recalcStickStartY();

    /** @param {boolean} isActive */
    const setActive = (isActive) => {
      this.shopifySection?.classList.toggle('wyms-product-nav--active', isActive);
    };

    let ticking = false;
    this._scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setActive(window.scrollY >= this._stickStartY);
        this.updateScrollSpy();
        ticking = false;
      });
    };

    this._resizeHandler = () => {
      this.recalcStickStartY();
      this._scrollHandler && this._scrollHandler();
    };

    this._stickyInsetHandler = () => {
      this.recalcStickStartY();
      this._scrollHandler && this._scrollHandler();
    };

    window.addEventListener('scroll', this._scrollHandler, { passive: true });
    window.addEventListener('resize', this._resizeHandler, { passive: true });
    document.addEventListener('wyms:sticky-top-inset', this._stickyInsetHandler);
    document.addEventListener('wyms:header-visible', this._stickyInsetHandler);
    document.addEventListener('wyms:header-hidden', this._stickyInsetHandler);
    requestAnimationFrame(() => {
      this.recalcStickStartY();
      setActive(window.scrollY >= this._stickStartY);
      this.updateScrollSpy();
    });
  }

  filterMissingTargets() {
    this.navLinks.forEach((link) => {
      const targetId = link.getAttribute('data-target-id');
      if (targetId && document.getElementById(targetId)) {
        link.style.display = '';
        link.style.opacity = '0';
        requestAnimationFrame(() => {
          link.style.transition = 'opacity 0.2s ease';
          link.style.opacity = '1';
        });
      }
    });
  }

  /** Pixels to clear above target: sticky top inset + nav bar + gap. */
  getAnchorScrollOffsetPx() {
    if (!this.navWrapper) return this.getStickyTopInsetPx() + 20;
    const topInset = this.getStickyTopInsetPx();
    const navHeight = this.navWrapper.offsetHeight;
    return topInset + navHeight + 20;
  }

  initNavLinks() {
    this.navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target-id');
        if (!targetId) return;
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        const offset = this.getAnchorScrollOffsetPx();
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: Math.max(0, targetPos), behavior: 'smooth' });
      });
    });
  }

  updateScrollSpy() {
    const threshold = this.getAnchorScrollOffsetPx() + 10;

    /** @type {string | null} */
    let activeId = null;
    this.navLinks.forEach((link) => {
      const id = link.getAttribute('data-target-id');
      if (!id) return;
      const targetEl = document.getElementById(id);
      if (!targetEl) return;
      if (targetEl.getBoundingClientRect().top <= threshold) {
        activeId = id;
      }
    });

    this.navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('data-target-id') === activeId);
    });
  }
}

if (!customElements.get('wyms-product-nav')) {
  customElements.define('wyms-product-nav', WymsProductNav);
}
