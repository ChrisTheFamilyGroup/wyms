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

    if (!this.navWrapper) return;

    this.filterMissingTargets();
    this.makeSectionSticky();
    this.initStickyPadding();
    this.initNavLinks();
    this.initScrollSpy();
  }

  disconnectedCallback() {
    this._scrollHandler && window.removeEventListener('scroll', this._scrollHandler);
  }

  makeSectionSticky() {
    if (!this.shopifySection) return;
    this.shopifySection.style.position = 'sticky';
    this.shopifySection.style.top = 'var(--wyms-sticky-top, 0px)';
    this.shopifySection.style.zIndex = '99';
    this.shopifySection.style.background = '#fff';
  }

  initStickyPadding() {
    if (!this.shopifySection) return;

    const SCROLL_THRESHOLD = 6;
    let lastScrollY = window.scrollY;
    let ticking = false;

    // When window.scrollY >= stickStartY, the section is in its sticky state.
    const stickyTop = this.getStickyTop();
    const rect = this.shopifySection.getBoundingClientRect();
    const stickStartY = window.scrollY + rect.top - stickyTop;

    /** @param {string} padPx */
    const apply = (padPx) => {
      this.shopifySection?.style.setProperty('--wyms-product-nav-pad-top', padPx);
    };

    const clear = () => {
      this.shopifySection?.style.removeProperty('--wyms-product-nav-pad-top');
    };

    /** @param {boolean} isActive */
    const setActive = (isActive) => {
      this.shopifySection?.classList.toggle('wyms-product-nav--active', isActive);
    };

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY;

      const isStickyNow = y >= stickStartY;
      setActive(isStickyNow);
      if (!isStickyNow) {
        // Not sticky -> don't control padding (leave whatever the normal CSS says).
        clear();
        lastScrollY = y;
        ticking = false;
        return;
      }

      // Sticky -> change padding only based on scroll direction.
      if (delta < -SCROLL_THRESHOLD) {
        apply('100px');
      } else if (delta > SCROLL_THRESHOLD) {
        apply('16px');
      }

      lastScrollY = y;
      ticking = false;
    };

    this._scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', this._scrollHandler, { passive: true });

    // Initialize immediately.
    update();
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

  getStickyTop() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--wyms-sticky-top').trim();
    const num = Number.parseFloat(raw);
    return Number.isFinite(num) ? num : 0;
  }

  initNavLinks() {
    this.navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target-id');
        if (!targetId) return;
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        const stickyTop = this.getStickyTop();
        const navHeight = this.navWrapper ? this.navWrapper.offsetHeight : 0;
        const offset = stickyTop + navHeight + 20;
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      });
    });
  }

  initScrollSpy() {
    window.addEventListener('scroll', () => {
      const stickyTop = this.getStickyTop();
      const navHeight = this.navWrapper ? this.navWrapper.offsetHeight : 0;
      const threshold = stickyTop + navHeight + 30;

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
        link.classList.toggle(
          'is-active',
          link.getAttribute('data-target-id') === activeId
        );
      });
    }, { passive: true });
  }
}

if (!customElements.get('wyms-product-nav')) {
  customElements.define('wyms-product-nav', WymsProductNav);
}