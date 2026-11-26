// Main JavaScript for Cabaña Pino Huacho
document.addEventListener('DOMContentLoaded', () => {
  initializeBootstrapComponents();
  setupSmoothScrolling();
  setupNavbarScrollEffect();
  setupFormValidations();
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

function setupFormValidations() {
  document.querySelectorAll('.needs-validation').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    });
  });

  document.querySelectorAll('input[type="email"]').forEach((input) => {
    input.addEventListener('blur', validateEmail);
    input.addEventListener('input', clearValidationState);
  });

  document.querySelectorAll('input[type="tel"]').forEach((input) => {
    input.addEventListener('blur', validatePhone);
    input.addEventListener('input', clearValidationState);
  });
}

function validateEmail(event) {
  const email = event.target.value.trim();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email && !emailPattern.test(email)) {
    event.target.classList.add('is-invalid');
    showFieldError(event.target, 'Por favor ingrese un email válido');
  } else if (email) {
    event.target.classList.remove('is-invalid');
    event.target.classList.add('is-valid');
    hideFieldError(event.target);
  }
}

function validatePhone(event) {
  const phone = event.target.value.trim();
  // Acepta teléfonos chilenos e internacionales (ej. +56 9 1234 5678, +54 11..., 912345678)
  const phonePattern = /^\+?[\d\s\-()]{8,20}$/;

  if (phone && !phonePattern.test(phone)) {
    event.target.classList.add('is-invalid');
    showFieldError(event.target, 'Ingresa un teléfono válido (8 a 20 caracteres, ej. +56 9 1234 5678)');
  } else if (phone) {
    event.target.classList.remove('is-invalid');
    event.target.classList.add('is-valid');
    hideFieldError(event.target);
  }
}

function clearValidationState(event) {
  event.target.classList.remove('is-invalid', 'is-valid');
  hideFieldError(event.target);
}

function showFieldError(field, message) {
  let errorDiv = field.parentNode.querySelector('.invalid-feedback');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    field.parentNode.appendChild(errorDiv);
  }
  errorDiv.textContent = message;
}

function hideFieldError(field) {
  const errorDiv = field.parentNode.querySelector('.invalid-feedback');
  if (errorDiv) errorDiv.remove();
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
