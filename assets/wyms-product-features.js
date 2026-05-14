/**
 * @class WymsFeaturesCarousel
 * @extends HTMLElement
 */
class WymsFeaturesCarousel extends HTMLElement {
  constructor() {
    super();
    this._ro = null;
    this._io = null;
    // Momentum/Inertia variables
    this.isDown = false;
    this.startX = 0;
    this.scrollLeftPos = 0;
    this.velX = 0;
    this.momentumID = null;
    this.lastMouseX = 0;
  }

  connectedCallback() {
    this.list = this.querySelector('.js-carousel-list');
    this.dots = this.querySelectorAll('.wyms-pagination-dot');
    this.paginationContainer = this.querySelector('.wyms-features__pagination');
    this.arrowLeft = this.querySelector('.js-arrow-left');
    this.arrowRight = this.querySelector('.js-arrow-right');

    if (!this.list) return;

    this.initArrows();
    this.initDots();
    this.initDragToScroll();
    this.initIntersectionObserver();

    this.checkOverflow();
    this.positionArrows();

    this._ro = new ResizeObserver(() => {
      this.checkOverflow();
      this.updateActiveDot();
      this.positionArrows();
    });
    this._ro.observe(this.list);
  }

  disconnectedCallback() {
    this._ro?.disconnect();
    this._io?.disconnect();
    if (this.momentumID) cancelAnimationFrame(this.momentumID);
  }

  initIntersectionObserver() {
    if (!this.arrowLeft && !this.arrowRight) return;
    this._io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const isVisible = entry.isIntersecting;
        this.arrowLeft?.classList.toggle('is-visible', isVisible);
        this.arrowRight?.classList.toggle('is-visible', isVisible);
        if (isVisible) {
          this.positionArrows();
          this.updateScrollEdgeState();
        }
      });
    }, { threshold: 0.05 });
    this._io.observe(this.closest('.wyms-features__block-wrapper') || this);
  }

  positionArrows() {
    if ((!this.arrowLeft && !this.arrowRight) || !this.list) return;
    const listOffsetTop = this.list.offsetTop;
    const paddingTop = parseInt(getComputedStyle(this.list).paddingTop) || 32;
    const firstMedia = this.querySelector('.wyms-feature-card__media');
    const mediaHeight = firstMedia ? firstMedia.offsetHeight : 320;
    const topPx = listOffsetTop + paddingTop + (mediaHeight / 2);

    if (this.arrowLeft) this.arrowLeft.style.top = topPx + 'px';
    if (this.arrowRight) this.arrowRight.style.top = topPx + 'px';
  }

  checkOverflow() {
    if (!this.list) return;
    const hasOverflow = this.list.scrollWidth > this.list.clientWidth + 5;
    if (this.paginationContainer) this.paginationContainer.classList.toggle('is-hidden', !hasOverflow);
    if (this.arrowLeft) this.arrowLeft.classList.toggle('is-hidden', !hasOverflow);
    if (this.arrowRight) this.arrowRight.classList.toggle('is-hidden', !hasOverflow);
    this.updateScrollEdgeState();
  }

  updateScrollEdgeState() {
    if (!this.list) return;
    const { scrollLeft, scrollWidth, clientWidth } = this.list;
    if (this.arrowLeft) this.arrowLeft.classList.toggle('is-hidden', scrollLeft <= 10);
    if (this.arrowRight) this.arrowRight.classList.toggle('is-hidden', scrollLeft >= scrollWidth - clientWidth - 10);
  }

  getScrollStep() {
    if (!this.list) return 0;
    const firstItem = this.list.querySelector('.js-carousel-item');
    if (!firstItem) return 0;
    const gap = parseInt(window.getComputedStyle(this.list).columnGap) || 32;
    return firstItem.offsetWidth + gap;
  }

  initArrows() {
    this.arrowLeft?.addEventListener('click', () => this.list?.scrollBy({ left: -this.getScrollStep(), behavior: 'smooth' }));
    this.arrowRight?.addEventListener('click', () => this.list?.scrollBy({ left: this.getScrollStep(), behavior: 'smooth' }));
  }

  updateActiveDot() {
    if (!this.list || this.dots.length === 0) return;
    const step = this.getScrollStep();
    if (step === 0) return;
    const activeIndex = Math.round(this.list.scrollLeft / step);
    this.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === activeIndex));
  }

  initDots() {
    if (!this.list) return;
    this.list.addEventListener('scroll', () => {
      window.requestAnimationFrame(() => {
        this.updateActiveDot();
        this.updateScrollEdgeState();
      });
    }, { passive: true });

    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.list.scrollTo({ left: index * this.getScrollStep(), behavior: 'smooth' });
      });
    });
    this.updateActiveDot();
  }

  initDragToScroll() {
    const track = this.list;

    track.addEventListener('mousedown', (e) => {
      this.isDown = true;
      track.classList.add('is-dragging');
      this.startX = e.pageX - track.offsetLeft;
      this.scrollLeftPos = track.scrollLeft;
      this.lastMouseX = e.pageX;
      this.velX = 0;

      cancelAnimationFrame(this.momentumID);
      
      track.style.scrollSnapType = 'none';
      track.style.scrollBehavior = 'auto';
    });

    const endDrag = () => {
      if (!this.isDown) return;
      this.isDown = false;
      track.classList.remove('is-dragging');

      this.beginMomentum();
    };

    track.addEventListener('mouseleave', endDrag);
    track.addEventListener('mouseup', endDrag);

    track.addEventListener('mousemove', (e) => {
      if (!this.isDown) return;
      e.preventDefault();

      const x = e.pageX - track.offsetLeft;
      const walk = (x - this.startX) * 1.5; 
      
      this.velX = e.pageX - this.lastMouseX;
      this.lastMouseX = e.pageX;

      track.scrollLeft = this.scrollLeftPos - walk;
    });
  }

  
  beginMomentum() {
    const track = this.list;
    const decay = 0.95; 
    const step = () => {
      if (Math.abs(this.velX) > 0.5) {
        track.scrollLeft -= this.velX;
        this.velX *= decay; 
        this.momentumID = requestAnimationFrame(step);
      } else {
        track.style.scrollSnapType = 'x mandatory';
        track.style.scrollBehavior = 'smooth';
      }
    };
    this.momentumID = requestAnimationFrame(step);
  }
}

if (!customElements.get('wyms-features-carousel')) {
  customElements.define('wyms-features-carousel', WymsFeaturesCarousel);
}