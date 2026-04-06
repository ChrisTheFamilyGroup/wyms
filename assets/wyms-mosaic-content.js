/**
 * @class WymsMosaicContent
 * @extends HTMLElement
 */
class WymsMosaicContent extends HTMLElement {
    constructor() {
      super();
    }
  
    connectedCallback() {
      /** @type {NodeListOf<HTMLElement> | null} */
      const carousels = this.querySelectorAll('.wyms-mosaic__carousel');
      if (!carousels || carousels.length === 0) return;
  
      carousels.forEach((carousel) => {
        this.initDragToScroll(carousel);
      });
    }
  
    /**
     * @param {HTMLElement | null} slider 
     */
    initDragToScroll(slider) {
      if (!slider) return;
  
      /** @type {boolean} */
      let isDown = false;
      
      /** @type {number} */
      let startX = 0;
      
      /** @type {number} */
      let scrollLeft = 0;
  
      slider?.addEventListener('mousedown', /** @param {MouseEvent} e */ (e) => {
        isDown = true;
        slider?.classList.add('is-dragging');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
      });
  
      slider?.addEventListener('mouseleave', () => {
        isDown = false;
        slider?.classList.remove('is-dragging');
      });
  
      slider?.addEventListener('mouseup', () => {
        isDown = false;
        slider?.classList.remove('is-dragging');
      });
  
      slider?.addEventListener('mousemove', /** @param {MouseEvent} e */ (e) => {
        if (!isDown) return;
        
        e.preventDefault();
        
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2; 
        
        slider.scrollLeft = scrollLeft - walk;
      });
    }
  }
  
  if (!customElements.get('wyms-mosaic-content')) {
    customElements.define('wyms-mosaic-content', WymsMosaicContent);
  }