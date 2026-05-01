class WymsProductNav extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.navWrapper = this.querySelector('.js-product-nav-sticky');
    this.shopifySection = this.navWrapper
      ? this.navWrapper.closest('.shopify-section')
      : null;
    this.mainHeader = document.querySelector('wyms-header');
    this.mainHeaderInner = document.querySelector('.header-outer-container');
    this.navLinks = this.querySelectorAll('.js-product-nav-link');

    if (!this.navWrapper) return;

    this.filterMissingTargets();
    this.applyInitialStickyTop();
    this.initHeaderEvents();
    this.initNavLinks();
    this.initScrollSpy();
  }

  filterMissingTargets() {
    this.navLinks.forEach((link) => {
      const targetId = link.getAttribute('data-target-id');
      if (document.getElementById(targetId)) {
        link.style.display = '';
        link.style.opacity = '0';
        requestAnimationFrame(() => {
          link.style.transition = 'opacity 0.2s ease';
          link.style.opacity = '1';
        });
      }
    });
  }

  isMobile() {
    return window.innerWidth <= 768;
  }

  getHeaderHeight() {
    if (!this.mainHeaderInner) return 80;
    return Math.round(this.mainHeaderInner.getBoundingClientRect().height);
  }

  applyInitialStickyTop() {
    if (!this.shopifySection) return;

    if (this.isMobile()) {
      this.shopifySection.style.transition = 'none';
      this.shopifySection.style.position = 'sticky';
      this.shopifySection.style.top = '0px';
      this.shopifySection.style.zIndex = '90';

      this.setMobileNavPadding(this.getHeaderHeight());
    } else {
      const top = this.getHeaderHeight() - 112;
      this.shopifySection.style.transition = 'none';
      this.shopifySection.style.position = 'sticky';
      this.shopifySection.style.top = `${top}px`;
      this.shopifySection.style.zIndex = '90';
    }
  }

  setMobileNavPadding(paddingTop) {
    if (!this.navWrapper) return;
    this.navWrapper.style.paddingTop = `${paddingTop}px`;
  }

  onHeaderHidden() {
    if (!this.isMobile()) return;
    this.navWrapper.classList.add('header-is-hidden');
    this.navWrapper.classList.remove('header-is-visible');
    this.setMobileNavPadding(12);
  }

  onHeaderVisible() {
    if (!this.isMobile()) return;
    this.navWrapper.classList.remove('header-is-hidden');
    this.navWrapper.classList.add('header-is-visible');
    this.setMobileNavPadding(this.getHeaderHeight());
  }

  initHeaderEvents() {
    document.addEventListener('wyms:header-hidden', () => this.onHeaderHidden());
    document.addEventListener('wyms:header-visible', () => this.onHeaderVisible());

    window.addEventListener('resize', () => {
      if (this.navWrapper) {
        this.navWrapper.style.transition = 'none';
      }
      this.applyInitialStickyTop();
      requestAnimationFrame(() => {
        if (this.navWrapper) {
          this.navWrapper.style.transition = '';
        }
      });
    });
  }

  initNavLinks() {
    this.navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target-id');
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        const headerHidden = this.mainHeader?.classList.contains('header--hidden');
        const headerHeight = (this.isMobile() && headerHidden) ? 0 : this.getHeaderHeight();
        const navHeight = this.navWrapper ? this.navWrapper.offsetHeight : 0;
        const overlap = this.isMobile() ? 0 : 112;
        const offset = (headerHeight - overlap) + navHeight + 20;
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      });
    });
  }

  initScrollSpy() {
    window.addEventListener('scroll', () => {
      const headerHidden = this.mainHeader?.classList.contains('header--hidden');
      const headerHeight = (this.isMobile() && headerHidden) ? 0 : this.getHeaderHeight();
      const navHeight = this.navWrapper ? this.navWrapper.offsetHeight : 0;
      const overlap = this.isMobile() ? 0 : 112;
      const threshold = (headerHeight - overlap) + navHeight + 30;

      let activeId = null;
      this.navLinks.forEach((link) => {
        const targetEl = document.getElementById(link.getAttribute('data-target-id'));
        if (!targetEl) return;
        if (targetEl.getBoundingClientRect().top <= threshold) {
          activeId = link.getAttribute('data-target-id');
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