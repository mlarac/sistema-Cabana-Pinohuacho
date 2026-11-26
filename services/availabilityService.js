const { Op } = require('sequelize');
const { sequelize, Reservation, Availability } = require('../models');
const cabin = require('../config/cabin');
const {
  eachNight,
  eachDateInclusive,
  monthBounds,
  isWeekendNight
} = require('./dateUtils');
const { ensureDatesExist } = require('./pricingService');

const ACTIVE_RESERVATION_STATUSES = ['pending', 'confirmed'];

async function getRangeDetails(startYMD, endYMD) {
  const [reservations, availabilityRows] = await Promise.all([
    Reservation.findAll({
      where: {
        status: { [Op.in]: ACTIVE_RESERVATION_STATUSES },
        checkIn: { [Op.lte]: endYMD },
        checkOut: { [Op.gt]: startYMD }
      }
    }),
    Availability.findAll({
      where: {
        date: { [Op.between]: [startYMD, endYMD] }
      }
    })
  ]);

  const availByDate = new Map(availabilityRows.map((r) => [r.date, r]));
  const dates = eachDateInclusive(startYMD, endYMD);
  const details = {};

  for (const ymd of dates) {
    const manual = availByDate.get(ymd);
    let status = 'available';

    const hasReservation = reservations.some(
      (r) => ymd >= r.checkIn && ymd < r.checkOut
    );

    if (hasReservation) {
      status = 'occupied';
    }

    // Mantenimiento o bloqueo manual tiene prioridad sobre disponible;
    // mantenimiento también prevalece visualmente si fue marcado por admin
    if (manual) {
      if (manual.status === 'maintenance') {
        status = 'maintenance';
      } else if (manual.status === 'occupied') {
        status = 'occupied';
      } else if (manual.status === 'available' && !hasReservation) {
        status = 'available';
      }
    }

    details[ymd] = {
      status,
      price: manual && manual.price !== null ? parseFloat(manual.price) : cabin.defaultPrice,
      priceCategory: manual ? manual.priceCategory : (isWeekendNight(ymd) ? 'weekend' : 'normal'),
      notes: manual ? manual.notes : null
    };
  }

  return details;
}

async function getMonthCalendar(year, month) {
  const { startYMD, endYMD } = monthBounds(year, month);
  const details = await getRangeDetails(startYMD, endYMD);
  const simple = {};
  for (const [ymd, info] of Object.entries(details)) {
    simple[ymd] = info.status;
  }
  return { simple, details };
}

async function isRangeAvailable(checkIn, checkOut, { excludeReservationId = null, allowedOccupiedDates = [], transaction } = {}) {
  const nights = eachNight(checkIn, checkOut);
  if (nights.length === 0) return false;

  const reservationWhere = {
    status: { [Op.in]: ACTIVE_RESERVATION_STATUSES },
    checkIn: { [Op.lt]: checkOut },
    checkOut: { [Op.gt]: checkIn }
  };

  if (excludeReservationId) {
    reservationWhere.id = { [Op.ne]: excludeReservationId };
  }

  const conflictingReservations = await Reservation.count({
    where: reservationWhere,
    transaction
  });

  if (conflictingReservations > 0) {
    return false;
  }

  const lastNight = nights[nights.length - 1];
  const blockedManual = await Availability.findAll({
    where: {
      date: { [Op.between]: [checkIn, lastNight] },
      status: { [Op.in]: ['occupied', 'maintenance'] }
    },
    transaction
  });

  const allowedSet = new Set(allowedOccupiedDates);
  for (const row of blockedManual) {
    if (row.status === 'maintenance') return false;
    if (row.status === 'occupied' && !allowedSet.has(row.date)) return false;
  }

  return true;
}

async function setDatesStatus(dates, status, { notes, transaction } = {}) {
  if (!dates || dates.length === 0) return;

  const sorted = [...dates].sort();
  await ensureDatesExist(sorted[0], sorted[sorted.length - 1], { transaction });

  const updatePayload = { status };
  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  await Availability.update(updatePayload, {
    where: {
      date: { [Op.in]: sorted }
    },
    transaction
  });
}

async function updateRangeStatus(startYMD, endYMD, status, notes = undefined) {
  const dates = eachDateInclusive(startYMD, endYMD);
  return sequelize.transaction(async (transaction) => {
    await setDatesStatus(dates, status, { notes, transaction });
    return dates.length;
  });
}

async function freeDatesIfUnoccupied(checkIn, checkOut, { excludeReservationId = null, transaction } = {}) {
  const nights = eachNight(checkIn, checkOut);
  if (nights.length === 0) return;

  const lastNight = nights[nights.length - 1];
  const otherWhere = {
    status: { [Op.in]: ACTIVE_RESERVATION_STATUSES },
    checkIn: { [Op.lt]: checkOut },
    checkOut: { [Op.gt]: checkIn }
  };
  if (excludeReservationId) {
    otherWhere.id = { [Op.ne]: excludeReservationId };
  }

  const [otherReservations, manualRows] = await Promise.all([
    Reservation.findAll({ where: otherWhere, transaction }),
    Availability.findAll({
      where: { date: { [Op.between]: [checkIn, lastNight] } },
      transaction
    })
  ]);

  const maintenanceDates = new Set(
    manualRows.filter((r) => r.status === 'maintenance').map((r) => r.date)
  );

  const datesToFree = nights.filter((ymd) => {
    if (maintenanceDates.has(ymd)) return false;
    const stillBooked = otherReservations.some((r) => ymd >= r.checkIn && ymd < r.checkOut);
    return !stillBooked;
  });

  if (datesToFree.length > 0) {
    await Availability.update(
      { status: 'available' },
      {
        where: { date: { [Op.in]: datesToFree } },
        transaction
      }
    );
  }
}

module.exports = {
  ACTIVE_RESERVATION_STATUSES,
  getRangeDetails,
  getMonthCalendar,
  isRangeAvailable,
  setDatesStatus,
  updateRangeStatus,
  freeDatesIfUnoccupied
};
