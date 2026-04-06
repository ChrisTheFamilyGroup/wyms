/**
 * @class WymsHeader
 * @extends HTMLElement
 */
class WymsHeader extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    /** @type {HTMLElement | null} */
    this.mobilePanel = this.querySelector('#MobileNav');
    /** @type {HTMLElement | null} */
    this.openBtn = this.querySelector('.js-mobile-open');
    /** @type {HTMLElement | null} */
    this.closeBtn = this.querySelector('.js-mobile-close');
    /** @type {HTMLElement | null} */
    this.mainList = this.querySelector('#MobileMainList');
    /** @type {NodeListOf<HTMLElement>} */
    this.submenuPages = this.querySelectorAll('.submenu-page');
    
    /** @type {boolean} */
    this.isMobileMenuOpen = false;

    this.initDesktopNav();
    this.initMobileNav();
  }

  initDesktopNav() {
    /** @type {NodeListOf<HTMLElement>} */
    const navItems = this.querySelectorAll('.header-nav-desktop .nav-item-wrapper');
    
    navItems.forEach((item) => {
      /** @type {number | null} */
      let hideTimeout = null;

      item.addEventListener('mouseenter', () => {
        if (hideTimeout !== null) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
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

    // Close on overlay click
    this.mobilePanel?.addEventListener('click', /** @param {MouseEvent} e */ (e) => {
      /** @type {HTMLElement | null} */
      const target = /** @type {HTMLElement | null} */ (e.target);
      
      if (target && !target.closest('.mobile-menu-card')) {
        this.closeMobileMenu();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', /** @param {KeyboardEvent} e */ (e) => {
      if (e.key === 'Escape' && this.isMobileMenuOpen) this.closeMobileMenu();
    });

    // Handle Submenus
    /** @type {NodeListOf<HTMLElement>} */
    const submenuTriggers = this.querySelectorAll('.js-open-submenu');
    
    submenuTriggers.forEach((item) => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        
        if (!targetId) return;

        if (this.mainList) this.mainList.style.display = 'none';
        
        /** @type {HTMLElement | null} */
        const targetMenu = this.querySelector(`#${targetId}`);
        if (targetMenu) targetMenu.style.display = 'block';
      });
    });

    // Handle Back Button
    /** @type {NodeListOf<HTMLElement>} */
    const backBtns = this.querySelectorAll('.js-back-to-main');
    
    backBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.submenuPages) {
          this.submenuPages.forEach((p) => { p.style.display = 'none'; });
        }
        if (this.mainList) this.mainList.style.display = 'block';
      });
    });
  }

  openMobileMenu() {
    if (!this.mobilePanel) return;
    document.dispatchEvent(new CustomEvent('flygge:close-cart'));
    this.mobilePanel.style.display = 'block';
    document.body.style.overflow = 'hidden'; 
    this.isMobileMenuOpen = true;
  }

  closeMobileMenu() {
    if (!this.mobilePanel || !this.isMobileMenuOpen) return;
    this.mobilePanel.style.display = 'none';
    document.body.style.overflow = ''; 
    this.isMobileMenuOpen = false;
    
    // Reset to main list
    if (this.mainList) this.mainList.style.display = 'block';
    if (this.submenuPages) {
      this.submenuPages.forEach((p) => { p.style.display = 'none'; });
    }
  }
}

if (!customElements.get('wyms-header')) {
  customElements.define('wyms-header', WymsHeader);
}