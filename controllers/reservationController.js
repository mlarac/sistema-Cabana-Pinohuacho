const { validationResult } = require('express-validator');
const cabin = require('../config/cabin');
const { isValidYMD, todayYMD, formatCLDate, formatCLP, nightsBetween } = require('../services/dateUtils');
const pricingService = require('../services/pricingService');
const availabilityService = require('../services/availabilityService');
const reservationService = require('../services/reservationService');
const emailService = require('../services/emailService');

exports.showBookingForm = async (req, res) => {
  try {
    const { checkIn, checkOut } = req.query;
    let pricePerNight = cabin.defaultPrice;
    let totalPrice = 0;
    let nights = 0;

    if (checkIn && checkOut && isValidYMD(checkIn) && isValidYMD(checkOut) && checkOut > checkIn) {
      const pricing = await pricingService.calculateRangePrice(checkIn, checkOut);
      pricePerNight = pricing.averagePrice;
      totalPrice = pricing.totalPrice;
      nights = pricing.nights;
    } else {
      pricePerNight = await pricingService.getTodayPrice();
    }

    res.render('booking', {
      title: `Reservar - ${cabin.name}`,
      metaDescription: `Solicita tu reserva en ${cabin.name}. Verifica disponibilidad y tarifas por noche en línea.`,
      todayDate: todayYMD(),
      prefilledData: {
        checkIn: checkIn && isValidYMD(checkIn) ? checkIn : '',
        checkOut: checkOut && isValidYMD(checkOut) ? checkOut : '',
        pricePerNight,
        totalPrice,
        nights
      }
    });
  } catch (error) {
    console.error('Error loading booking form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar el formulario de reserva'
    });
  }
};

exports.createReservation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('booking', {
        title: `Reservar - ${cabin.name}`,
        todayDate: todayYMD(),
        errors: errors.array(),
        formData: req.body
      });
    }

    const { reservation, pricing } = await reservationService.createReservation(req.body, {
      status: 'pending'
    });

    const [guestMailResult] = await Promise.all([
      emailService.sendReservationReceivedEmail(reservation),
      emailService.sendAdminNewReservationEmail(reservation)
    ]);

    res.status(201).render('booking-success', {
      title: 'Solicitud de Reserva Recibida',
      emailSent: guestMailResult.sent,
      reservation: {
        ...reservation.toJSON(),
        checkIn: formatCLDate(reservation.checkIn),
        checkOut: formatCLDate(reservation.checkOut),
        nights: pricing.nights,
        totalPrice: formatCLP(reservation.totalPrice)
      }
    });
  } catch (error) {
    if (error instanceof reservationService.AppError) {
      return res.status(error.statusCode).render('booking', {
        title: `Reservar - ${cabin.name}`,
        todayDate: todayYMD(),
        errors: [{ msg: error.message }],
        formData: req.body
      });
    }

    console.error('Error creating reservation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al procesar la reserva. Por favor, inténtelo de nuevo.'
    });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Año o mes inválido', details: errors.array() });
    }

    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const { simple, details } = await availabilityService.getMonthCalendar(year, month);

    if (req.query.detailed === '1') {
      return res.json(details);
    }

    res.json(simple);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
};

exports.getAvailabilityRange = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Parámetros de rango inválidos', details: errors.array() });
    }

    const { start, end } = req.query;
    if (end <= start) {
      return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la fecha de entrada' });
    }

    const nights = nightsBetween(start, end);
    if (nights > 180) {
      return res.status(400).json({ error: 'El rango máximo de consulta es de 180 noches' });
    }

    // Revisamos las noches [start, end)
    const { addDays } = require('../services/dateUtils');
    const lastNight = addDays(end, -1);
    const days = await availabilityService.getRangeDetails(start, lastNight);
    const conflictDates = Object.entries(days)
      .filter(([, info]) => info.status !== 'available')
      .map(([ymd]) => ymd);

    res.json({
      available: conflictDates.length === 0,
      conflictDates,
      nights,
      days
    });
  } catch (error) {
    console.error('Error fetching range availability:', error);
    res.status(500).json({ error: 'Error al consultar disponibilidad del rango' });
  }
};

exports.showLookupForm = (req, res) => {
  res.render('booking-lookup', {
    title: `Consultar Reserva - ${cabin.name}`,
    reservation: null,
    error: null,
    formData: {
      bookingCode: req.query.code || '',
      guestEmail: ''
    }
  });
};

exports.lookupReservation = async (req, res) => {
  try {
    const { bookingCode, guestEmail } = req.body;
    if (!bookingCode || !guestEmail) {
      return res.status(400).render('booking-lookup', {
        title: `Consultar Reserva - ${cabin.name}`,
        reservation: null,
        error: 'Ingresa tu código de reserva y tu email para consultar.',
        formData: { bookingCode: bookingCode || '', guestEmail: guestEmail || '' }
      });
    }

    const found = await reservationService.lookupByCodeAndEmail(bookingCode, guestEmail);
    if (!found) {
      return res.status(404).render('booking-lookup', {
        title: `Consultar Reserva - ${cabin.name}`,
        reservation: null,
        error: 'No encontramos ninguna reserva que coincida con ese código y correo electrónico.',
        formData: { bookingCode, guestEmail }
      });
    }

    res.render('booking-lookup', {
      title: `Estado de Reserva ${found.bookingCode} - ${cabin.name}`,
      error: null,
      formData: { bookingCode, guestEmail },
      reservation: {
        ...found.toJSON(),
        checkInFormatted: formatCLDate(found.checkIn),
        checkOutFormatted: formatCLDate(found.checkOut),
        nights: nightsBetween(found.checkIn, found.checkOut),
        totalPriceFormatted: formatCLP(found.totalPrice)
      }
    });
  } catch (error) {
    console.error('Error looking up reservation:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'No se pudo consultar la reserva.'
    });
  }
};
