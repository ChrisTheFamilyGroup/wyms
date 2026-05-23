class WymsProductNav extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    /** @type {HTMLElement | null} */
    this.navWrapper = /** @type {HTMLElement | null} */ (this.querySelector('.js-product-nav-sticky'));

    /** @type {NodeListOf<HTMLElement>} */
    this.navLinks = /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('.js-product-nav-link'));

    if (!this.navWrapper) return;

    this.filterMissingTargets();
    this.initNavChromeVar();
    this.initScrollSpy();
    this.initNavLinks();
  }

  disconnectedCallback() {
    this._scrollHandler && window.removeEventListener('scroll', this._scrollHandler);
    this._chromeRo?.disconnect?.();
    if (this._chromePublishHandler) {
      ['wyms:sticky-top-inset', 'wyms:header-visible', 'wyms:header-hidden'].forEach((ev) => {
        document.removeEventListener(ev, this._chromePublishHandler);
      });
      window.removeEventListener('resize', this._chromePublishHandler);
      window.removeEventListener('load', this._chromePublishHandler);
    }
  }

  getStickyTopInsetPx() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--wyms-sticky-top-inset').trim();
    const num = Number.parseFloat(raw);
    return Number.isFinite(num) ? num : 0;
  }

  getNavChromePx() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--wyms-product-nav-chrome').trim();
    const num = Number.parseFloat(raw);
    if (Number.isFinite(num) && num > 0) return num;
    return this.navWrapper ? this.navWrapper.offsetHeight : 0;
  }

  /**
   * Publish measured nav bar height for anchor scroll offsets (mirrors wyms-sticky-btns-section).
   */
  initNavChromeVar() {
    if (!this.navWrapper) return;

    const root = document.documentElement;

    const publish = () => {
      const height = Math.ceil(this.navWrapper.getBoundingClientRect().height);
      const next = `${Math.max(height, 1)}px`;
      if (root.style.getPropertyValue('--wyms-product-nav-chrome').trim() !== next) {
        root.style.setProperty('--wyms-product-nav-chrome', next);
      }
    };

    if (window.ResizeObserver) {
      this._chromeRo = new ResizeObserver(() => requestAnimationFrame(publish));
      this._chromeRo.observe(this.navWrapper);
    }

    this._chromePublishHandler = () => requestAnimationFrame(publish);
    ['wyms:sticky-top-inset', 'wyms:header-visible', 'wyms:header-hidden'].forEach((ev) => {
      document.addEventListener(ev, this._chromePublishHandler);
    });
    window.addEventListener('resize', this._chromePublishHandler, { passive: true });
    window.addEventListener('load', this._chromePublishHandler, { passive: true });
    if (document.fonts?.ready) {
      document.fonts.ready.then(this._chromePublishHandler).catch(() => {});
    }
    requestAnimationFrame(publish);
  }

  initScrollSpy() {
    let ticking = false;
    this._scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        this.updateScrollSpy();
        ticking = false;
      });
    };

    window.addEventListener('scroll', this._scrollHandler, { passive: true });
    requestAnimationFrame(() => this.updateScrollSpy());
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
    return this.getStickyTopInsetPx() + this.getNavChromePx() + 20;
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
