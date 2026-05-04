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
    this._scrollHandler && window.removeEventListener('scroll', this._scrollHandler);
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
    // Product-nav container always sticks close to the top.
    // When header is visible, we *visually* create the filled space via --wyms-product-nav-inset.
    // No gap between the top of viewport and sticky product-nav container.
    root.style.setProperty('--wyms-sticky-top', '0px');
    root.style.setProperty('--wyms-product-nav-inset', isHidden ? '0px' : `${headerHeight}px`);
  }

  initHeaderCssVars() {
    this.setStickyTopVar(false);

    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => {
        const isHidden = this.classList.contains('header--hidden');
        this.setStickyTopVar(isHidden);
      });
      const target = this.headerOuter || this;
      this._ro.observe(target);
    }
  }

  initScrollHide() {
    const SCROLL_THRESHOLD = 10;
    const MIN_SCROLL_Y = 100;

    let lastScrollY = window.scrollY;
    let isHidden = false;
    let ticking = false;
  
    const update = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      // Always show header when we're near the top of the page.
      if (currentScrollY <= MIN_SCROLL_Y) {
        if (isHidden) {
          isHidden = false;
          this.classList.remove('header--hidden');
          this.setStickyTopVar(false);
          document.dispatchEvent(new CustomEvent('wyms:header-visible'));
        } else {
          this.setStickyTopVar(false);
        }

        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }
  
      if (!this.isMobileMenuOpen) {
        if (delta > SCROLL_THRESHOLD && currentScrollY > MIN_SCROLL_Y && !isHidden) {
          isHidden = true;
          this.classList.add('header--hidden');
          this.setStickyTopVar(true);
          document.dispatchEvent(new CustomEvent('wyms:header-hidden'));
        } else if (delta < -SCROLL_THRESHOLD && isHidden) {
          isHidden = false;
          this.classList.remove('header--hidden');
          this.setStickyTopVar(false);
          document.dispatchEvent(new CustomEvent('wyms:header-visible'));
        }
      }
  
      lastScrollY = currentScrollY;
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
    document.dispatchEvent(new CustomEvent('wyms:header-visible'));
  }

  closeMobileMenu() {
    if (!this.mobilePanel || !this.isMobileMenuOpen) return;
    this.mobilePanel.style.display = 'none';
    document.body.classList.remove('mobile-menu-open');
    this.isMobileMenuOpen = false;
    if (this.mainList) this.mainList.style.display = 'block';
    this.submenuPages?.forEach((p) => { p.style.display = 'none'; });
  }
}

if (!customElements.get('wyms-header')) {
  customElements.define('wyms-header', WymsHeader);
}