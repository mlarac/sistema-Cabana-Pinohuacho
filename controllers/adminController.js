const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { Reservation } = require('../models');
const {
  todayYMD,
  addDays,
  formatCLDate,
  formatCLDateTime,
  formatCLP
} = require('../services/dateUtils');
const availabilityService = require('../services/availabilityService');
const reservationService = require('../services/reservationService');
const emailService = require('../services/emailService');

function escapeCsvCell(value) {
  let str = String(value ?? '').replace(/\r?\n/g, ' ');
  // Protege contra CSV formula injection en Excel
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes('"') || str.includes(',') || str.includes(';')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function computeDashboardStats() {
  const today = todayYMD();
  const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00`);

  const [totalReservations, pendingReservations, thisMonthReservations, thisMonthRevenue] = await Promise.all([
    Reservation.count({
      where: { status: { [Op.ne]: 'cancelled' } }
    }),
    Reservation.count({
      where: { status: 'pending' }
    }),
    Reservation.count({
      where: {
        status: { [Op.ne]: 'cancelled' },
        createdAt: { [Op.gte]: monthStart }
      }
    }),
    Reservation.sum('totalPrice', {
      where: {
        status: 'confirmed',
        createdAt: { [Op.gte]: monthStart }
      }
    })
  ]);

  return {
    totalReservations,
    pendingReservations,
    thisMonthReservations,
    thisMonthRevenueRaw: Number(thisMonthRevenue) || 0,
    thisMonthRevenue: formatCLP(thisMonthRevenue || 0)
  };
}

exports.dashboard = async (req, res) => {
  try {
    const today = todayYMD();
    const nextTwoWeeks = addDays(today, 14);

    const [recentReservations, stats] = await Promise.all([
      Reservation.findAll({
        where: {
          status: { [Op.in]: ['pending', 'confirmed'] },
          checkIn: { [Op.between]: [today, nextTwoWeeks] }
        },
        order: [['checkIn', 'ASC']],
        limit: 8
      }),
      computeDashboardStats()
    ]);

    res.render('admin/dashboard', {
      layout: 'admin/layout',
      title: 'Panel de Administración',
      user: req.session.user,
      recentReservations: recentReservations.map((r) => ({
        ...r.toJSON(),
        checkIn: formatCLDate(r.checkIn),
        checkOut: formatCLDate(r.checkOut),
        totalPrice: formatCLP(r.totalPrice)
      })),
      stats
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar el panel de administración'
    });
  }
};

exports.getStatsApi = async (req, res) => {
  try {
    const stats = await computeDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

exports.reservations = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const statusFilter = ['pending', 'confirmed', 'cancelled'].includes(req.query.status)
      ? req.query.status
      : '';
    const searchQuery = String(req.query.q || '').trim();

    const where = {};
    if (statusFilter) {
      where.status = statusFilter;
    }
    if (searchQuery) {
      const pattern = `%${searchQuery}%`;
      where[Op.or] = [
        { guestName: { [Op.like]: pattern } },
        { guestEmail: { [Op.like]: pattern } },
        { guestPhone: { [Op.like]: pattern } },
        { bookingCode: { [Op.like]: pattern } }
      ];
    }

    const { count, rows: reservations } = await Reservation.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.max(1, Math.ceil(count / limit));

    res.render('admin/reservations', {
      layout: 'admin/layout',
      title: 'Gestión de Reservas',
      user: req.session.user,
      totalCount: count,
      filters: {
        status: statusFilter,
        q: searchQuery
      },
      reservations: reservations.map((r) => ({
        ...r.toJSON(),
        rawCheckIn: r.checkIn,
        rawCheckOut: r.checkOut,
        rawTotalPrice: parseFloat(r.totalPrice),
        checkIn: formatCLDate(r.checkIn),
        checkOut: formatCLDate(r.checkOut),
        createdAt: formatCLDateTime(r.createdAt),
        totalPrice: formatCLP(r.totalPrice)
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

exports.createManualReservation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const status = ['pending', 'confirmed'].includes(req.body.status) ? req.body.status : 'confirmed';
    const { reservation } = await reservationService.createReservation(req.body, {
      status,
      userId: req.session.user.id,
      allowPast: true
    });

    if (status === 'confirmed') {
      await emailService.sendReservationConfirmedEmail(reservation);
    }

    res.status(201).json({
      success: true,
      message: `Reserva ${reservation.bookingCode} creada exitosamente`,
      reservation
    });
  } catch (error) {
    if (error instanceof reservationService.AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Error creating manual reservation:', error);
    res.status(500).json({ success: false, error: 'Error al crear la reserva manual' });
  }
};

exports.confirmReservation = async (req, res) => {
  try {
    const reservation = await reservationService.confirmReservation(req.params.id);
    await emailService.sendReservationConfirmedEmail(reservation);

    res.json({
      success: true,
      message: `Reserva ${reservation.bookingCode || '#' + reservation.id} confirmada exitosamente`,
      status: reservation.status
    });
  } catch (error) {
    if (error instanceof reservationService.AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Error confirming reservation:', error);
    res.status(500).json({ success: false, error: 'Error al confirmar la reserva' });
  }
};

exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await reservationService.cancelReservation(req.params.id);
    await emailService.sendReservationCancelledEmail(reservation);

    res.json({
      success: true,
      message: 'Reserva cancelada exitosamente y fechas liberadas'
    });
  } catch (error) {
    if (error instanceof reservationService.AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ success: false, error: 'Error al cancelar la reserva' });
  }
};

exports.updateReservation = async (req, res) => {
  try {
    const reservation = await reservationService.updateReservation(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Reserva actualizada exitosamente',
      reservation
    });
  } catch (error) {
    if (error instanceof reservationService.AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Error updating reservation:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar la reserva' });
  }
};

exports.exportReservationsCsv = async (req, res) => {
  try {
    const statusFilter = ['pending', 'confirmed', 'cancelled'].includes(req.query.status)
      ? req.query.status
      : '';
    const where = statusFilter ? { status: statusFilter } : {};

    const rows = await Reservation.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    const headers = [
      'ID',
      'Codigo',
      'Huesped',
      'Email',
      'Telefono',
      'Entrada',
      'Salida',
      'Huespedes',
      'Estado',
      'Total CLP',
      'Notas',
      'Creada'
    ];

    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.bookingCode || '',
          r.guestName,
          r.guestEmail,
          r.guestPhone,
          r.checkIn,
          r.checkOut,
          r.guests,
          r.status,
          parseFloat(r.totalPrice),
          r.notes || '',
          formatCLDateTime(r.createdAt)
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }

    const csv = `\uFEFF${lines.join('\r\n')}`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reservas-pino-huacho-${todayYMD()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'No se pudo exportar el archivo CSV.'
    });
  }
};

exports.calendar = async (req, res) => {
  try {
    const today = todayYMD();
    const [year, month] = today.split('-').map(Number);

    // Genera lista limpia de 12 meses desde el mes actual sin bug de días 29-31
    const monthOptions = [];
    for (let offset = 0; offset < 12; offset++) {
      const dt = new Date(Date.UTC(year, month - 1 + offset, 1));
      const optYear = dt.getUTCFullYear();
      const optMonth = dt.getUTCMonth() + 1;
      const label = new Intl.DateTimeFormat('es-CL', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(dt);

      monthOptions.push({
        value: `${optYear}-${String(optMonth).padStart(2, '0')}`,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      });
    }

    res.render('admin/calendar', {
      layout: 'admin/layout',
      title: 'Calendario de Disponibilidad',
      user: req.session.user,
      currentMonth: `${year}-${String(month).padStart(2, '0')}`,
      monthOptions,
      todayDate: today
    });
  } catch (error) {
    console.error('Error loading calendar:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar el calendario'
    });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg, errors: errors.array() });
    }

    const { date, status, notes } = req.body;
    await availabilityService.setDatesStatus([date], status, {
      notes: notes !== undefined ? (notes || null) : undefined
    });

    res.json({ success: true, message: 'Disponibilidad actualizada correctamente' });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar disponibilidad' });
  }
};

exports.updateAvailabilityRange = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { startDate, endDate, status, notes } = req.body;
    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio'
      });
    }

    const updatedDays = await availabilityService.updateRangeStatus(
      startDate,
      endDate,
      status,
      notes !== undefined ? (notes || null) : undefined
    );

    res.json({
      success: true,
      message: `Disponibilidad actualizada para ${updatedDays} día(s)`
    });
  } catch (error) {
    console.error('Error updating availability range:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la disponibilidad por rango de fechas'
    });
  }
};
