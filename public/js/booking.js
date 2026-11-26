class BookingForm {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.rangeIsAvailable = false;
    this.lastCheckedKey = '';
    const form = document.getElementById('bookingForm');
    this.defaultPrice = Number(form?.dataset.defaultPrice) || 50000;
    this.init();
  }

  init() {
    this.bindEvents();
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    if (checkInInput?.value && checkOutInput?.value) {
      this.checkRangeAvailability();
    }
  }

  bindEvents() {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');

    checkInInput?.addEventListener('change', () => this.handleCheckInChange());
    checkOutInput?.addEventListener('change', () => this.checkRangeAvailability());

    document.querySelectorAll('[data-action="next-step"]').forEach((btn) => {
      btn.addEventListener('click', () => this.nextStep());
    });

    document.querySelectorAll('[data-action="prev-step"]').forEach((btn) => {
      btn.addEventListener('click', () => this.prevStep());
    });

    document.getElementById('bookingForm')?.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  addOneDayYMD(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + 1));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  }

  handleCheckInChange() {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    if (!checkInInput?.value) return;

    const minOut = this.addOneDayYMD(checkInInput.value);
    checkOutInput.min = minOut;
    if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
      checkOutInput.value = minOut;
    }

    this.checkRangeAvailability();
  }

  async checkRangeAvailability() {
    const checkIn = document.getElementById('checkIn')?.value;
    const checkOut = document.getElementById('checkOut')?.value;
    const preview = document.getElementById('calendar-preview');
    if (!preview) return;

    this.rangeIsAvailable = false;

    if (!checkIn || !checkOut) {
      preview.innerHTML = '<p class="text-center text-muted mb-0">Selecciona las fechas para verificar disponibilidad</p>';
      return false;
    }

    if (checkOut <= checkIn) {
      preview.innerHTML = '<div class="alert alert-warning mb-0">⚠️ La fecha de salida debe ser posterior a la fecha de entrada</div>';
      return false;
    }

    preview.innerHTML = '<div class="text-center text-muted">Verificando disponibilidad...</div>';

    try {
      const [availRes, priceRes] = await Promise.all([
        fetch(`/api/availability/range?start=${encodeURIComponent(checkIn)}&end=${encodeURIComponent(checkOut)}`),
        fetch(`/api/precio/range?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`)
      ]);

      const availData = await availRes.json();
      const priceData = await priceRes.json();

      if (!availRes.ok) {
        preview.innerHTML = '';
        const errBox = document.createElement('div');
        errBox.className = 'alert alert-danger mb-0';
        errBox.textContent = availData.error || 'Error verificando fechas';
        preview.appendChild(errBox);
        return false;
      }

      if (!availData.available) {
        const conflictFormatted = (availData.conflictDates || [])
          .slice(0, 5)
          .map((d) => window.CabinUtils.formatYMDToCL(d))
          .join(', ');
        preview.innerHTML = '';
        const errBox = document.createElement('div');
        errBox.className = 'alert alert-danger mb-0';
        errBox.textContent = `⚠️ Fechas no disponibles (${conflictFormatted}). Elige otro rango.`;
        preview.appendChild(errBox);
        this.rangeIsAvailable = false;
        return false;
      }

      this.rangeIsAvailable = true;
      this.lastCheckedKey = `${checkIn}|${checkOut}`;
      const formattedTotal = window.CabinUtils.formatCurrency(priceData.totalPrice || 0);
      preview.innerHTML = '';
      const okBox = document.createElement('div');
      okBox.className = 'alert alert-success mb-0';
      okBox.textContent = `✅ Disponible (${priceData.nights} ${priceData.nights === 1 ? 'noche' : 'noches'}) — Total estimado: ${formattedTotal} CLP`;
      preview.appendChild(okBox);
      return true;
    } catch (error) {
      console.error('Error checking availability:', error);
      preview.innerHTML = '<div class="alert alert-danger mb-0">Error de conexión al verificar disponibilidad.</div>';
      return false;
    }
  }

  async nextStep() {
    if (this.currentStep >= this.totalSteps) return;
    const valid = await this.validateStep(this.currentStep);
    if (!valid) return;

    this.setStepVisibility(this.currentStep, false);
    this.currentStep++;
    this.setStepVisibility(this.currentStep, true);

    if (this.currentStep === 3) {
      await this.updateSummary();
    }
  }

  prevStep() {
    if (this.currentStep <= 1) return;
    this.setStepVisibility(this.currentStep, false);
    this.currentStep--;
    this.setStepVisibility(this.currentStep, true);
  }

  setStepVisibility(stepNum, visible) {
    const stepEl = document.getElementById(`step-${stepNum}`);
    const indicator = document.querySelector(`[data-step-indicator="${stepNum}"]`);
    if (stepEl) stepEl.classList.toggle('d-none', !visible);
    if (indicator) indicator.classList.toggle('active', visible);
  }

  async validateStep(step) {
    if (step === 1) return this.validateDates();
    if (step === 2) return this.validateGuestInfo();
    return true;
  }

  async validateDates() {
    const checkIn = document.getElementById('checkIn')?.value;
    const checkOut = document.getElementById('checkOut')?.value;
    const guests = document.getElementById('guests')?.value;

    if (!checkIn || !checkOut || !guests) {
      window.CabinUtils.showAlert('warning', 'Por favor completa fechas y número de huéspedes');
      return false;
    }

    if (checkOut <= checkIn) {
      window.CabinUtils.showAlert('warning', 'La fecha de salida debe ser posterior a la fecha de entrada');
      return false;
    }

    if (this.lastCheckedKey !== `${checkIn}|${checkOut}` || !this.rangeIsAvailable) {
      const ok = await this.checkRangeAvailability();
      if (!ok) {
        window.CabinUtils.showAlert('danger', 'Las fechas seleccionadas no están disponibles');
        return false;
      }
    }

    return true;
  }

  validateGuestInfo() {
    const name = document.getElementById('guestName')?.value.trim();
    const email = document.getElementById('guestEmail')?.value.trim();
    const phone = document.getElementById('guestPhone')?.value.trim();

    if (!name || name.length < 2 || !email || !phone) {
      window.CabinUtils.showAlert('warning', 'Por favor completa todos los datos obligatorios');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      window.CabinUtils.showAlert('warning', 'Por favor ingresa un email válido');
      return false;
    }

    const phoneRegex = /^\+?[\d\s\-()]{8,20}$/;
    if (!phoneRegex.test(phone)) {
      window.CabinUtils.showAlert('warning', 'Por favor ingresa un número de teléfono válido');
      return false;
    }

    return true;
  }

  async updateSummary() {
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const guests = document.getElementById('guests').value;
    const name = document.getElementById('guestName').value.trim();
    const email = document.getElementById('guestEmail').value.trim();
    const phone = document.getElementById('guestPhone').value.trim();

    this.setText('summary-name', name);
    this.setText('summary-email', email);
    this.setText('summary-phone', phone);
    this.setText('summary-checkin', window.CabinUtils.formatYMDToCL(checkIn));
    this.setText('summary-checkout', window.CabinUtils.formatYMDToCL(checkOut));
    this.setText('summary-guests', `${guests} ${Number(guests) === 1 ? 'persona' : 'personas'}`);

    try {
      const res = await fetch(
        `/api/precio/range?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');

      this.setText('summary-nights', String(data.nights));
      this.setText('summary-price-per-night', `${window.CabinUtils.formatCurrency(data.averagePrice)} CLP`);
      this.setText('summary-total', `${window.CabinUtils.formatCurrency(data.totalPrice)} CLP`);

      const breakdownEl = document.getElementById('summary-breakdown');
      if (breakdownEl && Array.isArray(data.prices) && data.prices.length > 0) {
        breakdownEl.innerHTML = '';
        const list = document.createElement('div');
        list.textContent =
          'Desglose: ' +
          data.prices
            .map((p) => `${window.CabinUtils.formatYMDToCL(p.date)}: ${window.CabinUtils.formatCurrency(p.price)}`)
            .join(' · ');
        breakdownEl.appendChild(list);
      }
    } catch (error) {
      console.error('Error fetching price summary:', error);
    }
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  handleSubmit(e) {
    const checkIn = document.getElementById('checkIn')?.value;
    const checkOut = document.getElementById('checkOut')?.value;

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      e.preventDefault();
      window.CabinUtils.showAlert('danger', 'La fecha de salida debe ser posterior a la fecha de entrada');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('bookingForm')) {
    new BookingForm();
  }
});
