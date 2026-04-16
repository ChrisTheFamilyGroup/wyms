class WymsHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.mobilePanel = this.querySelector('#MobileNav');
    this.openBtn = this.querySelector('.js-mobile-open');
    this.closeBtn = this.querySelector('.js-mobile-close');
    this.mainList = this.querySelector('#MobileMainList');
    this.submenuPages = this.querySelectorAll('.submenu-page');
    this.isMobileMenuOpen = false;
    this.initDesktopNav();
    this.initMobileNav();
  }

  initDesktopNav() {
    const navItems = this.querySelectorAll('.header-nav-desktop .nav-item-wrapper');

    navItems.forEach((item) => {
      let hideTimeout = 0; 

      item.addEventListener('mouseenter', () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = 0;
        }
        item.classList.add('is-open');
      });

      item.addEventListener('mouseleave', () => {
        hideTimeout = window.setTimeout(() => {
          item.classList.remove('is-open');
        }, 150);
      });
    });
  }

  initMobileNav() {
    this.openBtn?.addEventListener('click', () => this.openMobileMenu());
    this.closeBtn?.addEventListener('click', () => this.closeMobileMenu());

    this.mobilePanel?.addEventListener('click', (e) => {
      // Fix: Check if target is Element before calling closest
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

    this.querySelectorAll('.js-open-submenu').forEach((item) => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        if (!targetId) return;
        if (this.mainList) this.mainList.style.display = 'none';
        const targetMenu = this.querySelector(`#${targetId}`);
        if (targetMenu) targetMenu.style.display = 'block';
      });
    });

    this.querySelectorAll('.js-back-to-main').forEach((btn) => {
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