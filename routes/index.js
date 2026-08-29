const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const reservationController = require('../controllers/reservationController');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const priceController = require('../controllers/priceController');

// Middleware for admin authentication
const requireAdmin = (req, res, next) => {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.redirect('/admin/login');
  }
  next();
};

// Public routes
router.get('/', homeController.index);
router.get('/caracteristicas', homeController.features);
router.get('/reservar', reservationController.showBookingForm);

/**
 * @swagger
 * /reservar:
 *   post:
 *     summary: Crea una nueva reserva
 *     description: Registra la reserva en la base de datos, marca los días como ocupados y envía confirmación por email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - guestName
 *               - guestEmail
 *               - guestPhone
 *               - checkIn
 *               - checkOut
 *               - guests
 *             properties:
 *               guestName:
 *                 type: string
 *               guestEmail:
 *                 type: string
 *               guestPhone:
 *                 type: string
 *               checkIn:
 *                 type: string
 *                 format: date
 *               checkOut:
 *                 type: string
 *                 format: date
 *               guests:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reserva confirmada y página de éxito renderizada
 *       400:
 *         description: Errores de validación
 */
router.post('/reservar', reservationController.createReservation);

/**
 * @swagger
 * /api/availability/{year}/{month}:
 *   get:
 *     summary: Obtiene la disponibilidad diaria de un mes específico
 *     description: Retorna un objeto con las fechas como claves y su estado de disponibilidad.
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: string
 *         description: Año en formato YYYY (ej. 2026)
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: string
 *         description: Mes en formato MM (ej. 06)
 *     responses:
 *       200:
 *         description: Objeto de disponibilidad obtenido con éxito
 */
router.get('/api/availability/:year/:month', reservationController.getAvailability);

/**
 * @swagger
 * /api/precio:
 *   get:
 *     summary: Obtiene el precio por noche configurado para el día de hoy
 *     description: Retorna el precio base o especial para el día actual.
 *     responses:
 *       200:
 *         description: Precio obtenido con éxito
 */
router.get('/api/precio', priceController.getCurrentPrice);

/**
 * @swagger
 * /api/precio/range:
 *   get:
 *     summary: Obtiene el precio total y desglose de un rango de fechas
 *     description: Retorna la suma de los precios diarios para la estadía especificada.
 *     parameters:
 *       - in: query
 *         name: checkIn
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de entrada (YYYY-MM-DD)
 *       - in: query
 *         name: checkOut
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de salida (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Desglose de precios y total obtenido con éxito
 */
router.get('/api/precio/range', priceController.getPriceRange);

// Auth routes
router.get('/admin/login', authController.showLogin);

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Iniciar sesión de administrador
 *     description: Autentica un usuario administrador y guarda la sesión.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/admin/login', authController.login);
router.get('/admin/logout', authController.logout);

// Admin routes (protected)
router.get('/admin', requireAdmin, adminController.dashboard);
router.get('/admin/reservas', requireAdmin, adminController.reservations);
router.post('/admin/reservas/:id/cancel', requireAdmin, adminController.cancelReservation);
router.get('/admin/calendario', requireAdmin, adminController.calendar);
router.post('/admin/availability', requireAdmin, adminController.updateAvailability);
router.post('/admin/availability-range', requireAdmin, adminController.updateAvailabilityRange);

// Precios admin
router.get('/admin/precios', requireAdmin, priceController.showPricesPage);
router.post('/admin/precios/update-category', requireAdmin, priceController.updatePricesByCategory);
router.post('/admin/precios/update-range', requireAdmin, priceController.updatePricesByRange);
router.post('/admin/precios/update-single', requireAdmin, priceController.updateSinglePrice);

module.exports = router;