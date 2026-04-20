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
  }

  connectedCallback() {
    this.track = this.querySelector('.carousel-track-container');
    this.dots = this.querySelectorAll('.dot');
    this.btnNext = this.querySelector('.next');
    this.btnPrev = this.querySelector('.prev');

    const track = this.track;
    if (!track) return;

    track.addEventListener('scroll', () => this.updateDots());

    const getScrollStep = () => {
      const firstCard = track.querySelector('.product-card-wrapper');
      if (!firstCard) return track.clientWidth * 0.8; 
      
      const cardWidth = firstCard.clientWidth;
      const gap = 24; 
      return cardWidth + gap;
    };

    this.btnNext?.addEventListener('click', () => {
      track.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    this.btnPrev?.addEventListener('click', () => {
      track.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    this.updateDots();
  }

  updateDots() {
    const track = this.track;
    const dots = this.dots;
    if (!track || !dots || dots.length !== 3) return;

    const scrollLeft = track.scrollLeft;
    const maxScroll = track.scrollWidth - track.clientWidth;

    dots.forEach((dot) => {
      dot.classList.remove('active', 'is-looping');
      dot.style.removeProperty('--loop-progress');
    });

    if (maxScroll <= 0) {
      dots[0].classList.add('active');
      return;
    }

    const firstCard = track.querySelector('.product-card-wrapper');
    const slideWidth = firstCard ? firstCard.clientWidth + 24 : track.clientWidth * 0.8;

    const exactIndex = scrollLeft / slideWidth;
    const maxIndex = maxScroll / slideWidth;

    if (exactIndex < 1.0) {
      if (exactIndex < 0.5) dots[0].classList.add('active');
      else dots[1].classList.add('active');
    } 
    else if (exactIndex > maxIndex - 1.0) {
      if (exactIndex > maxIndex - 0.5) dots[2].classList.add('active');
      else dots[1].classList.add('active');
    } 
    else {
      dots[1].classList.add('is-looping');
      
      
      const progress = exactIndex % 1;
      
      dots[1].style.setProperty('--loop-progress', progress);
    }
  }
}

if (!customElements.get('featured-products')) {
  customElements.define('featured-products', FeaturedProducts);
}