/**
 * @class WymsCollectionNav
 * @extends HTMLElement
 */
class WymsCollectionNav extends HTMLElement {
    constructor() {
      super();
    }
  
    connectedCallback() {
      /** @type {HTMLElement | null} */
      const slider = this.querySelector('.collection-nav__buttons');
      if (!slider) return;
  
      this.initDragToScroll(slider);
    }
  
    /**
     * Initializes drag-to-scroll functionality for the navigation buttons.
     * @param {HTMLElement} slider 
     */
    initDragToScroll(slider) {
      /** @type {boolean} */
      let isDown = false;
      /** @type {number} */
      let startX = 0;
      /** @type {number} */
      let scrollLeft = 0;
  
      slider.addEventListener('mousedown', /** @param {MouseEvent} e */ (e) => {
        isDown = true;
        slider.classList.add('is-dragging');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
      });
  
      slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('is-dragging');
      });
  
      slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('is-dragging');
      });
  
      slider.addEventListener('mousemove', /** @param {MouseEvent} e */ (e) => {
        if (!isDown) return;
        e.preventDefault();
        
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2; 
        slider.scrollLeft = scrollLeft - walk;
      });
    }
  }
  
  if (!customElements.get('wyms-collection-nav')) {
    customElements.define('wyms-collection-nav', WymsCollectionNav);
  }