// Admin Panel JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initializeAdminComponents();
  setupDataTables();
  setupDatePickers();
  setupConfirmationDialogs();
});

function initializeAdminComponents() {
  // Initialize any admin-specific components
  setupActiveNavigation();
  setupAutoRefresh();
}

function setupActiveNavigation() {
  // Highlight active navigation item based on current URL
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.list-group-item-action');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function setupDataTables() {
  // Add sorting and filtering to tables
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    addTableSort(table);
  });
}

function addTableSort(table) {
  const headers = table.querySelectorAll('th');
  headers.forEach((header, index) => {
    if (!header.classList.contains('no-sort')) {
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => sortTable(table, index));
    }
  });
}

function sortTable(table, columnIndex) {
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  const sortedRows = rows.sort((a, b) => {
    const aText = a.cells[columnIndex].textContent.trim();
    const bText = b.cells[columnIndex].textContent.trim();
    
    // Try to parse as numbers first
    const aNum = parseFloat(aText.replace(/[^\d.-]/g, ''));
    const bNum = parseFloat(bText.replace(/[^\d.-]/g, ''));
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    
    // Sort as strings
    return aText.localeCompare(bText);
  });
  
  tbody.innerHTML = '';
  sortedRows.forEach(row => tbody.appendChild(row));
}

function setupDatePickers() {
  // Enhance date inputs with better UX
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    // Set minimum date to today for future dates
    if (input.classList.contains('future-only')) {
      input.min = new Date().toISOString().split('T')[0];
    }
  });
}

function setupConfirmationDialogs() {
  // Add confirmation for destructive actions
  const deleteButtons = document.querySelectorAll('[data-confirm]');
  deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      const message = this.getAttribute('data-confirm') || '¿Estás seguro?';
      if (!confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
}

function setupAutoRefresh() {
  // Auto-refresh dashboard every 5 minutes
  if (window.location.pathname === '/admin') {
    setInterval(() => {
      // Only refresh if the page is visible
      if (!document.hidden) {
        refreshDashboardStats();
      }
    }, 300000); // 5 minutes
  }
}

function refreshDashboardStats() {
  // Refresh dashboard statistics without full page reload
  fetch('/admin/api/stats')
    .then(response => response.json())
    .then(data => {
      updateStatCards(data);
    })
    .catch(error => {
      console.error('Error refreshing stats:', error);
    });
}

function updateStatCards(stats) {
  // Update statistic cards with new data
  const statElements = {
    totalReservations: document.querySelector('[data-stat="total-reservations"]'),
    pendingReservations: document.querySelector('[data-stat="pending-reservations"]'),
    thisMonthReservations: document.querySelector('[data-stat="this-month-reservations"]'),
    thisMonthRevenue: document.querySelector('[data-stat="this-month-revenue"]')
  };

  Object.keys(statElements).forEach(key => {
    const element = statElements[key];
    if (element && stats[key] !== undefined) {
      element.textContent = stats[key];
    }
  });
}

// Calendar functions
function initializeCalendar() {
  const calendarContainer = document.getElementById('calendar-container');
  if (!calendarContainer) return;

  loadCalendarData();
}

function loadCalendarData() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  fetch(`/admin/api/calendar/${currentYear}/${currentMonth}`)
    .then(response => response.json())
    .then(data => {
      renderCalendar(data);
    })
    .catch(error => {
      console.error('Error loading calendar:', error);
      showAlert('danger', 'Error al cargar el calendario');
    });
}

function renderCalendar(data) {
  // Calendar rendering logic would go here
  // This is handled in the specific calendar page
}

// Reservation management
function cancelReservation(reservationId) {
  if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
    return;
  }

  const button = document.querySelector(`[onclick="cancelReservation(${reservationId})"]`);
  const originalText = button.innerHTML;
  
  // Show loading state
  button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Cancelando...';
  button.disabled = true;

  fetch(`/admin/reservas/${reservationId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Update the row to show cancelled status
      updateReservationRow(reservationId, 'cancelled');
      showAlert('success', data.message);
    } else {
      showAlert('danger', data.error || 'Error al cancelar la reserva');
      // Restore button
      button.innerHTML = originalText;
      button.disabled = false;
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showAlert('danger', 'Error de conexión');
    // Restore button
    button.innerHTML = originalText;
    button.disabled = false;
  });
}

function updateReservationRow(reservationId, status) {
  const row = document.getElementById(`reservation-${reservationId}`);
  if (row) {
    const statusCell = row.querySelector('td:nth-child(6)'); // Adjust based on table structure
    const actionCell = row.querySelector('td:nth-child(8)');
    
    if (statusCell) {
      statusCell.innerHTML = '<span class="badge bg-danger">Cancelada</span>';
    }
    
    if (actionCell) {
      actionCell.innerHTML = '<span class="text-muted">Cancelada</span>';
    }
  }
}

// Utility functions for admin
function showAlert(type, message, duration = 5000) {
  const alertContainer = document.getElementById('admin-alert-container') || createAdminAlertContainer();
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  alertContainer.appendChild(alertDiv);
  
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, duration);
}

function createAdminAlertContainer() {
  const container = document.createElement('div');
  container.id = 'admin-alert-container';
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  container.style.maxWidth = '400px';
  
  const main = document.querySelector('main');
  if (main) {
    main.appendChild(container);
  } else {
    document.body.appendChild(container);
  }
  
  return container;
}

function exportData(type) {
  // Export functionality for reservations, etc.
  const url = `/admin/export/${type}`;
  window.open(url, '_blank');
}

function printReport() {
  window.print();
}

// Search and filter functions
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(performSearch, 300));
  }
}

function performSearch(event) {
  const query = event.target.value.toLowerCase();
  const rows = document.querySelectorAll('tbody tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    if (text.includes(query)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export admin utilities
window.AdminUtils = {
  showAlert,
  cancelReservation,
  exportData,
  printReport
};