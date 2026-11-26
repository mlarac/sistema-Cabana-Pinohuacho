// Main JavaScript for Cabaña Pino Huacho
document.addEventListener('DOMContentLoaded', () => {
  initializeBootstrapComponents();
  setupSmoothScrolling();
  setupNavbarScrollEffect();
  setupAccessibleFormValidation();
  setupBackButtons();
});

function initializeBootstrapComponents() {
  if (typeof bootstrap === 'undefined') return;

  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    new bootstrap.Tooltip(el);
  });

  document.querySelectorAll('[data-bs-toggle="popover"]').forEach((el) => {
    new bootstrap.Popover(el);
  });
}

function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function setupNavbarScrollEffect() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener(
    'scroll',
    () => {
      navbar.classList.toggle('navbar-scrolled', window.scrollY > 50);
    },
    { passive: true }
  );
}

function setupBackButtons() {
  document.querySelectorAll('[data-action="go-back"]').forEach((btn) => {
    btn.addEventListener('click', () => window.history.back());
  });
}

function setupAccessibleFormValidation() {
  const fields = document.querySelectorAll('input[data-error], select[data-error], textarea[data-error]');
  if (fields.length === 0) return;

  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.className = 'visually-hidden';
  document.body.appendChild(announcer);

  let announceTimer;
  let announcedField;
  const flagged = new WeakSet();
  const announced = new WeakSet();

  const linkError = (el, shown) => {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const ids = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  };

  const announceError = (el) => {
    const errorEl = document.getElementById(el.dataset.error);
    if (!errorEl) return;
    const label = el.labels?.[0] ? `${el.labels[0].textContent.trim()}: ` : '';
    clearTimeout(announceTimer);
    announcer.textContent = '';
    announcedField = el;
    announceTimer = setTimeout(() => {
      announcer.textContent = label + errorEl.textContent.replace(/\s+/g, ' ').trim();
    }, 500);
  };

  const supportsUserInvalid = typeof CSS !== 'undefined' && CSS.supports('selector(:user-invalid)');
  const dirtyState = new WeakMap();

  const syncField = (el, shouldAnnounce = false) => {
    if (!el || !el.matches?.('input[data-error], select[data-error], textarea[data-error]')) return;
    let invalid = false;

    if (supportsUserInvalid) {
      invalid = el.matches(':user-invalid');
    } else {
      const state = dirtyState.get(el);
      if (state && state.hasInteracted && state.hasBlurred) {
        invalid = !el.validity.valid;
        el.classList.toggle('user-invalid-fallback', invalid);
        el.classList.toggle('user-valid-fallback', !invalid);
      }
    }

    if (invalid) {
      if (shouldAnnounce && !announced.has(el)) {
        announceError(el);
        announced.add(el);
      }
      el.setAttribute('aria-invalid', 'true');
      linkError(el, true);
      flagged.add(el);
    } else if (flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
      el.setAttribute('aria-invalid', 'false');
      linkError(el, false);
      flagged.delete(el);
      announced.delete(el);
      if (announcedField === el) {
        clearTimeout(announceTimer);
        announcer.textContent = '';
      }
    }
  };

  fields.forEach((el) => el.setAttribute('aria-invalid', 'false'));

  document.addEventListener(
    'blur',
    (e) => {
      if (!supportsUserInvalid && e.target?.matches?.('[data-error]')) {
        const st = dirtyState.get(e.target) || { hasInteracted: false, hasBlurred: false };
        st.hasBlurred = true;
        dirtyState.set(e.target, st);
      }
      syncField(e.target, true);
    },
    true
  );

  document.addEventListener('input', (e) => {
    if (!supportsUserInvalid && e.target?.matches?.('[data-error]')) {
      const st = dirtyState.get(e.target) || { hasInteracted: false, hasBlurred: false };
      st.hasInteracted = true;
      dirtyState.set(e.target, st);
    }
    if (e.target?.hasAttribute?.('aria-invalid')) {
      syncField(e.target, false);
    }
  });

  document.addEventListener(
    'change',
    (e) => syncField(e.target, true),
    true
  );

  document.addEventListener(
    'invalid',
    (e) => {
      if (!supportsUserInvalid && e.target?.matches?.('[data-error]')) {
        dirtyState.set(e.target, { hasInteracted: true, hasBlurred: true });
      }
      announced.add(e.target);
      syncField(e.target, false);
    },
    true
  );
}

function showAlert(type, message, duration = 5000) {
  const alertContainer = document.getElementById('alert-container') || createAlertContainer();

  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.setAttribute('role', 'alert');

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn-close';
  closeBtn.setAttribute('data-bs-dismiss', 'alert');
  closeBtn.setAttribute('aria-label', 'Cerrar');

  alertDiv.appendChild(textSpan);
  alertDiv.appendChild(closeBtn);
  alertContainer.appendChild(alertDiv);

  setTimeout(() => {
    if (alertDiv.parentNode) alertDiv.remove();
  }, duration);
}

function createAlertContainer() {
  const container = document.createElement('div');
  container.id = 'alert-container';
  container.style.position = 'fixed';
  container.style.top = '80px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  container.style.maxWidth = '400px';
  document.body.appendChild(container);
  return container;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

function formatYMDToCL(ymd) {
  if (!ymd || typeof ymd !== 'string') return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

window.CabinUtils = {
  showAlert,
  formatCurrency,
  formatYMDToCL,
  getCsrfToken
};
