process.env.NODE_ENV = 'test';

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { sequelize, Reservation, Availability } = require('../models');
const reservationService = require('../services/reservationService');
const availabilityService = require('../services/availabilityService');
const pricingService = require('../services/pricingService');

describe('ReservationService & AvailabilityService', () => {
  before(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Reservation.destroy({ where: {}, truncate: true });
    await Availability.destroy({ where: {}, truncate: true });
  });

  const basePayload = {
    guestName: 'María González',
    guestEmail: 'maria@example.com',
    guestPhone: '+56 9 8765 4321',
    checkIn: '2027-06-10',
    checkOut: '2027-06-13',
    guests: 4,
    notes: 'Llegada a las 16:00'
  };

  it('creates reservation in pending state with bookingCode and locks nights', async () => {
    const { reservation, pricing } = await reservationService.createReservation(basePayload);

    assert.equal(reservation.status, 'pending');
    assert.match(reservation.bookingCode, /^PH-2027-[A-F0-9]{4}$/);
    assert.equal(pricing.nights, 3);
    assert.equal(parseFloat(reservation.totalPrice), 150000);

    const occupiedCount = await Availability.count({ where: { status: 'occupied' } });
    assert.equal(occupiedCount, 3);
  });

  it('allows back-to-back check-in on the exact same day another guest checks out', async () => {
    await reservationService.createReservation({
      ...basePayload,
      checkIn: '2027-06-10',
      checkOut: '2027-06-13'
    });

    const { reservation: second } = await reservationService.createReservation({
      ...basePayload,
      guestEmail: 'carlos@example.com',
      checkIn: '2027-06-13',
      checkOut: '2027-06-15'
    });

    assert.equal(second.checkIn, '2027-06-13');
    assert.equal(second.checkOut, '2027-06-15');
  });

  it('rejects overlapping reservation and manual maintenance days', async () => {
    await reservationService.createReservation(basePayload);

    await assert.rejects(
      () =>
        reservationService.createReservation({
          ...basePayload,
          checkIn: '2027-06-12',
          checkOut: '2027-06-14'
        }),
      /no están disponibles/i
    );

    // Bloqueo manual por mantenimiento
    await availabilityService.updateRangeStatus('2027-07-05', '2027-07-06', 'maintenance', 'Reparación estufa');

    await assert.rejects(
      () =>
        reservationService.createReservation({
          ...basePayload,
          checkIn: '2027-07-04',
          checkOut: '2027-07-07'
        }),
      /no están disponibles/i
    );
  });

  it('rejects more than 5 guests (unified cabin capacity)', async () => {
    await assert.rejects(
      () =>
        reservationService.createReservation({
          ...basePayload,
          guests: 6
        }),
      /entre 1 y 5/i
    );
  });

  it('cancelling frees dates while keeping custom prices intact', async () => {
    await pricingService.updatePricesByDateRange('2027-08-01', '2027-08-03', 95000, 'special');
    const { reservation } = await reservationService.createReservation({
      ...basePayload,
      checkIn: '2027-08-01',
      checkOut: '2027-08-03'
    });

    await reservationService.cancelReservation(reservation.id);

    const avail = await Availability.findOne({ where: { date: '2027-08-01' } });
    assert.equal(avail.status, 'available');
    assert.equal(parseFloat(avail.price), 95000);
  });

  it('edits reservation dates cleanly and looks up by bookingCode + email', async () => {
    const { reservation } = await reservationService.createReservation(basePayload);
    await reservationService.confirmReservation(reservation.id);

    const updated = await reservationService.updateReservation(reservation.id, {
      checkIn: '2027-06-11',
      checkOut: '2027-06-15'
    });

    assert.equal(updated.checkIn, '2027-06-11');
    assert.equal(updated.checkOut, '2027-06-15');
    assert.equal(parseFloat(updated.totalPrice), 200000);

    const freedNight = await Availability.findOne({ where: { date: '2027-06-10' } });
    assert.equal(freedNight.status, 'available');

    const found = await reservationService.lookupByCodeAndEmail(
      reservation.bookingCode.toLowerCase(),
      'MARIA@EXAMPLE.COM'
    );
    assert.equal(found.id, reservation.id);
    assert.equal(found.status, 'confirmed');
  });
});
