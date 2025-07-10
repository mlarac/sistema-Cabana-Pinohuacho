// Main JavaScript for Pino Huacho Cabin Website
document.addEventListener('DOMContentLoaded', function() {
  // Initialize tooltips and other Bootstrap components
  initializeBootstrapComponents();
  
  // Set up smooth scrolling
  setupSmoothScrolling();
  
  // Initialize lazy loading for images
  setupLazyLoading();
  
  // Add navbar scroll effect
  setupNavbarScrollEffect();
  
  // Initialize form validations
  setupFormValidations();
});

function initializeBootstrapComponents() {
  // Initialize all tooltips
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Initialize all popovers
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });
}

function setupSmoothScrolling() {
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

function setupLazyLoading() {
  // Simple lazy loading implementation
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });

  images.forEach(img => imageObserver.observe(img));
}

function setupNavbarScrollEffect() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      navbar.classList.add('navbar-scrolled');
    } else {
      navbar.classList.remove('navbar-scrolled');
    }
  });
}

function setupFormValidations() {
  // Add custom validation styles and feedback
  const forms = document.querySelectorAll('.needs-validation');
  
  Array.prototype.slice.call(forms).forEach(function(form) {
    form.addEventListener('submit', function(event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });

  // Real-time validation for email fields
  const emailInputs = document.querySelectorAll('input[type="email"]');
  emailInputs.forEach(input => {
    input.addEventListener('blur', validateEmail);
    input.addEventListener('input', clearValidationState);
  });

  // Real-time validation for phone fields
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach(input => {
    input.addEventListener('blur', validatePhone);
    input.addEventListener('input', clearValidationState);
  });
}

function validateEmail(event) {
  const email = event.target.value;
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
  const phone = event.target.value;
  const phonePattern = /^(\+56|56)?[\s-]?[9]\d{8}$/;
  
  if (phone && !phonePattern.test(phone.replace(/[\s-]/g, ''))) {
    event.target.classList.add('is-invalid');
    showFieldError(event.target, 'Por favor ingrese un teléfono válido (+56 9 XXXX XXXX)');
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
  if (errorDiv) {
    errorDiv.remove();
  }
}

// Utility functions
function showAlert(type, message, duration = 5000) {
  const alertContainer = document.getElementById('alert-container') || createAlertContainer();
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  alertContainer.appendChild(alertDiv);
  
  // Auto remove after duration
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, duration);
}

function createAlertContainer() {
  const container = document.createElement('div');
  container.id = 'alert-container';
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  container.style.maxWidth = '400px';
  document.body.appendChild(container);
  return container;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(amount);
}

function formatDate(date, options = {}) {
  const defaultOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date(date).toLocaleDateString('es-CL', { ...defaultOptions, ...options });
}

// Loading states
function showLoading(element) {
  if (typeof element === 'string') {
    element = document.querySelector(element);
  }
  if (element) {
    element.classList.add('loading');
    const loader = document.createElement('div');
    loader.className = 'spinner-border spinner-border-sm me-2';
    loader.setAttribute('role', 'status');
    element.prepend(loader);
  }
}

function hideLoading(element) {
  if (typeof element === 'string') {
    element = document.querySelector(element);
  }
  if (element) {
    element.classList.remove('loading');
    const loader = element.querySelector('.spinner-border');
    if (loader) {
      loader.remove();
    }
  }
}

// Export functions for use in other scripts
window.CabinUtils = {
  showAlert,
  formatCurrency,
  formatDate,
  showLoading,
  hideLoading
};