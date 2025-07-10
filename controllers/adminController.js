const { Reservation, Availability, User } = require('../models');
const moment = require('moment');
const { body, validationResult } = require('express-validator');

exports.dashboard = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const nextWeek = moment().add(7, 'days').endOf('day');
    
    // Get recent reservations
    const recentReservations = await Reservation.findAll({
      where: {
        checkIn: {
          [require('sequelize').Op.between]: [today.toDate(), nextWeek.toDate()]
        }
      },
      order: [['checkIn', 'ASC']],
      limit: 5
    });

    // Get statistics
    const stats = {
      totalReservations: await Reservation.count(),
      pendingReservations: await Reservation.count({ where: { status: 'pending' } }),
      thisMonthReservations: await Reservation.count({
        where: {
          createdAt: {
            [require('sequelize').Op.gte]: moment().startOf('month').toDate()
          }
        }
      }),
      thisMonthRevenue: await Reservation.sum('totalPrice', {
        where: {
          createdAt: {
            [require('sequelize').Op.gte]: moment().startOf('month').toDate()
          },
          status: 'confirmed'
        }
      }) || 0
    };

    res.render('admin/dashboard', {
      title: 'Panel de Administración',
      user: req.session.user,
      recentReservations: recentReservations.map(r => ({
        ...r.toJSON(),
        checkIn: moment(r.checkIn).format('DD/MM/YYYY'),
        checkOut: moment(r.checkOut).format('DD/MM/YYYY'),
        totalPrice: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(r.totalPrice)
      })),
      stats: {
        ...stats,
        thisMonthRevenue: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(stats.thisMonthRevenue)
      }
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar el panel de administración'
    });
  }
};

exports.reservations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: reservations } = await Reservation.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    res.render('admin/reservations', {
      title: 'Gestión de Reservas',
      user: req.session.user,
      reservations: reservations.map(r => ({
        ...r.toJSON(),
        checkIn: moment(r.checkIn).format('DD/MM/YYYY'),
        checkOut: moment(r.checkOut).format('DD/MM/YYYY'),
        createdAt: moment(r.createdAt).format('DD/MM/YYYY HH:mm'),
        totalPrice: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(r.totalPrice)
      })),
      pagination: {
        currentPage: page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error loading reservations:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar las reservas'
    });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findByPk(id);

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Update reservation status
    await reservation.update({ status: 'cancelled' });

    // Free up the dates
    await freeUpDates(moment(reservation.checkIn), moment(reservation.checkOut));

    res.json({ success: true, message: 'Reserva cancelada exitosamente' });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ error: 'Error al cancelar la reserva' });
  }
};

exports.calendar = async (req, res) => {
  try {
    const currentMonth = moment().format('YYYY-MM');
    
    res.render('admin/calendar', {
      title: 'Calendario de Disponibilidad',
      user: req.session.user,
      currentMonth
    });
  } catch (error) {
    console.error('Error loading calendar:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar el calendario'
    });
  }
};

exports.updateAvailability = [
  body('date').isISO8601().withMessage('Fecha inválida'),
  body('status').isIn(['available', 'occupied', 'maintenance']).withMessage('Estado inválido'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { date, status, notes } = req.body;

      await Availability.upsert({
        date: moment(date).toDate(),
        status,
        notes: notes || null
      });

      res.json({ success: true, message: 'Disponibilidad actualizada' });
    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({ error: 'Error al actualizar disponibilidad' });
    }
  }
];

async function freeUpDates(checkIn, checkOut) {
  const dates = [];
  let current = checkIn.clone();
  
  while (current.isBefore(checkOut)) {
    dates.push(current.toDate());
    current.add(1, 'day');
  }

  for (const date of dates) {
    await Availability.upsert({
      date,
      status: 'available'
    });
  }
}