
class WymsProductDesc extends HTMLElement {
  connectedCallback() {
    const triggers = this.querySelectorAll('.js-faq-trigger');
    if (!triggers.length) return;

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.js-faq-item');
        if (!item) return;

        const isOpen = item.classList.contains('is-open');

        this.querySelectorAll('.js-faq-item.is-open').forEach((openItem) => {
          openItem.classList.remove('is-open');
          const t = openItem.querySelector('.js-faq-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen) {
          item.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }
}

if (!customElements.get('wyms-product-desc')) {
  customElements.define('wyms-product-desc', WymsProductDesc);
}
