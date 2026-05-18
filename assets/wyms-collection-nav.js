/**
 * Horizontal collection nav — drag-to-scroll (mouse only).
 * Touch uses native CSS overflow scrolling (no JS needed).
 * Strategy: mouse events only, no setPointerCapture, no click interception.
 * During drag we set pointer-events:none on buttons so they don't interfere,
 * then restore after mouseup.
 */
class WymsCollectionNav extends HTMLElement {
  connectedCallback() {
    const track =
      this.querySelector('[data-wyms-scroll-track]') ||
      this.querySelector('.collection-nav__buttons-wrapper') ||
      this.querySelector('.collection-nav__buttons');

    if (!(track instanceof HTMLElement)) return;
    this._scrollTrack = track;
    this._initDrag(track);
  }

  disconnectedCallback() {
    if (this._scrollTrack) {
      this._scrollTrack.removeEventListener('mousedown', this._onMouseDown);
    }
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
  }

  _initDrag(track) {
    const DRAG_THRESHOLD = 5;
    let startX = 0;
    let scrollStart = 0;
    let dragging = false;
    let moved = false;

    this._onMouseDown = (e) => {
      if (e.button !== 0) return;
      startX = e.clientX;
      scrollStart = track.scrollLeft;
      dragging = true;
      moved = false;
      track.style.scrollBehavior = 'auto';
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('mouseup', this._onMouseUp);
    };

    this._onMouseMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > DRAG_THRESHOLD) {
        moved = true;
        track.classList.add('is-dragging');
        track.querySelectorAll('.collection-nav__btn').forEach(btn => {
          btn.style.pointerEvents = 'none';
        });
      }
      if (moved) {
        track.scrollLeft = scrollStart - dx * 1.1;
      }
    };

    this._onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      track.style.scrollBehavior = '';
      track.classList.remove('is-dragging');
      track.querySelectorAll('.collection-nav__btn').forEach(btn => {
        btn.style.pointerEvents = '';
      });
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('mouseup', this._onMouseUp);
    };

    track.addEventListener('mousedown', this._onMouseDown);
  }
}

if (!customElements.get('wyms-collection-nav')) {
  customElements.define('wyms-collection-nav', WymsCollectionNav);
}