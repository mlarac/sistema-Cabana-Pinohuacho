const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Reservation } = require('../models');
const cabin = require('../config/cabin');
const { eachNight, todayYMD, isValidYMD } = require('./dateUtils');
const pricingService = require('./pricingService');
const availabilityService = require('./availabilityService');

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function generateUniqueBookingCode(checkIn, transaction) {
  const year = checkIn.slice(0, 4);
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `PH-${year}-${suffix}`;
    const exists = await Reservation.count({
      where: { bookingCode: code },
      transaction
    });
    if (exists === 0) return code;
  }
  return `PH-${year}-${Date.now().toString().slice(-6)}`;
}

async function createReservation(payload, { status = 'pending', userId = null, allowPast = false } = {}) {
  const { guestName, guestEmail, guestPhone, checkIn, checkOut, guests, notes } = payload;

  if (!isValidYMD(checkIn) || !isValidYMD(checkOut)) {
    throw new AppError('Fechas de entrada o salida inválidas', 400);
  }

  if (!allowPast && checkIn < todayYMD()) {
    throw new AppError('La fecha de entrada no puede ser anterior a hoy', 400);
  }

  if (checkOut <= checkIn) {
    throw new AppError('La fecha de salida debe ser posterior a la fecha de entrada', 400);
  }

  const guestsNum = parseInt(guests, 10);
  if (Number.isNaN(guestsNum) || guestsNum < 1 || guestsNum > cabin.maxGuests) {
    throw new AppError(`El número de huéspedes debe ser entre 1 y ${cabin.maxGuests}`, 400);
  }

  return sequelize.transaction(async (transaction) => {
    const available = await availabilityService.isRangeAvailable(checkIn, checkOut, { transaction });
    if (!available) {
      throw new AppError('Las fechas seleccionadas no están disponibles', 409);
    }

    const pricing = await pricingService.calculateRangePrice(checkIn, checkOut, { transaction });
    const bookingCode = await generateUniqueBookingCode(checkIn, transaction);

    const reservation = await Reservation.create(
      {
        bookingCode,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim().toLowerCase(),
        guestPhone: guestPhone.trim(),
        checkIn,
        checkOut,
        guests: guestsNum,
        status,
        totalPrice: pricing.totalPrice,
        notes: notes ? String(notes).trim() : null,
        UserId: userId
      },
      { transaction }
    );

    const nights = eachNight(checkIn, checkOut);
    await availabilityService.setDatesStatus(nights, 'occupied', { transaction });

    return { reservation, pricing };
  });
}

async function confirmReservation(id) {
  return sequelize.transaction(async (transaction) => {
    const reservation = await Reservation.findByPk(id, { transaction });
    if (!reservation) {
      throw new AppError('Reserva no encontrada', 404);
    }
    if (reservation.status === 'cancelled') {
      throw new AppError('No se puede confirmar una reserva cancelada', 400);
    }
    if (reservation.status === 'confirmed') {
      return reservation;
    }

    await reservation.update({ status: 'confirmed' }, { transaction });
    const nights = eachNight(reservation.checkIn, reservation.checkOut);
    await availabilityService.setDatesStatus(nights, 'occupied', { transaction });

    return reservation;
  });
}

async function cancelReservation(id) {
  return sequelize.transaction(async (transaction) => {
    const reservation = await Reservation.findByPk(id, { transaction });
    if (!reservation) {
      throw new AppError('Reserva no encontrada', 404);
    }
    if (reservation.status === 'cancelled') {
      return reservation;
    }

    await reservation.update({ status: 'cancelled' }, { transaction });
    await availabilityService.freeDatesIfUnoccupied(
      reservation.checkIn,
      reservation.checkOut,
      { excludeReservationId: reservation.id, transaction }
    );

    return reservation;
  });
}

async function updateReservation(id, updates) {
  return sequelize.transaction(async (transaction) => {
    const reservation = await Reservation.findByPk(id, { transaction });
    if (!reservation) {
      throw new AppError('Reserva no encontrada', 404);
    }

    const nextCheckIn = updates.checkIn || reservation.checkIn;
    const nextCheckOut = updates.checkOut || reservation.checkOut;
    const nextGuests = updates.guests !== undefined ? parseInt(updates.guests, 10) : reservation.guests;
    const nextStatus = updates.status || reservation.status;

    if (!isValidYMD(nextCheckIn) || !isValidYMD(nextCheckOut) || nextCheckOut <= nextCheckIn) {
      throw new AppError('Rango de fechas inválido', 400);
    }
    if (Number.isNaN(nextGuests) || nextGuests < 1 || nextGuests > cabin.maxGuests) {
      throw new AppError(`El número de huéspedes debe ser entre 1 y ${cabin.maxGuests}`, 400);
    }

    const datesChanged = nextCheckIn !== reservation.checkIn || nextCheckOut !== reservation.checkOut;
    const oldNights = reservation.status !== 'cancelled'
      ? eachNight(reservation.checkIn, reservation.checkOut)
      : [];

    if (nextStatus !== 'cancelled' && (datesChanged || reservation.status === 'cancelled')) {
      const available = await availabilityService.isRangeAvailable(nextCheckIn, nextCheckOut, {
        excludeReservationId: reservation.id,
        allowedOccupiedDates: oldNights,
        transaction
      });
      if (!available) {
        throw new AppError('Las nuevas fechas seleccionadas no están disponibles', 409);
      }
    }

    let nextTotalPrice = parseFloat(reservation.totalPrice);
    if (updates.totalPrice !== undefined && updates.totalPrice !== '') {
      nextTotalPrice = parseFloat(updates.totalPrice);
    } else if (datesChanged) {
      const pricing = await pricingService.calculateRangePrice(nextCheckIn, nextCheckOut, { transaction });
      nextTotalPrice = pricing.totalPrice;
    }

    const prevCheckIn = reservation.checkIn;
    const prevCheckOut = reservation.checkOut;

    await reservation.update(
      {
        guestName: updates.guestName ? updates.guestName.trim() : reservation.guestName,
        guestEmail: updates.guestEmail ? updates.guestEmail.trim().toLowerCase() : reservation.guestEmail,
        guestPhone: updates.guestPhone ? updates.guestPhone.trim() : reservation.guestPhone,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        guests: nextGuests,
        status: nextStatus,
        totalPrice: nextTotalPrice,
        notes: updates.notes !== undefined ? (updates.notes ? String(updates.notes).trim() : null) : reservation.notes
      },
      { transaction }
    );

    if (nextStatus === 'cancelled') {
      await availabilityService.freeDatesIfUnoccupied(prevCheckIn, prevCheckOut, {
        excludeReservationId: reservation.id,
        transaction
      });
    } else {
      if (datesChanged) {
        await availabilityService.freeDatesIfUnoccupied(prevCheckIn, prevCheckOut, {
          excludeReservationId: reservation.id,
          transaction
        });
      }
      await availabilityService.setDatesStatus(eachNight(nextCheckIn, nextCheckOut), 'occupied', { transaction });
    }

    return reservation;
  });
}

async function lookupByCodeAndEmail(bookingCode, email) {
  const cleanCode = String(bookingCode || '').trim().toUpperCase();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanCode || !cleanEmail) return null;

  return Reservation.findOne({
    where: {
      bookingCode: cleanCode,
      guestEmail: { [Op.like]: cleanEmail }
    }
  });
}

module.exports = {
  AppError,
  createReservation,
  confirmReservation,
  cancelReservation,
  updateReservation,
  lookupByCodeAndEmail
};
