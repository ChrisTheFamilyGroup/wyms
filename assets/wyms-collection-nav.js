/**
 * Horizontal collection nav: scrollport is [data-wyms-scroll-track] (fallback: .collection-nav__buttons-wrapper → .collection-nav__buttons).
 * Drag-to-scroll is mouse-only; touch uses native overflow scrolling (WebKit-friendly).
 */
class WymsCollectionNav extends HTMLElement {
  constructor() {
    super();
    /** @type {boolean} */
    this._dragging = false;
    /** @type {number} */
    this._startX = 0;
    /** @type {number} */
    this._scrollStart = 0;
    /** @type {boolean} */
    this._hasMoved = false;
    /** @type {number | undefined} */
    this._activePointerId = undefined;
    /** @type {((e: PointerEvent) => void) | undefined} */
    this._boundPointerMove = undefined;
    /** @type {((e: PointerEvent) => void) | undefined} */
    this._boundPointerUp = undefined;
  }

  connectedCallback() {
    const track =
      this.querySelector('[data-wyms-scroll-track]') ||
      this.querySelector('.collection-nav__buttons-wrapper') ||
      this.querySelector('.collection-nav__buttons');

    if (!(track instanceof HTMLElement)) return;

    this._scrollTrack = track;
    this.initDragToScroll(track);
    this._maybeDebugScrollMetrics(track);
  }

  /** Append ?wymsDebugNav=1 to the URL to log scroll metrics (layout / Theme Editor). */
  /** @param {HTMLElement} track */
  _maybeDebugScrollMetrics(track) {
    try {
      if (typeof URLSearchParams === 'undefined') return;
      if (!new URLSearchParams(window.location.search).has('wymsDebugNav')) return;
      const log = () => {
        const sw = track.scrollWidth;
        const cw = track.clientWidth;
        console.info('[wyms-collection-nav]', {
          scrollWidth: sw,
          clientWidth: cw,
          canScroll: sw > cw + 1,
          track: track.className,
        });
      };
      requestAnimationFrame(log);
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => requestAnimationFrame(log));
        ro.observe(track);
      }
    } catch {
      /* ignore */
    }
  }

  disconnectedCallback() {
    const track = this._scrollTrack;
    if (track && this._boundPointerMove && this._boundPointerUp) {
      track.removeEventListener('pointermove', this._boundPointerMove);
      track.removeEventListener('pointerup', this._boundPointerUp);
      track.removeEventListener('pointercancel', this._boundPointerUp);
    }
  }

  /**
   * @param {HTMLElement} track
   */
  initDragToScroll(track) {
    const DRAG_THRESHOLD = 5;

    const endDrag = () => {
      if (!this._dragging) return;
      this._dragging = false;
      if (this._activePointerId !== undefined && track.hasPointerCapture(this._activePointerId)) {
        try {
          track.releasePointerCapture(this._activePointerId);
        } catch {
          /* ignore */
        }
      }
      this._activePointerId = undefined;
      requestAnimationFrame(() => {
        track.classList.remove('is-dragging');
      });
      track.style.scrollBehavior = '';
      if (this._boundPointerMove) {
        track.removeEventListener('pointermove', this._boundPointerMove);
      }
      if (this._boundPointerUp) {
        track.removeEventListener('pointerup', this._boundPointerUp);
        track.removeEventListener('pointercancel', this._boundPointerUp);
      }
      this._boundPointerMove = undefined;
      this._boundPointerUp = undefined;
    };

    track.addEventListener(
      'pointerdown',
      (e) => {
        // Touch: rely on CSS overflow-x + OS momentum scrolling. Pointer capture +
        // preventDefault on move fights native scrolling on WebKit (strip feels “stuck”).
        if (e.pointerType === 'touch') return;
        if (e.button !== undefined && e.button !== 0) return;
        this._dragging = true;
        this._hasMoved = false;
        this._startX = e.clientX;
        this._scrollStart = track.scrollLeft;
        track.style.scrollBehavior = 'auto';
        this._activePointerId = e.pointerId;
        try {
          track.setPointerCapture(e.pointerId);
        } catch {
          /* older browsers */
        }

        this._boundPointerMove = (moveEv) => {
          if (moveEv.pointerId !== this._activePointerId) return;
          const dx = moveEv.clientX - this._startX;
          if (Math.abs(dx) > DRAG_THRESHOLD) {
            this._hasMoved = true;
            track.classList.add('is-dragging');
            moveEv.preventDefault();
          }
          if (this._hasMoved) {
            track.scrollLeft = this._scrollStart - dx * 1.1;
          }
        };

        this._boundPointerUp = (upEv) => {
          if (upEv.pointerId !== this._activePointerId) return;
          endDrag();
        };

        track.addEventListener('pointermove', this._boundPointerMove, { passive: false });
        track.addEventListener('pointerup', this._boundPointerUp);
        track.addEventListener('pointercancel', this._boundPointerUp);
      },
      { passive: true }
    );

    track.addEventListener(
      'click',
      (e) => {
        if (this._hasMoved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  }
}

if (!customElements.get('wyms-collection-nav')) {
  customElements.define('wyms-collection-nav', WymsCollectionNav);
}
