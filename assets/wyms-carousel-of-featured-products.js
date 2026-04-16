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

    // 1. Очищаємо всі класи та стилі перед новими обчисленнями
    dots.forEach((dot) => {
      dot.classList.remove('active', 'is-looping');
      dot.style.removeProperty('--loop-progress');
    });

    if (maxScroll <= 0) {
      dots[0].classList.add('active');
      return;
    }

    // 2. Визначаємо ширину одного "кроку" (ширина картки + 24px gap)
    const firstCard = track.querySelector('.product-card-wrapper');
    const slideWidth = firstCard ? firstCard.clientWidth + 24 : track.clientWidth * 0.8;

    // exactIndex показує точну позицію. Наприклад, 1.5 - це рівно посередині між 2 і 3 карткою.
    const exactIndex = scrollLeft / slideWidth;
    const maxIndex = maxScroll / slideWidth;

    // 3. Логіка розподілу
    if (exactIndex < 1.0) {
      // ЗОНА 1: Перехід від 1-ї до 2-ї картки (стандартна поведінка)
      if (exactIndex < 0.5) dots[0].classList.add('active');
      else dots[1].classList.add('active');
    } 
    else if (exactIndex > maxIndex - 1.0) {
      // ЗОНА 3: Перехід до останньої картки (стандартна поведінка)
      if (exactIndex > maxIndex - 0.5) dots[2].classList.add('active');
      else dots[1].classList.add('active');
    } 
    else {
      // ЗОНА 2: Всі середні товари (наш конвеєр!)
      dots[1].classList.add('is-looping');
      
      // Рахуємо залишок від ділення на 1. 
      // Якщо ми між 2-ю і 3-ю карткою, progress буде йти від 0.0 до 1.0
      const progress = exactIndex % 1;
      
      // Передаємо в CSS
      dots[1].style.setProperty('--loop-progress', progress);
    }
  }
}

if (!customElements.get('featured-products')) {
  customElements.define('featured-products', FeaturedProducts);
}