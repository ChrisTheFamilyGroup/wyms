
class StickyScrolling extends HTMLElement {
  
    /** @type {NodeListOf<HTMLElement>} */
    // @ts-ignore — assigned in connectedCallback before first use
    _rows;
  
    /** @type {NodeListOf<HTMLElement>} */
    // @ts-ignore — assigned in connectedCallback before first use
    _mediaItems;
  
    
  
    /** @type {() => void} */
    _boundHandleScrollEffects;
  
    constructor() {
      super();
      this._boundHandleScrollEffects = this._handleScrollEffects.bind(this);
    }
  
    connectedCallback() {
      if (window.innerWidth <= 768) return;
  
      this._rows       = /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('.sticky-scroll__row'));
      this._mediaItems = /** @type {NodeListOf<HTMLElement>} */ (this.querySelectorAll('.sticky-scroll__img-obj'));
  
      if (!this._rows.length) return;
  
      window.addEventListener('scroll', this._boundHandleScrollEffects, { passive: true });
      window.addEventListener('resize', this._boundHandleScrollEffects, { passive: true });
      this._boundHandleScrollEffects();
    }
  
    disconnectedCallback() {
      window.removeEventListener('scroll', this._boundHandleScrollEffects);
      window.removeEventListener('resize', this._boundHandleScrollEffects);
    }
  
    
    static FADE_IN_START  = 0.85;
    static FULL_VISIBLE   = 0.62;
    static START_FADE_OUT = 0.38;
    static FADE_OUT_END   = 0.18;
  
    /**
     * @param {number} val
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    _clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }
  
    /**
     * @param {number} rowCenter
     * @returns {number}
     */
    _getOpacity(rowCenter) {
      const pos = rowCenter / window.innerHeight;
  
      if (pos > StickyScrolling.FADE_IN_START) {
        return 0;
      }
  
      if (pos > StickyScrolling.FULL_VISIBLE) {
        return this._clamp(
          (StickyScrolling.FADE_IN_START - pos) / (StickyScrolling.FADE_IN_START - StickyScrolling.FULL_VISIBLE),
          0,
          1
        );
      }
  
      if (pos >= StickyScrolling.START_FADE_OUT) {
        return 1;
      }
  
      if (pos >= StickyScrolling.FADE_OUT_END) {
        return this._clamp(
          (pos - StickyScrolling.FADE_OUT_END) / (StickyScrolling.START_FADE_OUT - StickyScrolling.FADE_OUT_END),
          0,
          1
        );
      }
  
      return 0;
    }
  
    _handleScrollEffects() {
      if (!this._rows || !this._mediaItems) return;
  
      const viewportCenter = window.innerHeight / 2;
      /** @type {string | null} */
      let activeIndex = null;
      let bestDist    = Infinity;
  
      this._rows.forEach((row) => {
        const rect      = row.getBoundingClientRect();
        const rowCenter = rect.top + rect.height / 2;
  
       
        const wrap = /** @type {HTMLElement | null} */ (row.querySelector('.sticky-scroll__content-card-wrap'));
  
        if (!wrap) return;
  
        const opacity = this._getOpacity(rowCenter);
  
        
        if (opacity > 0) {
          row.classList.add('is-active');
        } else {
          row.classList.remove('is-active');
        }
  
        wrap.style.opacity = String(opacity);
  
        const dist = Math.abs(rowCenter - viewportCenter);
        if (dist < bestDist) {
          bestDist    = dist;
          activeIndex = row.getAttribute('data-index');
        }
      });
  
      if (activeIndex !== null) {
        this._mediaItems.forEach((img) => {
          const isActive = img.getAttribute('data-media-index') === activeIndex;
          img.classList.toggle('is-active', isActive);
        });
      }
    }
  }
  
  if (!customElements.get('sticky-scrolling')) {
    customElements.define('sticky-scrolling', StickyScrolling);
  }