class WymsProductNav extends HTMLElement {
    constructor() {
      super();
    }
  
    connectedCallback() {
      this.navWrapper = this.querySelector('.js-product-nav-sticky');
      this.shopifySection = this.navWrapper ? this.navWrapper.closest('.shopify-section') : null;
      this.mainHeader = document.querySelector('.header-outer-container');
      this.navLinks = this.querySelectorAll('.js-product-nav-link');
  
      if (!this.navWrapper) return;
  
      this.filterMissingTargets();
      this.initStickyPosition();
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
  
    getStickyTop() {
      if (!this.mainHeader) return 0;
      const headerHeight = this.mainHeader.getBoundingClientRect().height;
      const overlap = 112;
      return Math.floor(headerHeight - overlap);
    }
  
    updateStickyPosition() {
      if (!this.shopifySection) return;
      const top = this.getStickyTop();
      this.shopifySection.style.position = 'sticky';
      this.shopifySection.style.top = `${top}px`;
      this.shopifySection.style.zIndex = '90';
    }
  
    initStickyPosition() {
      window.addEventListener('scroll', () => this.updateStickyPosition(), { passive: true });
      window.addEventListener('resize', () => this.updateStickyPosition());
      setTimeout(() => this.updateStickyPosition(), 100);
    }
  
    initNavLinks() {
      this.navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('data-target-id');
          const targetEl = document.getElementById(targetId);
          if (!targetEl) return;
  
          const headerHeight = this.mainHeader ? this.mainHeader.offsetHeight : 0;
          const navHeight = this.navWrapper ? this.navWrapper.offsetHeight : 0;
          const offset = (headerHeight - 110) + navHeight + 30;
          const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;
  
          window.scrollTo({ top: targetPos, behavior: 'smooth' });
        });
      });
    }
  
    initScrollSpy() {
      window.addEventListener('scroll', () => {
        const headerHeight = this.mainHeader ? this.mainHeader.offsetHeight : 0;
        const navHeight = this.navWrapper ? this.navWrapper.offsetHeight : 0;
        const threshold = (headerHeight - 110) + navHeight + 40;
  
        let activeId = null;
  
        this.navLinks.forEach((link) => {
          if (!document.getElementById(link.getAttribute('data-target-id'))) return;
          const targetEl = document.getElementById(link.getAttribute('data-target-id'));
          if (!targetEl) return;
          if (targetEl.getBoundingClientRect().top <= threshold) {
            activeId = link.getAttribute('data-target-id');
          }
        });
  
        this.navLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('data-target-id') === activeId);
        });
      }, { passive: true });
    }
  }
  
  if (!customElements.get('wyms-product-nav')) {
    customElements.define('wyms-product-nav', WymsProductNav);
  }
  