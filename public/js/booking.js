
class BookingForm {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.pricePerNight = 50000;
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupValidation();
    // If dates are prefilled, trigger pricing update
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    if (checkInInput && checkOutInput && checkInInput.value && checkOutInput.value) {
      this.updatePricing();
    }
  }

  bindEvents() {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');

    checkInInput?.addEventListener('change', () => this.handleCheckInChange());
    checkOutInput?.addEventListener('change', () => this.updatePricing());
    
    document.getElementById('bookingForm')?.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  setupValidation() {
    // Additional validation setup if needed
  }

  handleCheckInChange() {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    
    const checkInDate = new Date(checkInInput.value);
    checkInDate.setDate(checkInDate.getDate() + 1);
    checkOutInput.min = checkInDate.toISOString().split('T')[0];
    
    this.updatePricing();
  }

  updatePricing() {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    
    const checkIn = new Date(checkInInput.value);
    const checkOut = new Date(checkOutInput.value);

    if (checkIn && checkOut && checkOut > checkIn) {
      this.loadCalendarAvailability(checkIn, checkOut);
    }
  }

  async loadCalendarAvailability(startDate, endDate) {
    try {
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;

      const response = await fetch(`/api/availability/${year}/${month.toString().padStart(2, '0')}`);
      const data = await response.json();
      
      this.displayCalendar(data, startDate, endDate);
    } catch (error) {
      console.error('Error loading availability:', error);
    }
  }

  displayCalendar(availability, selectedStart, selectedEnd) {
    const calendarContainer = document.getElementById('calendar-preview');
    
    let conflictFound = false;
    const current = new Date(selectedStart);
    
    while (current < selectedEnd) {
      const dateStr = current.toISOString().split('T')[0];
      if (availability[dateStr] === 'occupied' || availability[dateStr] === 'maintenance') {
        conflictFound = true;
        break;
      }
      current.setDate(current.getDate() + 1);
    }

    let html = '';
    if (conflictFound) {
      html = '<div class="alert alert-danger">⚠️ Algunas fechas seleccionadas no están disponibles</div>';
    } else if (selectedStart && selectedEnd) {
      html = '<div class="alert alert-success">✅ Las fechas seleccionadas están disponibles</div>';
    } else {
      html = '<p class="text-center text-muted">Selecciona las fechas para ver la disponibilidad</p>';
    }

    calendarContainer.innerHTML = html;
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      if (!this.validateStep(this.currentStep)) {
        return;
      }

      this.hideCurrentStep();
      this.currentStep++;
      this.showCurrentStep();

      if (this.currentStep === 3) {
        this.updateSummary();
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.hideCurrentStep();
      this.currentStep--;
      this.showCurrentStep();
    }
  }

  hideCurrentStep() {
    document.getElementById(`step-${this.currentStep}`).style.display = 'none';
    document.querySelector(`.step:nth-child(${this.currentStep * 2 - 1})`).classList.remove('active');
  }

  showCurrentStep() {
    document.getElementById(`step-${this.currentStep}`).style.display = 'block';
    document.querySelector(`.step:nth-child(${this.currentStep * 2 - 1})`).classList.add('active');
  }

  validateStep(step) {
    const validators = {
      1: () => this.validateDates(),
      2: () => this.validateGuestInfo()
    };

    return validators[step] ? validators[step]() : true;
  }

  validateDates() {
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const guests = document.getElementById('guests').value;
    
    if (!checkIn || !checkOut || !guests) {
      this.showAlert('warning', '⚠️ Por favor completa todos los campos de fechas');
      return false;
    }
    
    if (new Date(checkOut) <= new Date(checkIn)) {
      this.showAlert('warning', '⚠️ La fecha de salida debe ser posterior a la fecha de entrada');
      return false;
    }
    
    return true;
  }

  validateGuestInfo() {
    const name = document.getElementById('guestName').value;
    const email = document.getElementById('guestEmail').value;
    const phone = document.getElementById('guestPhone').value;
    
    if (!name || !email || !phone) {
      this.showAlert('warning', '⚠️ Por favor completa todos los campos obligatorios');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.showAlert('warning', '⚠️ Por favor ingresa un email válido');
      return false;
    }
    
    return true;
  }

  updateSummary() {
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const guests = document.getElementById('guests').value;
    const name = document.getElementById('guestName').value;
    const email = document.getElementById('guestEmail').value;
    const phone = document.getElementById('guestPhone').value;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 3600 * 24));

    const formatUTCDate = (date) => {
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    };

    // Update summary fields
    this.updateSummaryField('summary-name', name);
    this.updateSummaryField('summary-email', email);
    this.updateSummaryField('summary-phone', phone);
    this.updateSummaryField('summary-checkin', formatUTCDate(checkInDate));
    this.updateSummaryField('summary-checkout', formatUTCDate(checkOutDate));
    this.updateSummaryField('summary-guests', guests + (guests == 1 ? ' persona' : ' personas'));
    this.updateSummaryField('summary-nights', nights);

    // Fetch dynamic price range
    fetch(`/api/precio/range?checkIn=${checkIn}&checkOut=${checkOut}`)
      .then(res => res.json())
      .then(data => {
        const total = data.totalPrice;
        const avgPrice = data.averagePrice;
        
        this.updateSummaryField('summary-price-per-night', new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP'
        }).format(avgPrice) + ' CLP');
        
        this.updateSummaryField('summary-total', new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP'
        }).format(total) + ' CLP');
      })
      .catch((err) => {
        console.error('Error fetching range price:', err);
        const total = nights * this.pricePerNight;
        this.updateSummaryField('summary-price-per-night', new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP'
        }).format(this.pricePerNight) + ' CLP');
        
        this.updateSummaryField('summary-total', new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP'
        }).format(total) + ' CLP');
      });
  }

  updateSummaryField(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  handleSubmit(e) {
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    
    if (new Date(checkOut) <= new Date(checkIn)) {
      e.preventDefault();
      this.showAlert('danger', '⚠️ La fecha de salida debe ser posterior a la fecha de entrada');
    }
  }

  showAlert(type, message) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => {
      if (alert.classList.contains('alert-dismissible')) {
        alert.remove();
      }
    });

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.card-body');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 5000);
  }
}

// Global functions for backward compatibility
let bookingForm;

function nextStep() {
  if (bookingForm) {
    bookingForm.nextStep();
  }
}

function prevStep() {
  if (bookingForm) {
    bookingForm.prevStep();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  bookingForm = new BookingForm();
});