/**
 * @class WymsProductSet
 * @extends HTMLElement
 */
class WymsProductSet extends HTMLElement {
    constructor() {
      super();
    }
  
    connectedCallback() {
      this.sectionId = this.dataset.sectionId;
      /** @type {HTMLElement | null} */
      this.contentContainer = this.querySelector('.js-set-dynamic-content');
      
      if (!this.sectionId || !this.contentContainer) return;
  
      this.lastVariantId = this.getCurrentVariantId();
      
      this.initAccordions();
      
      this.setupVariantWatcher();
    }
  
    
    initAccordions() {
      /** @type {NodeListOf<HTMLElement>} */
      const triggers = this.querySelectorAll('.js-set-trigger');
      
      triggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
          /** @type {HTMLElement | null} */
          const currentItem = trigger.closest('.js-set-item');
          if (!currentItem) return;
  
          const isOpen = currentItem.classList.contains('is-open');
  
          const allItems = this.querySelectorAll('.js-set-item.is-open');
          allItems.forEach((item) => {
            item.classList.remove('is-open');
            const itemTrigger = item.querySelector('.js-set-trigger');
            if (itemTrigger) itemTrigger.setAttribute('aria-expanded', 'false');
          });
  
          if (!isOpen) {
            currentItem.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
          }
        });
      });
    }
  
    /**
     * @returns {string | null}
     */
    getCurrentVariantId() {
      const params = new URLSearchParams(window.location.search);
      return params.get('variant');
    }
  
    /**
     * @param {string} variantId 
     */
    async reloadSectionForVariant(variantId) {
      if (!this.contentContainer || !this.sectionId) return;
  
      const url = `${window.location.pathname}?section_id=${encodeURIComponent(this.sectionId)}&variant=${encodeURIComponent(variantId)}`;
  
      try {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) return;
        
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
  
        const newSection = doc.querySelector(`[data-section-id="${this.sectionId}"]`);
        const newContent = newSection?.querySelector('.js-set-dynamic-content');
  
        if (!newContent) return;
  
        this.contentContainer.innerHTML = newContent.innerHTML;
        
        this.initAccordions();
  
      } catch (e) {
        console.error('WYMS Product Set reload error:', e);
      }
    }
  
    setupVariantWatcher() {
      const handleUrlChange = () => {
        const currentVariantId = this.getCurrentVariantId();
        if (!currentVariantId || currentVariantId === this.lastVariantId) return;
        
        this.lastVariantId = currentVariantId;
        this.reloadSectionForVariant(currentVariantId);
      };
  
      window.addEventListener('popstate', handleUrlChange);
  
      const wrapHistoryMethod = (type) => {
        const original = history[type];
        if (typeof original !== 'function') return;
        
        history[type] = (...args) => {
          const result = original.apply(history, args);
          handleUrlChange();
          return result;
        };
      };
  
      wrapHistoryMethod('pushState');
      wrapHistoryMethod('replaceState');
    }
  }
  
  if (!customElements.get('wyms-product-set')) {
    customElements.define('wyms-product-set', WymsProductSet);
  }