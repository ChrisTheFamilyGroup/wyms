class WymsExplodingGallery {
    constructor() {
      this.sections = document.querySelectorAll('.js-exploding-section');
      if (!this.sections.length) return;
      this.init();
    }
  
    init() {
      this.calculateOffsets();
  
      window.addEventListener('resize', () => {
        this.calculateOffsets();
        this.onScroll();
      }, { passive: true });
  
      
      window.addEventListener('scroll', () => {
        requestAnimationFrame(() => this.onScroll());
      }, { passive: true });
  
      this.onScroll();
    }
  
    calculateOffsets() {
      this.sections.forEach(section => {
        const container = section.querySelector('.js-exploding-container');
        const items = section.querySelectorAll('.js-exploding-item');
        if (!container || !items.length) return;
  
        const containerRect = container.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
  
        items.forEach(item => {
          const wrapper = item.parentElement;
          const rect = wrapper.getBoundingClientRect();
          
          const itemCenterX = (rect.left - containerRect.left) + (rect.width / 2);
          const itemCenterY = (rect.top - containerRect.top) + (rect.height / 2);
  
          const moveX = centerX - itemCenterX;
          const moveY = centerY - itemCenterY;
  
          item.dataset.moveX = moveX;
          item.dataset.moveY = moveY;
        });
      });
    }
  
    onScroll() {
        const windowHeight = window.innerHeight;
    
        this.sections.forEach(section => {
          const rect = section.getBoundingClientRect();
          const items = section.querySelectorAll('.js-exploding-item');
          
          if (rect.top > windowHeight) return;

          const startPoint = windowHeight * 0.7; 
          const animationRange = windowHeight * 0.5;
    
          let progress = (startPoint - rect.top) / animationRange;
          
          progress = Math.max(0, Math.min(1, progress));
    
          const easeProgress = 1 - Math.pow(1 - progress, 3);
    
          items.forEach(item => {
            const moveX = parseFloat(item.dataset.moveX || 0);
            const moveY = parseFloat(item.dataset.moveY || 0);
    
            const currentX = moveX * (1 - easeProgress);
            const currentY = moveY * (1 - easeProgress);
            
            const scale = 0.5 + (0.5 * easeProgress);
            
            const opacity = 0.6 + (0.4 * easeProgress);
    
            item.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
            item.style.opacity = opacity.toFixed(2);
          });
        });
      }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    new WymsExplodingGallery();
  });