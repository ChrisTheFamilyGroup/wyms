class WymsValuesScroll {
    constructor() {
      this.sections = document.querySelectorAll('.js-values-section');
      if (!this.sections.length) return;
  
      this.isScrolling = null;
      this.init();
    }
  
    init() {
      const onScroll = () => {
        this.sections.forEach(section => this.processSection(section));
        
        clearTimeout(this.isScrolling);
        this.isScrolling = setTimeout(() => {
          this.sections.forEach(section => this.snapToClosest(section));
        }, 150); 
      };
  
      window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
      window.addEventListener('resize', () => requestAnimationFrame(onScroll), { passive: true });
      
      onScroll();
    }
  
    processSection(section) {
      const track = section.querySelector('.js-values-track');
      const items = section.querySelectorAll('.js-value-item');
      
      if (!track || items.length < 2) return;
  
      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
  
      
      const scrollDistance = rect.height - windowHeight;
      if (scrollDistance <= 0) return;
  
      if (rect.top > windowHeight || rect.bottom < 0) return;
  
      let progress = (0 - rect.top) / scrollDistance;
      progress = Math.max(0, Math.min(1, progress)); 
  
      
      const firstItemTop = items[0].getBoundingClientRect().top;
      const lastItemTop = items[items.length - 1].getBoundingClientRect().top;
      
      const maxTranslate = Math.abs(lastItemTop - firstItemTop); 
      const currentTranslate = progress * maxTranslate;
      
      track.style.transform = `translateY(-${currentTranslate}px)`;
  
      const activeFloat = progress * (items.length - 1);
  
      items.forEach((item, index) => {
        const distance = Math.abs(activeFloat - index);
        let opacity = 0.1;
  
        if (distance < 1) {
          opacity = 1 - (distance * 0.5); 
        } else if (distance < 2) {
          opacity = 0.5 - ((distance - 1) * 0.3); 
        } else if (distance < 3) {
          opacity = 0.2 - ((distance - 2) * 0.1); 
        } else {
          opacity = 0.1;
        }
  
        item.style.opacity = opacity.toFixed(2);
      });
    }
  
    snapToClosest(section) {
      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
  
      if (rect.top > 0 || rect.bottom < windowHeight) return;
  
      const itemsCount = section.querySelectorAll('.js-value-item').length;
      if (itemsCount <= 1) return;
  
      const scrollDistance = rect.height - windowHeight;
      if (scrollDistance <= 0) return;
  
      const progress = (0 - rect.top) / scrollDistance;
      const activeFloat = progress * (itemsCount - 1);
  
      const closestIndex = Math.round(activeFloat);
      const difference = Math.abs(closestIndex - activeFloat);
  
      if (difference > 0.05 && difference < 0.45) {
        const targetProgress = closestIndex / (itemsCount - 1);
        const absoluteSectionTop = window.scrollY + rect.top;
        const targetScrollY = absoluteSectionTop + (targetProgress * scrollDistance);
  
        window.scrollTo({
          top: targetScrollY,
          behavior: 'smooth'
        });
      }
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    new WymsValuesScroll();
  });