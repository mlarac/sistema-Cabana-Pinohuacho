// ==========================================
// Calendar — Premium Interactive Engine
// ==========================================

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let availabilityData = {};
let pricesData = {};
let selectedDates = [];
let pricePerNight = 50000;

// Fetch default price
function fetchPricePerNight() {
  return fetch('/api/precio')
    .then(res => res.json())
    .then(data => {
      if (data.price) pricePerNight = data.price;
    })
    .catch(() => { pricePerNight = 50000; });
}

document.addEventListener('DOMContentLoaded', function () {
  fetchPricePerNight().then(() => {
    loadCalendar();
  });

  // Scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  document.querySelectorAll('.feature-card, .gallery-item, .activity-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
});

// ---- Calendar Core ----

function loadCalendar() {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  document.getElementById('calendar-title').textContent =
    `${monthNames[currentMonth]} ${currentYear}`;

  // Disable prev button if current month
  const prevBtn = document.getElementById('btn-prev-month');
  const today = new Date();
  if (prevBtn) {
    prevBtn.disabled = (currentYear === today.getFullYear() && currentMonth === today.getMonth());
  }

  const grid = document.getElementById('availability-calendar');
  grid.classList.add('loading-fade');

  const monthStr = (currentMonth + 1).toString().padStart(2, '0');

  // Fetch availability and prices in parallel
  Promise.all([
    fetch(`/api/availability/${currentYear}/${monthStr}`).then(r => r.json()),
    fetch(`/api/precio/range?checkIn=${currentYear}-${monthStr}-01&checkOut=${currentYear}-${monthStr}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`)
      .then(r => r.ok ? r.json() : { prices: [] })
      .catch(() => ({ prices: [] }))
  ]).then(([avail, priceData]) => {
    availabilityData = avail;
    pricesData = {};
    if (priceData.prices) {
      priceData.prices.forEach(p => {
        pricesData[p.date] = p.price;
      });
    }
    renderCalendar();
    grid.classList.remove('loading-fade');
  }).catch(error => {
    console.error('Error loading calendar:', error);
    showCalendarError();
    grid.classList.remove('loading-fade');
  });
}

function renderCalendar() {
  const container = document.getElementById('availability-calendar');
  const firstDay = new Date(currentYear, currentMonth, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '';

  // Headers
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  dayNames.forEach((day, idx) => {
    const isWeekend = idx === 0 || idx === 6;
    html += `<div class="calendar-header ${isWeekend ? 'weekend-header' : ''}">${day}</div>`;
  });

  // Days
  const current = new Date(startDate);
  for (let week = 0; week < 6; week++) {
    let hasCurrentMonth = false;
    for (let day = 0; day < 7; day++) {
      const dateStr = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === currentMonth;
      const isToday = current.getTime() === today.getTime();
      const currentNorm = new Date(current);
      currentNorm.setHours(0, 0, 0, 0);
      const isPast = currentNorm < today;
      const status = availabilityData[dateStr] || 'available';

      if (isCurrentMonth) hasCurrentMonth = true;

      let classes = ['calendar-day'];
      if (!isCurrentMonth) classes.push('other-month');
      if (isToday) classes.push('today');

      if (isCurrentMonth && !isPast) {
        classes.push(status);
      } else if (isPast && isCurrentMonth) {
        classes.push('past');
      }

      const clickable = isCurrentMonth && !isPast && status === 'available';
      const onclick = clickable ? `onclick="selectDate('${dateStr}')"` : '';

      // Price label for available future dates
      let priceLabel = '';
      if (isCurrentMonth && !isPast && status === 'available') {
        const dayPrice = pricesData[dateStr] || pricePerNight;
        priceLabel = `<span class="day-price">${formatShortPrice(dayPrice)}</span>`;
      }

      // Status icon
      let statusIcon = '';
      if (isCurrentMonth && !isPast) {
        statusIcon = getStatusIcon(status);
      }

      const tooltip = isCurrentMonth ? getDateTooltip(current, status, isPast) : '';

      html += `<div class="${classes.join(' ')}"
                    data-date="${dateStr}"
                    ${onclick}
                    title="${tooltip}">
                 <span class="date-number">${current.getDate()}</span>
                 ${priceLabel}
                 ${statusIcon}
               </div>`;

      current.setDate(current.getDate() + 1);
    }
    if (!hasCurrentMonth && week > 3) break;
  }

  container.innerHTML = html;
}

function formatShortPrice(price) {
  if (price >= 1000) {
    return `$${Math.round(price / 1000)}k`;
  }
  return `$${price}`;
}

function getStatusIcon(status) {
  switch (status) {
    case 'occupied': return '<span class="day-status-icon">❌</span>';
    case 'maintenance': return '<span class="day-status-icon">🔧</span>';
    default: return '';
  }
}

function getDateTooltip(date, status, isPast) {
  const dateStr = date.toLocaleDateString('es-CL');
  if (isPast) return `${dateStr} — Fecha pasada`;
  switch (status) {
    case 'available': return `${dateStr} — Disponible`;
    case 'occupied': return `${dateStr} — Ocupado`;
    case 'maintenance': return `${dateStr} — Mantenimiento`;
    default: return `${dateStr}`;
  }
}

// ---- Date Selection ----

function selectDate(dateStr) {
  const clickedDate = new Date(dateStr);

  if (selectedDates.length === 2) {
    selectedDates = [];
    document.querySelectorAll('.calendar-day.selected, .calendar-day.range-middle, .calendar-day.range-start, .calendar-day.range-end').forEach(el => {
      el.classList.remove('selected', 'range-middle', 'range-start', 'range-end');
    });
    document.getElementById('selected-dates-info').style.display = 'none';
  }

  selectedDates.push(clickedDate);
  document.querySelector(`[data-date="${dateStr}"]`)?.classList.add('selected');

  if (selectedDates.length === 2) {
    selectedDates.sort((a, b) => a - b);

    if (isDateRangeValid(selectedDates[0], selectedDates[1])) {
      highlightDateRange();
      showSelectedDatesInfo();
    } else {
      showAlert('warning', '⚠️ El rango seleccionado incluye fechas no disponibles');
      clearSelection();
    }
  }
}

function isDateRangeValid(startDate, endDate) {
  const current = new Date(startDate);
  current.setDate(current.getDate() + 1);

  while (current < endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const status = availabilityData[dateStr] || 'available';
    if (status !== 'available') return false;
    current.setDate(current.getDate() + 1);
  }
  return true;
}

function highlightDateRange() {
  const startDate = selectedDates[0];
  const endDate = selectedDates[1];
  const current = new Date(startDate);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const el = document.querySelector(`[data-date="${dateStr}"]`);
    if (el) {
      el.classList.add('selected');
      if (dateStr === startStr) {
        el.classList.add('range-start');
      } else if (dateStr === endStr) {
        el.classList.add('range-end');
      } else {
        el.classList.add('range-middle');
      }
    }
    current.setDate(current.getDate() + 1);
  }
}

