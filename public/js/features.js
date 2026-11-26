document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.getElementById('gallery-lightbox');
  const img = document.getElementById('lightbox-img');
  const titleEl = document.getElementById('lightbox-title');
  const descEl = document.getElementById('lightbox-desc');
  const closeBtn = document.getElementById('lightbox-close');

  if (!dialog || !img) return;

  document.querySelectorAll('.gallery-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      img.src = trigger.dataset.lightboxSrc || trigger.dataset.lightboxFallback || '';
      img.alt = trigger.dataset.lightboxTitle || '';
      if (titleEl) titleEl.textContent = trigger.dataset.lightboxTitle || '';
      if (descEl) descEl.textContent = trigger.dataset.lightboxDesc || '';
      dialog.showModal();
    });
  });

  closeBtn?.addEventListener('click', () => dialog.close());

  // Fallback para navegadores sin soporte nativo de closedby="any" (ej. Safari)
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const clickedInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!clickedInside) {
        dialog.close();
      }
    });
  }
});
