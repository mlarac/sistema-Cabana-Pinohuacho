// Admin Panel Unified JavaScript (CSP-compliant, CSRF-protected)
(() => {
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  async function postJson(url, payload = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-Token': getCsrfToken()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  function showAlert(type, message, duration = 5000) {
    const container =
      document.getElementById('admin-alert-container') || createAlertContainer();

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show shadow-sm`;
    alertDiv.setAttribute('role', 'alert');

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.setAttribute('data-bs-dismiss', 'alert');
    closeBtn.setAttribute('aria-label', 'Cerrar');

    alertDiv.appendChild(msgSpan);
    alertDiv.appendChild(closeBtn);
    container.appendChild(alertDiv);

    setTimeout(() => {
      if (alertDiv.parentNode) alertDiv.remove();
    }, duration);
  }

  function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'admin-alert-container';
    container.style.position = 'fixed';
    container.style.top = '70px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.maxWidth = '420px';
    document.body.appendChild(container);
    return container;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const pageEl = document.querySelector('[data-admin-page]');
    const page = pageEl ? pageEl.dataset.adminPage : '';

    if (page === 'dashboard') initDashboard();
    if (page === 'reservations') initReservations();
    if (page === 'calendar') initCalendar();
    if (page === 'prices') initPrices();
  });

  // ============================================
  // DASHBOARD
  // ============================================
  function initDashboard() {
    setInterval(() => {
      if (!document.hidden) refreshDashboardStats();
    }, 300000);
  }

  async function refreshDashboardStats() {
    try {
      const res = await fetch('/admin/api/stats', {
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return;
      const stats = await res.json();
      const map = {
        totalReservations: '[data-stat="total-reservations"]',
        pendingReservations: '[data-stat="pending-reservations"]',
        thisMonthReservations: '[data-stat="this-month-reservations"]',
        thisMonthRevenue: '[data-stat="this-month-revenue"]'
      };
      Object.entries(map).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        if (el && stats[key] !== undefined) {
          el.textContent = stats[key];
        }
      });
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  }

  // ============================================
  // RESERVATIONS
  // ============================================
  function initReservations() {
    const editModalEl = document.getElementById('editReservationModal');
    const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;

    document.addEventListener('click', async (e) => {
      const confirmBtn = e.target.closest('[data-action="confirm-reservation"]');
      if (confirmBtn) {
        const id = confirmBtn.dataset.id;
        if (!confirm('¿Confirmar esta reserva y enviar notificación al huésped?')) return;
        confirmBtn.disabled = true;
        const { ok, data } = await postJson(`/admin/reservas/${id}/confirm`);
        if (ok && data.success) {
          showAlert('success', data.message);
          setTimeout(() => window.location.reload(), 600);
        } else {
          showAlert('danger', data.error || 'No se pudo confirmar la reserva');
          confirmBtn.disabled = false;
        }
        return;
      }

      const cancelBtn = e.target.closest('[data-action="cancel-reservation"]');
      if (cancelBtn) {
        const id = cancelBtn.dataset.id;
        if (!confirm('¿Estás seguro de cancelar esta reserva? Se liberarán sus fechas.')) return;
        cancelBtn.disabled = true;
        const { ok, data } = await postJson(`/admin/reservas/${id}/cancel`);
        if (ok && data.success) {
          showAlert('success', data.message);
          setTimeout(() => window.location.reload(), 600);
        } else {
          showAlert('danger', data.error || 'No se pudo cancelar la reserva');
          cancelBtn.disabled = false;
        }
        return;
      }

      const editBtn = e.target.closest('[data-action="edit-reservation"]');
      if (editBtn && editModal) {
        document.getElementById('editResId').value = editBtn.dataset.id || '';
        document.getElementById('editResName').value = editBtn.dataset.name || '';
        document.getElementById('editResEmail').value = editBtn.dataset.email || '';
        document.getElementById('editResPhone').value = editBtn.dataset.phone || '';
        document.getElementById('editResCheckIn').value = editBtn.dataset.checkin || '';
        document.getElementById('editResCheckOut').value = editBtn.dataset.checkout || '';
        document.getElementById('editResGuests').value = editBtn.dataset.guests || '1';
        document.getElementById('editResStatus').value = editBtn.dataset.status || 'pending';
        document.getElementById('editResTotal').value = editBtn.dataset.total || '';
        document.getElementById('editResNotes').value = editBtn.dataset.notes || '';
        editModal.show();
      }
    });

    const manualForm = document.getElementById('manualReservationForm');
    manualForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(manualForm).entries());
      const { ok, data } = await postJson('/admin/reservas', payload);
      if (ok && data.success) {
        showAlert('success', data.message);
        setTimeout(() => window.location.reload(), 600);
      } else {
        showAlert('danger', data.error || 'Error al crear la reserva manual');
      }
    });

    const editForm = document.getElementById('editReservationForm');
    editForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(editForm).entries());
      const id = payload.id;
      const { ok, data } = await postJson(`/admin/reservas/${id}/edit`, payload);
      if (ok && data.success) {
        showAlert('success', data.message);
        setTimeout(() => window.location.reload(), 600);
      } else {
        showAlert('danger', data.error || 'Error al actualizar la reserva');
      }
    });
  }

  // ============================================
  // CALENDAR
  // ============================================
  function initCalendar() {
    const container = document.getElementById('calendar-container');
    const monthSelector = document.getElementById('monthSelector');
    const openSingleBtn = document.getElementById('openSingleAvailBtn');
    const singleForm = document.getElementById('availabilityForm');
    const rangeForm = document.getElementById('availabilityRangeForm');
    if (!container) return;

    const initial = (container.dataset.initialMonth || '').split('-');
    let currentYear = Number(initial[0]) || new Date().getFullYear();
    let currentMonth = (Number(initial[1]) || new Date().getMonth() + 1) - 1; // 0-indexed
    let selectedDate = null;
    let monthData = {};

    function pad2(n) {
      return String(n).padStart(2, '0');
    }

    async function loadCalendar() {
      try {
        const res = await fetch(
          `/api/availability/${currentYear}/${pad2(currentMonth + 1)}?detailed=1`
        );
        if (!res.ok) throw new Error('HTTP error');
        monthData = await res.json();
        renderCalendar();
      } catch (err) {
        console.error('Error loading calendar:', err);
        showAlert('danger', 'Error al cargar el calendario');
      }
    }

    function renderCalendar() {
      const firstDay = new Date(Date.UTC(currentYear, currentMonth, 1));
      const offset = firstDay.getUTCDay();
      const cursor = new Date(Date.UTC(currentYear, currentMonth, 1 - offset));

      let html = '<div class="calendar-container">';
      DAY_NAMES.forEach((d) => {
        html += `<div class="calendar-header">${d}</div>`;
      });

      for (let week = 0; week < 6; week++) {
        let hasCurrentMonth = false;
        for (let col = 0; col < 7; col++) {
          const y = cursor.getUTCFullYear();
          const m = cursor.getUTCMonth();
          const d = cursor.getUTCDate();
          const ymd = `${y}-${pad2(m + 1)}-${pad2(d)}`;
          const isCurrent = m === currentMonth;
          if (isCurrent) hasCurrentMonth = true;
          const info = monthData[ymd] || { status: 'available', price: 50000 };
          const isSelected = selectedDate === ymd;

          html += `
            <button
              type="button"
              class="calendar-day border-0 ${info.status} ${!isCurrent ? 'other-month' : ''} ${isSelected ? 'selected' : ''}"
              data-date="${ymd}"
            >
              <div>
                <div class="fw-bold">${d}</div>
                ${isCurrent ? `<small>$${Math.round((info.price || 0) / 1000)}k</small>` : ''}
              </div>
            </button>`;
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        if (!hasCurrentMonth && week > 3) break;
      }

      html += '</div>';
      container.innerHTML = html;
    }

    container.addEventListener('click', (e) => {
      const cell = e.target.closest('.calendar-day[data-date]');
      if (!cell) return;
      selectedDate = cell.dataset.date;
      const info = monthData[selectedDate] || { status: 'available', notes: '' };
      document.getElementById('selectedDate').value = selectedDate;
      document.getElementById('status').value = info.status;
      document.getElementById('notes').value = info.notes || '';
      renderCalendar();
    });

    monthSelector?.addEventListener('change', () => {
      const [y, m] = monthSelector.value.split('-').map(Number);
      currentYear = y;
      currentMonth = m - 1;
      selectedDate = null;
      loadCalendar();
    });

    openSingleBtn?.addEventListener('click', () => {
      if (!selectedDate) {
        showAlert('warning', 'Selecciona primero una fecha en el calendario');
        return;
      }
      bootstrap.Modal.getOrCreateInstance(document.getElementById('availabilityModal')).show();
    });

    singleForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(singleForm).entries());
      const { ok, data } = await postJson('/admin/availability', payload);
      if (ok && data.success) {
        showAlert('success', data.message);
        bootstrap.Modal.getInstance(document.getElementById('availabilityModal'))?.hide();
        await loadCalendar();
      } else {
        showAlert('danger', data.error || 'Error al actualizar disponibilidad');
      }
    });

    rangeForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(rangeForm).entries());
      const { ok, data } = await postJson('/admin/availability-range', payload);
      if (ok && data.success) {
        showAlert('success', data.message);
        bootstrap.Modal.getInstance(document.getElementById('availabilityRangeModal'))?.hide();
        rangeForm.reset();
        await loadCalendar();
      } else {
        showAlert('danger', data.message || data.error || 'Error al actualizar rango');
      }
    });

    loadCalendar();
  }

  // ============================================
  // PRICES
  // ============================================
  function initPrices() {
    const modalEl = document.getElementById('editPriceModal');
    const editModal = modalEl ? new bootstrap.Modal(modalEl) : null;

    document.querySelectorAll('.edit-price-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.getElementById('editDayId').value = btn.dataset.id || '';
        document.getElementById('editDate').value = btn.dataset.date || '';
        document.getElementById('editPrice').value = btn.dataset.price || '';
        document.getElementById('editCategory').value = btn.dataset.category || 'normal';
        editModal?.show();
      });
    });

    const params = new URLSearchParams(window.location.search);
    const successMap = {
      'category-updated': 'Precios actualizados por categoría exitosamente',
      'range-updated': 'Precios actualizados por rango de fechas exitosamente',
      'single-updated': 'Precio individual actualizado exitosamente'
    };
    const errorMap = {
      'category-update-failed': 'Error al actualizar precios por categoría',
      'range-update-failed': 'Error al actualizar precios por rango de fechas',
      'invalid-range': 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      'single-update-failed': 'Error al actualizar precio individual'
    };

    const s = params.get('success');
    const err = params.get('error');
    if (s) showAlert('success', successMap[s] || 'Operación completada exitosamente');
    if (err) showAlert('danger', errorMap[err] || 'Ha ocurrido un error');
  }
})();