function showSelectedDatesInfo() {
  const startDate = selectedDates[0];
  const endDate = selectedDates[1];
  const checkIn = startDate.toISOString().split('T')[0];
  const checkOut = endDate.toISOString().split('T')[0];

  const formatUTCDate = (date) => {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  document.getElementById('selected-checkin').textContent = formatUTCDate(startDate);
  document.getElementById('selected-checkout').textContent = formatUTCDate(endDate);

  const nights = Math.ceil((endDate - startDate) / (1000 * 3600 * 24));
  document.getElementById('selected-nights').textContent = nights;

  // Show loading state for price
  const priceEl = document.getElementById('estimated-price');
  priceEl.textContent = 'Calculando...';

  fetch(`/api/precio/range?checkIn=${checkIn}&checkOut=${checkOut}`)
    .then(res => res.json())
    .then(data => {
      const total = data.totalPrice || (nights * pricePerNight);
      priceEl.textContent = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP'
      }).format(total);
    })
    .catch(() => {
      const total = nights * pricePerNight;
      priceEl.textContent = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP'
      }).format(total);
    });

  // Update reserve button
  const reserveBtn = document.getElementById('reserve-btn');
  reserveBtn.href = `/reservar?checkIn=${checkIn}&checkOut=${checkOut}`;

  const panel = document.getElementById('selected-dates-info');
  panel.style.display = 'block';

  panel.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });
}

function clearSelection() {
  selectedDates = [];
  document.querySelectorAll('.calendar-day.selected, .calendar-day.range-middle, .calendar-day.range-start, .calendar-day.range-end').forEach(el => {
    el.classList.remove('selected', 'range-middle', 'range-start', 'range-end');
  });
  document.getElementById('selected-dates-info').style.display = 'none';
}

function changeMonth(direction) {
  currentMonth += direction;

  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  } else if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }

  // Don't go past
  const today = new Date();
  if (currentYear < today.getFullYear() ||
    (currentYear === today.getFullYear() && currentMonth < today.getMonth())) {
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    return;
  }

  clearSelection();
  loadCalendar();
}

// ---- Helpers ----

function showCalendarError() {
  document.getElementById('availability-calendar').innerHTML = `
    <div class="text-center py-5" style="grid-column: 1 / -1;">
      <div class="text-danger mb-3">⚠️ Error al cargar el calendario</div>
      <button class="btn btn-primary" onclick="loadCalendar()">🔄 Intentar de nuevo</button>
    </div>
  `;
}

function showAlert(type, message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  const container = document.querySelector('.container');
  container.insertBefore(alertDiv, container.firstChild);

  setTimeout(() => { alertDiv.remove(); }, 5000);
}