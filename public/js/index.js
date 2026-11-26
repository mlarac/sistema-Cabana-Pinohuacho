(() => {
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  let todayYMD = '';
  let currentYear = 0;
  let currentMonth = 0; // 0-indexed
  let monthDetails = {};
  let selectedStart = null; // YYYY-MM-DD
  let selectedEnd = null;   // YYYY-MM-DD

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toLocalYMD(year, monthZeroBased, day) {
    return `${year}-${pad2(monthZeroBased + 1)}-${pad2(day)}`;
  }

  function formatShortPrice(price) {
    const num = Number(price) || 0;
    if (num >= 1000) {
      return `$${Math.round(num / 1000)}k`;
    }
    return `$${num}`;
  }

  function formatCL(ymd) {
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  }

  function nightsDiff(startYMD, endYMD) {
    const [sy, sm, sd] = startYMD.split('-').map(Number);
    const [ey, em, ed] = endYMD.split('-').map(Number);
    const s = Date.UTC(sy, sm - 1, sd);
    const e = Date.UTC(ey, em - 1, ed);
    return Math.round((e - s) / 86400000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const calEl = document.getElementById('availability-calendar');
    if (!calEl) return;

    const serverToday = calEl.dataset.today;
    if (serverToday && /^\d{4}-\d{2}-\d{2}$/.test(serverToday)) {
      todayYMD = serverToday;
      const [y, m] = serverToday.split('-').map(Number);
      currentYear = y;
      currentMonth = m - 1;
    } else {
      const now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth();
      todayYMD = toLocalYMD(currentYear, currentMonth, now.getDate());
    }

    document.getElementById('prev-month-btn')?.addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month-btn')?.addEventListener('click', () => changeMonth(1));
    document.getElementById('clear-selection-btn')?.addEventListener('click', clearSelection);

    calEl.addEventListener('click', (e) => {
      const dayCell = e.target.closest('.calendar-day[data-clickable="1"]');
      if (!dayCell) return;
      handleDateClick(dayCell.dataset.date);
    });

    setupScrollAnimations();
    loadCalendar();
  });

  function setupScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.feature-card, .gallery-item, .activity-card').forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
  }

  async function loadCalendar() {
    const titleEl = document.getElementById('calendar-title');
    if (titleEl) {
      titleEl.textContent = `📅 ${MONTH_NAMES[currentMonth]} ${currentYear}`;
    }

    try {
      const res = await fetch(
        `/api/availability/${currentYear}/${pad2(currentMonth + 1)}?detailed=1`
      );
      if (!res.ok) throw new Error('HTTP error');
      monthDetails = await res.json();
      renderCalendar();
    } catch (error) {
      console.error('Error loading calendar:', error);
      showCalendarError();
    }
  }

  function renderCalendar() {
    const container = document.getElementById('availability-calendar');
    const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const startOffset = firstDayOfMonth.getUTCDay();
    const cursor = new Date(Date.UTC(currentYear, currentMonth, 1 - startOffset));

    let html = '';
    DAY_NAMES.forEach((day) => {
      html += `<div class="calendar-header">${day}</div>`;
    });

    for (let week = 0; week < 6; week++) {
      let hasCurrentMonth = false;
      for (let col = 0; col < 7; col++) {
        const y = cursor.getUTCFullYear();
        const m = cursor.getUTCMonth();
        const d = cursor.getUTCDate();
        const dateStr = toLocalYMD(y, m, d);
        const isCurrentMonth = m === currentMonth;
        const isToday = dateStr === todayYMD;
        const isPast = dateStr < todayYMD;
        const info = monthDetails[dateStr] || { status: 'available', price: 50000 };
        const status = info.status;

        if (isCurrentMonth) hasCurrentMonth = true;

        const classes = ['calendar-day'];
        if (!isCurrentMonth) classes.push('other-month');
        if (isToday) classes.push('today');
        if (isPast) {
          classes.push('past');
        } else if (isCurrentMonth) {
          classes.push(status);
        }

        // Permitir seleccionar una fecha ocupada solo como check-out cuando ya se eligió check-in anterior
        const canSelectAsCheckout =
          Boolean(selectedStart && !selectedEnd && dateStr > selectedStart && isCurrentMonth && !isPast);
        const clickable = isCurrentMonth && !isPast && (status === 'available' || canSelectAsCheckout);

        if (selectedStart && !selectedEnd && dateStr === selectedStart) {
          classes.push('selected');
        } else if (selectedStart && selectedEnd && dateStr >= selectedStart && dateStr <= selectedEnd) {
          classes.push('selected');
        }

        const priceBadge =
          isCurrentMonth && !isPast && status === 'available'
            ? `<span class="calendar-price">${formatShortPrice(info.price)}</span>`
            : `<small>${status === 'occupied' ? 'Ocup.' : status === 'maintenance' ? 'Mant.' : ''}</small>`;

        html += `
          <button
            type="button"
            class="${classes.join(' ')}"
            data-date="${dateStr}"
            data-clickable="${clickable ? '1' : '0'}"
            ${clickable ? '' : 'disabled'}
            title="${formatCL(dateStr)} - ${statusLabel(status, isPast)}"
          >
            <span class="date-number">${d}</span>
            ${isPast ? '<small class="text-muted">—</small>' : priceBadge}
          </button>`;

        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      if (!hasCurrentMonth && week > 3) break;
    }

    container.innerHTML = html;
  }

  function statusLabel(status, isPast) {
    if (isPast) return 'Fecha pasada';
    if (status === 'available') return 'Disponible';
    if (status === 'occupied') return 'Ocupado';
    if (status === 'maintenance') return 'En mantenimiento';
    return 'Disponible';
  }

  async function handleDateClick(dateStr) {
    const hint = document.getElementById('calendar-selection-hint');

    if (!selectedStart || (selectedStart && selectedEnd)) {
      const info = monthDetails[dateStr];
      if (info && info.status !== 'available') {
        window.CabinUtils?.showAlert('warning', 'Selecciona una fecha disponible como entrada.');
        return;
      }
      selectedStart = dateStr;
      selectedEnd = null;
      document.getElementById('selected-dates-info')?.classList.add('d-none');
      if (hint) {
        hint.textContent = `Entrada: ${formatCL(selectedStart)}. Ahora selecciona tu fecha de salida (puedes cambiar de mes).`;
      }
      renderCalendar();
      return;
    }

    if (dateStr === selectedStart) {
      clearSelection();
      return;
    }

    let start = selectedStart;
    let end = dateStr;
    if (end < start) {
      [start, end] = [end, start];
    }

    try {
      const [availRes, priceRes] = await Promise.all([
        fetch(`/api/availability/range?start=${start}&end=${end}`),
        fetch(`/api/precio/range?checkIn=${start}&checkOut=${end}`)
      ]);
      const availData = await availRes.json();
      const priceData = await priceRes.json();

      if (!availRes.ok || !availData.available) {
        window.CabinUtils?.showAlert(
          'warning',
          'El rango seleccionado incluye fechas ocupadas o en mantenimiento.'
        );
        clearSelection();
        return;
      }

      selectedStart = start;
      selectedEnd = end;
      if (hint) {
        hint.textContent = 'Rango seleccionado. Puedes continuar a tu solicitud de reserva.';
      }
      renderCalendar();
      showSelectedDatesInfo(start, end, priceData);
    } catch (error) {
      console.error('Error validating range:', error);
      window.CabinUtils?.showAlert('danger', 'No se pudo verificar disponibilidad del rango.');
    }
  }

  function showSelectedDatesInfo(checkIn, checkOut, priceData) {
    const nights = priceData?.nights || nightsDiff(checkIn, checkOut);
    const total = priceData?.totalPrice || 0;

    document.getElementById('selected-checkin').textContent = formatCL(checkIn);
    document.getElementById('selected-checkout').textContent = formatCL(checkOut);
    document.getElementById('selected-nights').textContent = String(nights);
    document.getElementById('estimated-price').textContent =
      `${window.CabinUtils.formatCurrency(total)} CLP`;

    const reserveBtn = document.getElementById('reserve-btn');
    if (reserveBtn) {
      reserveBtn.href = `/reservar?checkIn=${checkIn}&checkOut=${checkOut}`;
    }

    const box = document.getElementById('selected-dates-info');
    if (box) {
      box.classList.remove('d-none');
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function clearSelection() {
    selectedStart = null;
    selectedEnd = null;
    document.getElementById('selected-dates-info')?.classList.add('d-none');
    const hint = document.getElementById('calendar-selection-hint');
    if (hint) {
      hint.textContent = 'Haz clic en un día disponible para elegir tu fecha de entrada y luego en otro día para tu fecha de salida.';
    }
    renderCalendar();
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

    const [todayY, todayM] = todayYMD.split('-').map(Number);
    if (currentYear < todayY || (currentYear === todayY && currentMonth < todayM - 1)) {
      currentYear = todayY;
      currentMonth = todayM - 1;
      return;
    }

    // Mantiene selectedStart si el usuario está eligiendo salida en el mes siguiente
    loadCalendar();
  }

  function showCalendarError() {
    const container = document.getElementById('availability-calendar');
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'text-center py-5';
    wrapper.style.gridColumn = '1 / -1';

    const msg = document.createElement('div');
    msg.className = 'text-danger mb-3';
    msg.textContent = '⚠️ Error al cargar el calendario';

    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'btn btn-primary';
    retryBtn.textContent = '🔄 Intentar de nuevo';
    retryBtn.addEventListener('click', loadCalendar);

    wrapper.appendChild(msg);
    wrapper.appendChild(retryBtn);
    container.appendChild(wrapper);
  }
})();
