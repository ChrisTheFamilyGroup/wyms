class WymsMediaSwitcher {
    constructor() {
      this.container = document.querySelector('.js-switcher-section');
      if (!this.container) return;
  
      this.triggers = this.container.querySelectorAll('.js-switcher-trigger');
      this.mediaItems = this.container.querySelectorAll('.js-switcher-media');
  
      this.init();
    }
  
    init() {
      this.triggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
          const index = trigger.dataset.index;
          this.switch(index);
        });
      });
    }
  
    switch(index) {
      // 1. Update Triggers
      this.triggers.forEach((t) => {
        t.classList.toggle('is-active', t.dataset.index === index);
      });
  
      // 2. Update Media
      this.mediaItems.forEach((m) => {
        const isActive = m.dataset.index === index;
        m.classList.toggle('is-active', isActive);
  
        const video = m.querySelector('video');
        if (video) {
          if (isActive) {
            video.currentTime = 0;
            video.play();
          } else {
            video.pause();
          }
        }
      });
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    new WymsMediaSwitcher();
  });