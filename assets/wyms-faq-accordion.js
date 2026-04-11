/**
 * @class WymsFaqAccordion
 * @extends HTMLElement
 */
class WymsFaqAccordion extends HTMLElement {
    constructor() {
      super();
    }
  
    connectedCallback() {
      /** @type {NodeListOf<HTMLElement>} */
      const triggers = this.querySelectorAll('.faq-item__trigger');
      if (!triggers || triggers.length === 0) return;
  
      triggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
          /** @type {HTMLElement | null} */
          const currentItem = trigger.closest('.faq-item');
          if (!currentItem) return;
  
          const isOpen = currentItem.classList.contains('is-open');
  
          const allItems = this.querySelectorAll('.faq-item.is-open');
          allItems.forEach((item) => {
            item.classList.remove('is-open');
            /** @type {HTMLElement | null} */
            const itemTrigger = item.querySelector('.faq-item__trigger');
            if (itemTrigger) itemTrigger.setAttribute('aria-expanded', 'false');
          });
  
          if (!isOpen) {
            currentItem.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
          }
        });
      });
    }
  }
  
  if (!customElements.get('wyms-faq-accordion')) {
    customElements.define('wyms-faq-accordion', WymsFaqAccordion);
  }