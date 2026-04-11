/**
 * @class WymsFeaturesCarousel
 * @extends HTMLElement
 */
class WymsFeaturesCarousel extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    /** @type {HTMLElement | null} */
    this.list = this.querySelector('.js-carousel-list');
    /** @type {NodeListOf<HTMLElement>} */
    this.dots = this.querySelectorAll('.wyms-pagination-dot');
    /** @type {HTMLElement | null} */
    this.paginationContainer = this.querySelector('.wyms-features__pagination');
    /** @type {HTMLElement | null} */
    this.arrowLeft = this.querySelector('.js-arrow-left');
    /** @type {HTMLElement | null} */
    this.arrowRight = this.querySelector('.js-arrow-right');

    if (!this.list) return;

    this.initArrows();
    this.initDots();
    this.initDragToScroll();
    this.initIntersectionObserver();

    this.checkOverflow();
    this.positionArrows();

    const resizeObserver = new ResizeObserver(() => {
      this.checkOverflow();
      this.updateActiveDot();
      this.positionArrows();
    });
    resizeObserver.observe(this.list);

    this._onPageScroll = () => this.positionArrows();
    window.addEventListener('scroll', this._onPageScroll, { passive: true });
  }

  disconnectedCallback() {
    if (this._onPageScroll) {
      window.removeEventListener('scroll', this._onPageScroll);
    }
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
    }
  }

  initIntersectionObserver() {
    if (!this.arrowLeft && !this.arrowRight) return;

    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting;
          this.arrowLeft?.classList.toggle('is-visible', isVisible);
          this.arrowRight?.classList.toggle('is-visible', isVisible);

          if (isVisible) {
            this.positionArrows();
            this.updateScrollEdgeState();
          }
        });
      },
      { threshold: 0.05 }
    );

    const blockWrapper = this.closest('.wyms-features__block-wrapper') || this;
    this._intersectionObserver.observe(blockWrapper);
  }

  positionArrows() {
    if (!this.arrowLeft && !this.arrowRight) return;
    if (!this.list) return;

    const trackRect   = this.list.getBoundingClientRect();
    const paddingTop  = parseInt(getComputedStyle(this.list).paddingTop) || 32;
    const mediaHeight = 320; 

    const mediaCenterY = trackRect.top + paddingTop + mediaHeight / 2;
    const topPx = mediaCenterY - 20;

    if (this.arrowLeft)  this.arrowLeft.style.top  = topPx + 'px';
    if (this.arrowRight) this.arrowRight.style.top = topPx + 'px';
  }

  checkOverflow() {
    if (!this.list) return;
    const hasOverflow = this.list.scrollWidth > this.list.clientWidth + 5;

    if (this.paginationContainer) {
      this.paginationContainer.classList.toggle('is-hidden', !hasOverflow);
    }

    if (this.arrowLeft)  this.arrowLeft.classList.toggle('is-hidden', !hasOverflow);
    if (this.arrowRight) this.arrowRight.classList.toggle('is-hidden', !hasOverflow);
  }

  
  updateScrollEdgeState() {
    if (!this.list) return;
    const { scrollLeft, scrollWidth, clientWidth } = this.list;
    const atStart = scrollLeft <= 4;
    const atEnd   = scrollLeft >= scrollWidth - clientWidth - 4;

    if (this.arrowLeft)  this.arrowLeft.classList.toggle('is-hidden', atStart);
    if (this.arrowRight) this.arrowRight.classList.toggle('is-hidden', atEnd);
  }

  getScrollStep() {
    if (!this.list) return 0;
    const firstItem = this.list.querySelector('.js-carousel-item');
    if (!firstItem) return 0;
    const gap = parseInt(window.getComputedStyle(this.list).columnGap) || 32;
    return /** @type {HTMLElement} */ (firstItem).offsetWidth + gap;
  }

  
  initArrows() {
    this.arrowLeft?.addEventListener('click', (e) => {
      e.preventDefault();
      this.list?.scrollBy({ left: -this.getScrollStep(), behavior: 'smooth' });
    });

    this.arrowRight?.addEventListener('click', (e) => {
      e.preventDefault();
      this.list?.scrollBy({ left: this.getScrollStep(), behavior: 'smooth' });
    });
  }

  
  updateActiveDot() {
    if (!this.list || this.dots.length === 0) return;

    const scrollLeft = this.list.scrollLeft;
    const maxScroll  = this.list.scrollWidth - this.list.clientWidth;

    let activeDotIndex = 0;
    if (scrollLeft > 20 && scrollLeft < maxScroll - 20) {
      activeDotIndex = 1;
    } else if (scrollLeft >= maxScroll - 20) {
      activeDotIndex = 2;
    }

    this.dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === activeDotIndex);
    });
  }

  initDots() {
    if (!this.list) return;
    this.list.addEventListener('scroll', () => {
      window.requestAnimationFrame(() => {
        this.updateActiveDot();
        this.updateScrollEdgeState(); 
      });
    }, { passive: true });

    this.updateActiveDot();
  }

  
  initDragToScroll() {
    if (!this.list) return;
    let isDown    = false;
    let startX    = 0;
    let scrollLeft = 0;

    this.list.addEventListener('mousedown', /** @param {MouseEvent} e */ (e) => {
      isDown = true;
      startX = e.pageX - /** @type {HTMLElement} */ (this.list).offsetLeft;
      scrollLeft = /** @type {HTMLElement} */ (this.list).scrollLeft;
      this.list?.style.setProperty('cursor', 'grabbing');
    });

    this.list.addEventListener('mouseleave', () => {
      isDown = false;
      this.list?.style.removeProperty('cursor');
    });

    this.list.addEventListener('mouseup', () => {
      isDown = false;
      this.list?.style.removeProperty('cursor');
    });

    this.list.addEventListener('mousemove', /** @param {MouseEvent} e */ (e) => {
      if (!isDown || !this.list) return;
      e.preventDefault();
      const x    = e.pageX - this.list.offsetLeft;
      const walk = (x - startX) * 2;
      this.list.scrollLeft = scrollLeft - walk;
    });
  }
}

if (!customElements.get('wyms-features-carousel')) {
  customElements.define('wyms-features-carousel', WymsFeaturesCarousel);
}