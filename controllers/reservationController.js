const { Reservation, Availability } = require('../models');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.showBookingForm = async (req, res) => {
  try {
    // Get query parameters for pre-filled dates
    const { checkIn, checkOut } = req.query;
    
    res.render('booking', {
      title: 'Reservar Cabaña - Pino Huacho',
      prefilledData: {
        checkIn: checkIn || '',
        checkOut: checkOut || ''
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

exports.createReservation = [
  // Validation middleware
  body('guestName').trim().isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
  body('guestEmail').isEmail().withMessage('Ingrese un email válido'),
  body('guestPhone').trim().isLength({ min: 8 }).withMessage('Ingrese un teléfono válido'),
  body('checkIn').isISO8601().withMessage('Fecha de entrada inválida'),
  body('checkOut').isISO8601().withMessage('Fecha de salida inválida'),
  body('guests').isInt({ min: 1, max: 6 }).withMessage('Número de huéspedes debe ser entre 1 y 6'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('booking', {
          title: 'Reservar Cabaña - Pino Huacho',
          errors: errors.array(),
          formData: req.body
        });
      }

      const { guestName, guestEmail, guestPhone, checkIn, checkOut, guests, notes } = req.body;
      
      // Validate dates
      const checkInDate = moment(checkIn);
      const checkOutDate = moment(checkOut);
      
      if (checkInDate.isBefore(moment(), 'day')) {
        return res.render('booking', {
          title: 'Reservar Cabaña - Pino Huacho',
          errors: [{ msg: 'La fecha de entrada no puede ser anterior a hoy' }],
          formData: req.body
        });
      }

      if (checkOutDate.isSameOrBefore(checkInDate)) {
        return res.render('booking', {
          title: 'Reservar Cabaña - Pino Huacho',
          errors: [{ msg: 'La fecha de salida debe ser posterior a la fecha de entrada' }],
          formData: req.body
        });
      }

      // Check availability
      const isAvailable = await checkDateAvailability(checkInDate, checkOutDate);
      if (!isAvailable) {
        return res.render('booking', {
          title: 'Reservar Cabaña - Pino Huacho',
          errors: [{ msg: 'Las fechas seleccionadas no están disponibles' }],
          formData: req.body
        });
      }

      // Calculate total price
      const nights = checkOutDate.diff(checkInDate, 'days');
      const pricePerNight = 150000; // CLP
      const totalPrice = nights * pricePerNight;

      // Create reservation
      const reservation = await Reservation.create({
        guestName,
        guestEmail,
        guestPhone,
        checkIn: checkInDate.toDate(),
        checkOut: checkOutDate.toDate(),
        guests: parseInt(guests),
        totalPrice,
        notes: notes || null
      });

      // Mark dates as occupied
      await markDatesAsOccupied(checkInDate, checkOutDate);

      // Send confirmation email
      await sendConfirmationEmail(reservation);

      res.render('booking-success', {
        title: 'Reserva Confirmada',
        reservation: {
          ...reservation.toJSON(),
          checkIn: moment(reservation.checkIn).format('DD/MM/YYYY'),
          checkOut: moment(reservation.checkOut).format('DD/MM/YYYY'),
          totalPrice: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalPrice)
        }
      });

    } catch (error) {
      console.error('Error creating reservation:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error al procesar la reserva. Por favor, inténtelo de nuevo.'
      });
    }
  }
];

exports.getAvailability = async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = moment(`${year}-${month}-01`);
    const endDate = startDate.clone().endOf('month');

    // Get reservations for the month
    const reservations = await Reservation.findAll({
      where: {
        checkOut: {
          [require('sequelize').Op.gte]: startDate.toDate()
        },
        checkIn: {
          [require('sequelize').Op.lte]: endDate.toDate()
        },
        status: ['confirmed', 'pending']
      }
    });

    // Get manual availability settings
    const availability = await Availability.findAll({
      where: {
        date: {
          [require('sequelize').Op.between]: [startDate.toDate(), endDate.toDate()]
        }
      }
    });

    // Build calendar data
    const calendar = {};
    let current = startDate.clone();
    
    while (current.isSameOrBefore(endDate)) {
      const dateStr = current.format('YYYY-MM-DD');
      calendar[dateStr] = 'available';
      
      // Check if date is in a reservation
      for (const reservation of reservations) {
        const resCheckIn = moment(reservation.checkIn);
        const resCheckOut = moment(reservation.checkOut);
        
        if (current.isSameOrAfter(resCheckIn, 'day') && current.isBefore(resCheckOut, 'day')) {
          calendar[dateStr] = 'occupied';
          break;
        }
      }
      
      // Check manual availability settings
      const manualSetting = availability.find(a => moment(a.date).isSame(current, 'day'));
      if (manualSetting) {
        calendar[dateStr] = manualSetting.status;
      }
      
      current.add(1, 'day');
    }

    res.json(calendar);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Error al obtener disponibilidad' });
  }
};

async function checkDateAvailability(checkIn, checkOut) {
  const reservations = await Reservation.findAll({
    where: {
      [require('sequelize').Op.or]: [
        {
          checkIn: {
            [require('sequelize').Op.between]: [checkIn.toDate(), checkOut.toDate()]
          }
        },
        {
          checkOut: {
            [require('sequelize').Op.between]: [checkIn.toDate(), checkOut.toDate()]
          }
        },
        {
          [require('sequelize').Op.and]: [
            {
              checkIn: {
                [require('sequelize').Op.lte]: checkIn.toDate()
              }
            },
            {
              checkOut: {
                [require('sequelize').Op.gte]: checkOut.toDate()
              }
            }
          ]
        }
      ],
      status: ['confirmed', 'pending']
    }
  });

  return reservations.length === 0;
}

async function markDatesAsOccupied(checkIn, checkOut) {
  const dates = [];
  let current = checkIn.clone();
  
  while (current.isBefore(checkOut)) {
    dates.push(current.toDate());
    current.add(1, 'day');
  }

  for (const date of dates) {
    await Availability.upsert({
      date,
      status: 'occupied'
    });
  }
}

async function sendConfirmationEmail(reservation) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: reservation.guestEmail,
      subject: 'Confirmación de Reserva - Cabaña Pino Huacho',
      html: `
        <h2>¡Reserva Confirmada!</h2>
        <p>Estimado/a ${reservation.guestName},</p>
        <p>Su reserva ha sido confirmada exitosamente.</p>
        
        <h3>Detalles de la Reserva:</h3>
        <ul>
          <li><strong>Fecha de entrada:</strong> ${moment(reservation.checkIn).format('DD/MM/YYYY')}</li>
          <li><strong>Fecha de salida:</strong> ${moment(reservation.checkOut).format('DD/MM/YYYY')}</li>
          <li><strong>Número de huéspedes:</strong> ${reservation.guests}</li>
          <li><strong>Total:</strong> ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(reservation.totalPrice)}</li>
        </ul>
        
        <p>¡Esperamos su visita a nuestra hermosa cabaña en Pino Huacho!</p>
        
        <p>Saludos cordiales,<br>
        Equipo Cabaña Pino Huacho</p>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}