class CollectionCarousel extends HTMLElement {
  constructor() {
    super();
    /** @type {HTMLElement | null} */
    this.track = null;
    /** @type {NodeListOf<HTMLElement> | never[]} */
    this.dots = [];
    
    this.isDown = false;
    this.startX = 0;
    this.scrollLeftPos = 0;
  }

  connectedCallback() {
    this.track = this.querySelector('.collection-track');
    this.dots = this.querySelectorAll('.pagination-dot');

    const track = this.track;
    if (!track) return;

    track.addEventListener('scroll', () => this.updateDots());

    track.addEventListener('mousedown', (e) => this.startDragging(e));
    track.addEventListener('mouseleave', () => this.stopDragging());
    track.addEventListener('mouseup', () => this.stopDragging());
    track.addEventListener('mousemove', (e) => this.doDragging(e));

    this.updateDots();
  }

  /** @param {MouseEvent} e */
  startDragging(e) {
    const track = this.track;
    if (!track) return;

    this.isDown = true;
    track.classList.add('is-dragging');
    
    this.startX = e.pageX - track.offsetLeft;
    this.scrollLeftPos = track.scrollLeft;
    
    track.style.scrollBehavior = 'auto';
    track.style.scrollSnapType = 'none';
  }

  stopDragging() {
    const track = this.track;
    if (!this.isDown || !track) return;

    this.isDown = false;
    track.classList.remove('is-dragging');
    
    track.style.scrollBehavior = 'smooth';
    track.style.scrollSnapType = 'x mandatory';
  }

  /** @param {MouseEvent} e */
  doDragging(e) {
    const track = this.track;
    if (!this.isDown || !track) return;

    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - this.startX) * 2; 
    track.scrollLeft = this.scrollLeftPos - walk;
  }

  updateDots() {
    const track = this.track;
    const dots = this.dots;

    if (!track || !dots || dots.length === 0) return;

    const scrollLeft = track.scrollLeft;
    const scrollMax = track.scrollWidth - track.clientWidth;
    
    if (scrollMax <= 0) return;

    const progress = scrollLeft / scrollMax;
    let activeIndex = Math.floor(progress * dots.length);
    
    if (progress >= 0.98) activeIndex = dots.length - 1;
    if (progress <= 0.02) activeIndex = 0;

    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIndex);
    });
  }
}

if (!customElements.get('collection-carousel')) {
  customElements.define('collection-carousel', CollectionCarousel);
}