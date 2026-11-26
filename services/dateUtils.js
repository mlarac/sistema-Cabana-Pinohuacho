const cabin = require('../config/cabin');

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function isValidYMD(str) {
  if (typeof str !== 'string' || !YMD_REGEX.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function ymdToUtcDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcDateToYMD(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayYMD() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: cabin.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function addDays(ymd, days) {
  const dt = ymdToUtcDate(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return utcDateToYMD(dt);
}

function addMonths(ymd, months) {
  const dt = ymdToUtcDate(ymd);
  dt.setUTCMonth(dt.getUTCMonth() + months);
  return utcDateToYMD(dt);
}

function nightsBetween(checkIn, checkOut) {
  const start = ymdToUtcDate(checkIn);
  const end = ymdToUtcDate(checkOut);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function eachNight(checkIn, checkOut) {
  const dates = [];
  let cursor = checkIn;
  while (cursor < checkOut) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function eachDateInclusive(startYMD, endYMD) {
  const dates = [];
  let cursor = startYMD;
  while (cursor <= endYMD) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function getDayOfWeek(ymd) {
  return ymdToUtcDate(ymd).getUTCDay();
}

function isWeekendNight(ymd) {
  const dow = getDayOfWeek(ymd);
  return dow === 5 || dow === 6; // Viernes o Sábado
}

function dayNameEs(ymd) {
  return DAYS_ES[getDayOfWeek(ymd)];
}

function monthNameEs(monthIndexZeroBased) {
  return MONTHS_ES[monthIndexZeroBased] || '';
}

function monthBounds(year, monthOneBased) {
  const y = Number(year);
  const m = Number(monthOneBased);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  return {
    startYMD: utcDateToYMD(first),
    endYMD: utcDateToYMD(last)
  };
}

function formatCLDate(ymd) {
  if (!isValidYMD(ymd)) return ymd || '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

function formatCLDateTime(dateInput) {
  if (!dateInput) return '';
  const dt = new Date(dateInput);
  if (Number.isNaN(dt.getTime())) return '';
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: cabin.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(dt);
}

function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

module.exports = {
  isValidYMD,
  todayYMD,
  addDays,
  addMonths,
  nightsBetween,
  eachNight,
  eachDateInclusive,
  getDayOfWeek,
  isWeekendNight,
  dayNameEs,
  monthNameEs,
  monthBounds,
  formatCLDate,
  formatCLDateTime,
  formatCLP
};
