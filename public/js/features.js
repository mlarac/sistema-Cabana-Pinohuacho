document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.getElementById('gallery-lightbox');
  const img = document.getElementById('lightbox-img');
  const titleEl = document.getElementById('lightbox-title');
  const descEl = document.getElementById('lightbox-desc');
  const closeBtn = document.getElementById('lightbox-close');

  if (dialog && img) {
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

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });
  }
});
