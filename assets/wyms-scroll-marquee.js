class WymsScrollMarquee {
    constructor() {
      this.sections = document.querySelectorAll('.js-marquee-section');
      if (!this.sections.length) return;
  
      this.init();
    }
  
    init() {
      const onScroll = () => {
        this.sections.forEach(section => this.processSection(section));
      };
  
      window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
      window.addEventListener('resize', () => requestAnimationFrame(onScroll), { passive: true });
      
      onScroll();
    }
  
    processSection(section) {
      const topRow = section.querySelector('.js-marquee-top');
      const bottomRow = section.querySelector('.js-marquee-bottom');
      if (!topRow || !bottomRow) return;
  
      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
  
      if (rect.top > windowHeight || rect.bottom < 0) return;
  
      const totalDistance = rect.height + windowHeight;
      const currentScroll = windowHeight - rect.top;
      
      let progress = currentScroll / totalDistance;
      progress = Math.max(0, Math.min(1, progress));
      const moveAmount = 250; 
      
      const topTranslate = progress * moveAmount;
      const bottomTranslate = progress * -moveAmount;
  
      topRow.style.transform = `translateX(${topTranslate}px)`;
      bottomRow.style.transform = `translateX(${bottomTranslate}px)`;
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    new WymsScrollMarquee();
  });