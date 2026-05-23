class FeaturedProducts extends HTMLElement {
  constructor() {
    super();
    /** @type {HTMLElement | null} */
    this.track = null;
    /** @type {NodeListOf<HTMLElement> | never[]} */
    this.dots = [];
    /** @type {HTMLElement | null} */
    this.btnNext = null;
    /** @type {HTMLElement | null} */
    this.btnPrev = null;

    this.isDown = false;
    this.startX = 0;
    this.scrollLeftPos = 0;
    this.hasMoved = false; 
  }

  connectedCallback() {
    this.track = this.querySelector('.carousel-track-container');
    this.dots = this.querySelectorAll('.dot');
    this.btnNext = this.querySelector('.js-next');
    this.btnPrev = this.querySelector('.js-prev');

    const track = this.track;
    if (!track) return;

    track.addEventListener('scroll', () => this.updateDots());

    this.initArrows();
    this.initDragToScroll();

    this.updateDots();
  }

  initArrows() {
    const getScrollStep = () => {
      const firstCard = this.track.querySelector('.product-card-wrapper');
      if (!firstCard) return this.track.clientWidth * 0.8; 
      const cardWidth = firstCard.clientWidth;
      const gap = 24; 
      return cardWidth + gap;
    };

    this.btnNext?.addEventListener('click', () => {
      this.track.style.scrollSnapType = 'x mandatory'; 
      this.track.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    this.btnPrev?.addEventListener('click', () => {
      this.track.style.scrollSnapType = 'x mandatory';
      this.track.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });
  }

  initDragToScroll() {
    const track = this.track;

    track.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;

      this.isDown = true;
      this.hasMoved = false; 
      
      this.startX = e.pageX - track.offsetLeft;
      this.scrollLeftPos = track.scrollLeft;
      
      track.style.scrollBehavior = 'auto';
      track.style.scrollSnapType = 'none';
    });

    const stopDragging = () => {
      if (!this.isDown) return;
      this.isDown = false;
      
      setTimeout(() => {
        track.classList.remove('is-dragging');
      }, 50);
      
      track.style.scrollSnapType = 'x mandatory';
      track.style.scrollBehavior = 'smooth';
    };

    track.addEventListener('mouseleave', stopDragging);
    track.addEventListener('mouseup', stopDragging);

    track.addEventListener('mousemove', (e) => {
      if (!this.isDown) return;
      
      const x = e.pageX - track.offsetLeft;
      const walk = (x - this.startX) * 1.5; 
      
      if (Math.abs(x - this.startX) > 10) {
        if (!this.hasMoved) {
          this.hasMoved = true;
          track.classList.add('is-dragging');
        }
        e.preventDefault();
        track.scrollLeft = this.scrollLeftPos - walk;
      }
    });

    track.addEventListener('click', (e) => {
      if (this.hasMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true); 
  }

  updateDots() {
    const track = this.track;
    const dots = this.dots;
    if (!track || !dots || dots.length === 0) return;

    const scrollLeft = track.scrollLeft;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const slideWidth = track.querySelector('.product-card-wrapper')?.clientWidth + 24 || 1;

    dots.forEach((dot) => {
      dot.classList.remove('active', 'is-looping');
      dot.style.removeProperty('--loop-progress');
    });

    if (maxScroll <= 0) {
      dots[0]?.classList.add('active');
      return;
    }

    const exactIndex = scrollLeft / slideWidth;
    const maxIndex = maxScroll / slideWidth;

    if (exactIndex < 1.0) {
      if (exactIndex < 0.5) dots[0]?.classList.add('active');
      else dots[1]?.classList.add('active');
    } 
    else if (exactIndex > maxIndex - 1.0) {
      if (exactIndex > maxIndex - 0.5) dots[dots.length - 1]?.classList.add('active');
      else dots[1]?.classList.add('active');
    } 
    else if (dots[1]) {
      dots[1].classList.add('is-looping');
      const progress = exactIndex % 1;
      dots[1].style.setProperty('--loop-progress', progress);
    }
  }
}

if (!customElements.get('featured-products')) {
  customElements.define('featured-products', FeaturedProducts);
}