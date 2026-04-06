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
    if (!track || !dots || dots.length === 0) return;

    const scrollLeft = track.scrollLeft;
    const maxScroll = track.scrollWidth - track.clientWidth;

    dots.forEach((dot, index) => {
      dot.classList.remove('active');
      
      
      if (scrollLeft < 50 && index === 0) {
        dot.classList.add('active');
      } 
      else if (scrollLeft >= maxScroll - 50 && index === dots.length - 1) {
        dot.classList.add('active');
      } 
      else if (scrollLeft >= 50 && scrollLeft < maxScroll - 50 && index === 1) {
        dot.classList.add('active');
      }
    });
  }
}

if (!customElements.get('featured-products')) {
  customElements.define('featured-products', FeaturedProducts);
}