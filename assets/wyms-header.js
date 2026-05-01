class WymsHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.mobilePanel = this.querySelector('#MobileNav');
    this.openBtn = this.querySelector('.js-mobile-open');
    this.closeBtn = this.querySelector('.js-mobile-close');
    this.mainList = this.mobilePanel?.querySelector('#MobileMainList');
    this.submenuPages = this.mobilePanel?.querySelectorAll('.submenu-page');
    this.isMobileMenuOpen = false;

    if (this.mobilePanel && this.mobilePanel.parentElement !== document.body) {
      document.body.appendChild(this.mobilePanel);
    }

    this.initDesktopNav();
    this.initMobileNav();
    this.initScrollHide();
  }

  initScrollHide() {
    const MOBILE_BREAKPOINT = 768;
    const SCROLL_THRESHOLD = 8;
    let lastScrollY = window.scrollY;
    let isHidden = false;
    let ticking = false;

    const update = () => {
      const currentScrollY = window.scrollY;

      if (window.innerWidth > MOBILE_BREAKPOINT) {
        if (isHidden) {
          isHidden = false;
          this.classList.remove('header--hidden');
          document.dispatchEvent(new CustomEvent('wyms:header-visible'));
        }
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      const delta = currentScrollY - lastScrollY;

      if (!this.isMobileMenuOpen) {
        if (delta > SCROLL_THRESHOLD && currentScrollY > 100 && !isHidden) {
          isHidden = true;
          this.classList.add('header--hidden');
          document.dispatchEvent(new CustomEvent('wyms:header-hidden'));
        } else if (delta < -SCROLL_THRESHOLD && isHidden) {
          isHidden = false;
          this.classList.remove('header--hidden');
          document.dispatchEvent(new CustomEvent('wyms:header-visible'));
        }
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (window.innerWidth > MOBILE_BREAKPOINT && isHidden) {
        isHidden = false;
        this.classList.remove('header--hidden');
        document.dispatchEvent(new CustomEvent('wyms:header-visible'));
      }
    });
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
        const targetMenu = this.mobilePanel.querySelector(`#${targetId}`);
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