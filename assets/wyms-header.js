/** Synced with sticky nav / CTA CSS (e.g. wyms-sticky-btns-section). */
const WYMS_BODY_HEADER_HIDDEN_CLASS = 'wyms-header-is-hidden';

class WymsHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    /** @type {HTMLElement | null} */
    this.headerOuter = /** @type {HTMLElement | null} */ (this.querySelector('.header-outer-container'));
    /** @type {HTMLElement | null} */
    this.mobilePanel = /** @type {HTMLElement | null} */ (this.querySelector('#MobileNav'));
    /** @type {HTMLElement | null} */
    this.openBtn = /** @type {HTMLElement | null} */ (this.querySelector('.js-mobile-open'));
    /** @type {HTMLElement | null} */
    this.closeBtn = /** @type {HTMLElement | null} */ (this.querySelector('.js-mobile-close'));
    /** @type {HTMLElement | null} */
    this.mainList = /** @type {HTMLElement | null} */ (this.mobilePanel?.querySelector('#MobileMainList') || null);
    /** @type {NodeListOf<HTMLElement>} */
    this.submenuPages = /** @type {NodeListOf<HTMLElement>} */ (this.mobilePanel?.querySelectorAll('.submenu-page') || []);
    this.isMobileMenuOpen = false;

    if (this.mobilePanel && this.mobilePanel.parentElement !== document.body) {
      document.body.appendChild(this.mobilePanel);
    }

    this.initDesktopNav();
    this.initMobileNav();
    this.initHeaderCssVars();
    this.initScrollHide();
  }

  disconnectedCallback() {
    this._ro?.disconnect?.();
    if (this._roResizeRaf) {
      cancelAnimationFrame(this._roResizeRaf);
      this._roResizeRaf = 0;
    }
    this._scrollHandler && window.removeEventListener('scroll', this._scrollHandler);
    document.body.classList.remove(WYMS_BODY_HEADER_HIDDEN_CLASS);
  }

  getHeaderHeight() {
    const el = this.headerOuter || this;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.round(rect.height));
  }

  /**
   * @param {boolean} isHidden
   */
  setStickyTopVar(isHidden) {
    const root = document.documentElement;
    const headerHeight = this.getHeaderHeight();
    root.style.setProperty('--wyms-header-height', `${headerHeight}px`);
    root.style.setProperty('--wyms-header-hidden-gap', '12px');
    root.style.setProperty('--wyms-sticky-top', '0px');
    /** @deprecated Prefer --wyms-sticky-top-inset for sticky `top` + scroll math (measured header). */
    root.style.setProperty('--wyms-product-nav-inset', isHidden ? '16px' : `${headerHeight}px`);
    // Pin sticky subbars directly under the header (or small gap when header is translated away).
    const stickyTopInset = isHidden ? 16 : headerHeight;
    root.style.setProperty('--wyms-sticky-top-inset', `${stickyTopInset}px`);
    document.dispatchEvent(new CustomEvent('wyms:sticky-top-inset'));
  }

  /**
   * @param {boolean} isHidden
   */
  setBodyHeaderHiddenClass(isHidden) {
    document.body.classList.toggle(WYMS_BODY_HEADER_HIDDEN_CLASS, isHidden);
  }

  initHeaderCssVars() {
    this.setStickyTopVar(false);
    this.setBodyHeaderHiddenClass(false);

    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => {
        if (this._roResizeRaf) cancelAnimationFrame(this._roResizeRaf);
        this._roResizeRaf = requestAnimationFrame(() => {
          this._roResizeRaf = 0;
          const isHidden = this.classList.contains('header--hidden');
          this.setStickyTopVar(isHidden);
        });
      });
      const target = this.headerOuter || this;
      this._ro.observe(target);
    }
  }

  initScrollHide() {
    /** Past this scroll position, header may hide on downward intent. */
    const MIN_SCROLL_Y = 100;
    /** Net scroll (px) before toggling — small so a light flick hides/shows. */
    const DOWN_INTENT_TO_HIDE = 9;
    const UP_INTENT_TO_SHOW = 9;
    /** Ignore smaller deltas (subpixel / wheel noise). */
    const DELTA_DEAD_ZONE = 0.38;
    /** Opposite-direction movement erodes intent (dampens +/-1 jitter). */
    const OPPOSITE_EROSION = 0.42;
    /** Cap so idle tab restore / huge jumps do not carry stale intent. */
    const INTENT_CAP = 28;

    this._headerHideAnchorY = Math.round(window.scrollY);
    this._headerScrollLastY = window.scrollY;
    this._headerScrollDownIntent = 0;
    this._headerScrollUpIntent = 0;
    let ticking = false;

    const clampIntent = (n) => Math.min(INTENT_CAP, Math.max(0, n));

    const showHeaderFromScroll = () => {
      this.classList.remove('header--hidden');
      this.setStickyTopVar(false);
      this.setBodyHeaderHiddenClass(false);
      this._headerScrollDownIntent = 0;
      this._headerScrollUpIntent = 0;
      document.dispatchEvent(new CustomEvent('wyms:header-visible'));
    };

    const hideHeaderFromScroll = () => {
      this.classList.add('header--hidden');
      this.setStickyTopVar(true);
      this.setBodyHeaderHiddenClass(true);
      this._headerScrollDownIntent = 0;
      this._headerScrollUpIntent = 0;
      document.dispatchEvent(new CustomEvent('wyms:header-hidden'));
    };

    const update = () => {
      const y = window.scrollY;
      const dyRaw = y - this._headerScrollLastY;
      this._headerScrollLastY = y;
      const dy = Math.abs(dyRaw) < DELTA_DEAD_ZONE ? 0 : dyRaw;
      const headerHidden = this.classList.contains('header--hidden');

      // Always show header when we're near the top of the page.
      if (y <= MIN_SCROLL_Y) {
        this._headerHideAnchorY = Math.round(y);
        this._headerScrollDownIntent = 0;
        this._headerScrollUpIntent = 0;
        if (headerHidden) {
          showHeaderFromScroll();
        } else {
          this.setStickyTopVar(false);
          this.setBodyHeaderHiddenClass(false);
        }
        ticking = false;
        return;
      }

      if (!this.isMobileMenuOpen) {
        if (!headerHidden) {
          if (dy > 0) {
            this._headerScrollDownIntent = clampIntent(this._headerScrollDownIntent + dy);
          } else if (dy < 0) {
            this._headerScrollDownIntent = clampIntent(this._headerScrollDownIntent + dy * OPPOSITE_EROSION);
          }
          if (this._headerScrollDownIntent >= DOWN_INTENT_TO_HIDE && y > MIN_SCROLL_Y) {
            hideHeaderFromScroll();
            this._headerHideAnchorY = Math.round(y);
          }
        } else {
          if (dy < 0) {
            this._headerScrollUpIntent = clampIntent(this._headerScrollUpIntent - dy);
          } else if (dy > 0) {
            this._headerScrollUpIntent = clampIntent(this._headerScrollUpIntent - dy * OPPOSITE_EROSION);
          }
          if (this._headerScrollUpIntent >= UP_INTENT_TO_SHOW) {
            showHeaderFromScroll();
            this._headerHideAnchorY = Math.round(y);
          }
        }
      }

      ticking = false;
    };
  
    this._scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', this._scrollHandler, { passive: true });
  }

  initDesktopNav() {
    const navItems = this.querySelectorAll('.header-nav-desktop .nav-item-wrapper');
    navItems.forEach((item) => {
      let hideTimeout = 0;
      item.addEventListener('mouseenter', () => {
        if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = 0; }
        item.classList.add('is-open');
      });
      item.addEventListener('mouseleave', () => {
        hideTimeout = window.setTimeout(() => item.classList.remove('is-open'), 150);
      });
    });
  }

  initMobileNav() {
    this.openBtn?.addEventListener('click', () => this.openMobileMenu());

    this.mobilePanel?.querySelector('.js-mobile-close')
      ?.addEventListener('click', () => this.closeMobileMenu());

    this.mobilePanel?.addEventListener('click', (e) => {
      if (e.target instanceof Element && !e.target.closest('.mobile-menu-card')) {
        this.closeMobileMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMobileMenuOpen) this.closeMobileMenu();
    });

    document.addEventListener('wyms:close-mobile-menu', () => this.closeMobileMenu());

    document.querySelectorAll('.cart-drawer-trigger').forEach((btn) => {
      btn.addEventListener('click', () => this.closeMobileMenu());
    });

    this.mobilePanel?.querySelectorAll('.js-open-submenu').forEach((item) => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        if (!targetId) return;
        if (this.mainList) this.mainList.style.display = 'none';
        const targetMenu = /** @type {HTMLElement | null} */ (this.mobilePanel?.querySelector(`#${targetId}`) || null);
        if (targetMenu) targetMenu.style.display = 'block';
      });
    });

    this.mobilePanel?.querySelectorAll('.js-back-to-main').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.submenuPages?.forEach((p) => { p.style.display = 'none'; });
        if (this.mainList) this.mainList.style.display = 'block';
      });
    });
  }

  openMobileMenu() {
    if (!this.mobilePanel) return;
    document.dispatchEvent(new CustomEvent('wyms:close-cart'));
    this.mobilePanel.style.display = 'block';
    document.body.classList.add('mobile-menu-open');
    this.isMobileMenuOpen = true;
    this.classList.remove('header--hidden');
    this.setStickyTopVar(false);
    this.setBodyHeaderHiddenClass(false);
    const y = Math.round(window.scrollY);
    this._headerHideAnchorY = y;
    this._headerScrollLastY = window.scrollY;
    this._headerScrollDownIntent = 0;
    this._headerScrollUpIntent = 0;
    document.dispatchEvent(new CustomEvent('wyms:header-visible'));
  }

  closeMobileMenu() {
    if (!this.mobilePanel || !this.isMobileMenuOpen) return;
    this.mobilePanel.style.display = 'none';
    document.body.classList.remove('mobile-menu-open');
    this.isMobileMenuOpen = false;
    const y = Math.round(window.scrollY);
    this._headerHideAnchorY = y;
    this._headerScrollLastY = window.scrollY;
    this._headerScrollDownIntent = 0;
    this._headerScrollUpIntent = 0;
    if (this.mainList) this.mainList.style.display = 'block';
    this.submenuPages?.forEach((p) => { p.style.display = 'none'; });
  }
}

if (!customElements.get('wyms-header')) {
  customElements.define('wyms-header', WymsHeader);
}