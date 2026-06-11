(function () {
  'use strict';

  const SECTION_SELECTOR = '.wyms-scroll-stack';
  const CARD_TRACK_SELECTOR = '.wyms-scroll-stack__card-track';
  const CARD_SELECTOR = '.wyms-scroll-stack__card';
  const MOBILE_BREAKPOINT = 767;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function getViewportHeight() {
    return Math.round(window.visualViewport?.height || window.innerHeight);
  }

  class WymsScrollStack {
    /**
     * @param {HTMLElement} section
     */
    constructor(section) {
      this.section = section;
      this.track = section.querySelector(CARD_TRACK_SELECTOR);
      this.cards = Array.from(section.querySelectorAll(CARD_SELECTOR));
      this._resizeRaf = 0;

      if (!this.track || !this.cards.length) return;

      this._assignZIndices();
      this._applyLayout();
      this._bindResize();
    }

    _assignZIndices() {
      this.cards.forEach((card, index) => {
        card.style.zIndex = String(10 + index);
      });
    }

    _clearInlineSizes() {
      if (this.track) this.track.style.height = '';
      this.cards.forEach((card) => {
        card.style.height = '';
      });
      this.section.style.minHeight = '';
    }

    _applyLayout() {
      if (isMobile()) {
        this._applyMobileLayout();
        return;
      }
      this._applyDesktopLayout();
    }

    /**
     * Desktop: one tall track (cards × 100vh); each card sticky at top: 0.
     * Section minHeight = cards × 100vh — no extra trailing space.
     */
    _applyDesktopLayout() {
      const vh = getViewportHeight();
      const cardCount = this.cards.length;
      const stackHeight = cardCount * vh;

      this.track.style.height = `${stackHeight}px`;
      this.cards.forEach((card) => {
        card.style.height = `${vh}px`;
      });
      this.section.style.minHeight = `${stackHeight}px`;
    }

    /**
     * Mobile: track/card heights from CSS (812px per card). No JS minHeight.
     */
    _applyMobileLayout() {
      this.track.style.height = '';
      this.cards.forEach((card) => {
        card.style.height = '';
      });
      this.section.style.minHeight = '';
    }

    _bindResize() {
      const onResize = () => {
        cancelAnimationFrame(this._resizeRaf);
        this._resizeRaf = requestAnimationFrame(() => {
          this._resizeRaf = 0;
          this._applyLayout();
        });
      };

      this._onResize = onResize;
      window.addEventListener('resize', onResize, { passive: true });
      window.visualViewport?.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('load', onResize, { passive: true, once: true });
    }

    destroy() {
      cancelAnimationFrame(this._resizeRaf);
      if (this._onResize) {
        window.removeEventListener('resize', this._onResize);
        window.visualViewport?.removeEventListener('resize', this._onResize);
      }
      this._clearInlineSizes();
      delete this.section._wymsScrollStack;
    }
  }

  function initSection(section) {
    if (!(section instanceof HTMLElement)) return;
    if (section._wymsScrollStack) section._wymsScrollStack.destroy();
    section._wymsScrollStack = new WymsScrollStack(section);
  }

  function initAll() {
    document.querySelectorAll(SECTION_SELECTOR).forEach(initSection);
  }

  document.addEventListener('shopify:section:load', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const section = target.matches(SECTION_SELECTOR)
      ? target
      : target.querySelector(SECTION_SELECTOR);
    if (section) initSection(section);
  });

  document.addEventListener('shopify:section:unload', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const section = target.matches(SECTION_SELECTOR)
      ? target
      : target.querySelector(SECTION_SELECTOR);
    if (section?._wymsScrollStack) section._wymsScrollStack.destroy();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
