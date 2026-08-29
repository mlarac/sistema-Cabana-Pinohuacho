let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let availabilityData = {};
    let selectedDates = [];
    let pricePerNight = 50000; // Valor por defecto

    // Obtener precio dinámico desde la API
    function fetchPricePerNight() {
      return fetch('/api/precio')
        .then(res => res.json())
        .then(data => {
          if (data.price) pricePerNight = data.price;
        })
        .catch(() => { pricePerNight = 50000; });
    }

    document.addEventListener('DOMContentLoaded', function() {
      fetchPricePerNight().then(() => {
        loadCalendar();
      });
      
      // Add scroll animations
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

      // Observe all feature cards and gallery items
      document.querySelectorAll('.feature-card, .gallery-item, .activity-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
      });
    });

    function loadCalendar() {
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
      document.getElementById('calendar-title').textContent = 
        `📅 ${monthNames[currentMonth]} ${currentYear}`;

      fetch(`/api/availability/${currentYear}/${(currentMonth + 1).toString().padStart(2, '0')}`)
        .then(response => response.json())
        .then(data => {
          availabilityData = data;
          renderCalendar();
        })
        .catch(error => {
          console.error('Error loading calendar:', error);
          showCalendarError();
        });
    }

    function renderCalendar() {
      const container = document.getElementById('availability-calendar');
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      const today = new Date();

      let html = '';
      
      // Headers
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      dayNames.forEach(day => {
        html += `<div class="calendar-header">${day}</div>`;
      });

      // Calendar days
      const current = new Date(startDate);
      for (let week = 0; week < 6; week++) {
        let hasCurrentMonth = false;
        for (let day = 0; day < 7; day++) {
          const dateStr = current.toISOString().split('T')[0];
          const isCurrentMonth = current.getMonth() === currentMonth;
          const isToday = current.toDateString() === today.toDateString();
          const isPast = current < today;
          const status = availabilityData[dateStr] || 'available';
          
          if (isCurrentMonth) hasCurrentMonth = true;

          let classes = ['calendar-day'];
          if (!isCurrentMonth) classes.push('other-month');
          if (isToday) classes.push('today');
          if (isPast && isCurrentMonth) classes.push('past');
          
          // Only add status classes for current month and future dates
          if (isCurrentMonth && !isPast) {
            classes.push(status);
          } else if (isPast) {
            classes.push('past');
          }

          const clickable = isCurrentMonth && !isPast && (status === 'available');
          const onclick = clickable ? `onclick="selectDate('${dateStr}')"` : '';

          html += `<div class="${classes.join(' ')}" 
                        data-date="${dateStr}" 
                        ${onclick}
                        title="${getDateTooltip(current, status, isPast)}">
                     <span class="date-number">${current.getDate()}</span>
                     ${getDateIcon(status, isPast)}
                   </div>`;
          
          current.setDate(current.getDate() + 1);
        }
        if (!hasCurrentMonth && week > 3) break;
      }

      container.innerHTML = html;
    }

    function getDateIcon(status, isPast) {
      if (isPast) return '<small>⏰</small>';
      
      switch(status) {
        case 'available': return '<small>✅</small>';
        case 'occupied': return '<small>❌</small>';
        case 'maintenance': return '<small>🔧</small>';
        default: return '<small>✅</small>';
      }
    }

    function getDateTooltip(date, status, isPast) {
      const dateStr = date.toLocaleDateString('es-CL');
      
      if (isPast) return `${dateStr} - Fecha pasada`;
      
      switch(status) {
        case 'available': return `${dateStr} - Disponible para reserva`;
        case 'occupied': return `${dateStr} - Ocupado`;
        case 'maintenance': return `${dateStr} - En mantenimiento`;
        default: return `${dateStr} - Disponible para reserva`;
      }
    }

    function selectDate(dateStr) {
      const clickedDate = new Date(dateStr);
      
      // Clear previous selections if starting new selection
      if (selectedDates.length === 2) {
        selectedDates = [];
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
          el.classList.remove('selected');
        });
      }

      // Add to selection
      selectedDates.push(clickedDate);
      document.querySelector(`[data-date="${dateStr}"]`).classList.add('selected');

      // If we have 2 dates, validate and show info
      if (selectedDates.length === 2) {
        selectedDates.sort((a, b) => a - b);
        
        // Check if range is valid
        if (isDateRangeValid(selectedDates[0], selectedDates[1])) {
          showSelectedDatesInfo();
          highlightDateRange();
        } else {
          showAlert('warning', '⚠️ El rango seleccionado incluye fechas no disponibles');
          clearSelection();
        }
      }
    }

    function isDateRangeValid(startDate, endDate) {
      const current = new Date(startDate);
      current.setDate(current.getDate() + 1); // Start from day after check-in
      
      while (current < endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const status = availabilityData[dateStr] || 'available';
        
        if (status !== 'available') {
          return false;
        }
        current.setDate(current.getDate() + 1);
      }
      return true;
    }

    function highlightDateRange() {
      const startDate = selectedDates[0];
      const endDate = selectedDates[1];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const dayElement = document.querySelector(`[data-date="${dateStr}"]`);
        if (dayElement) {
          dayElement.classList.add('selected');
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

      // Fetch dynamic price range
      fetch(`/api/precio/range?checkIn=${checkIn}&checkOut=${checkOut}`)
        .then(res => res.json())
        .then(data => {
          const total = data.totalPrice || (nights * pricePerNight);
          document.getElementById('estimated-price').textContent = new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
          }).format(total);
        })
        .catch((err) => {
          console.error('Error fetching range price:', err);
          const total = nights * pricePerNight;
          document.getElementById('estimated-price').textContent = new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
          }).format(total);
        });

      // Update reserve button with selected dates
      const reserveBtn = document.getElementById('reserve-btn');
      reserveBtn.href = `/reservar?checkIn=${checkIn}&checkOut=${checkOut}`;

      document.getElementById('selected-dates-info').style.display = 'block';
      
      // Scroll to show the info
      document.getElementById('selected-dates-info').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }

    function clearSelection() {
      selectedDates = [];
      document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
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
      
      // Don't allow going to past months
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

    function showCalendarError() {
      document.getElementById('availability-calendar').innerHTML = `
        <div class="text-center py-5">
          <div class="text-danger mb-3">
            ⚠️ Error al cargar el calendario
          </div>
          <button class="btn btn-primary" onclick="loadCalendar()">
            🔄 Intentar de nuevo
          </button>
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
      
      setTimeout(() => {
        alertDiv.remove();
      }, 5000);
    }