const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');
const reservationController = require('../controllers/reservationController');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const priceController = require('../controllers/priceController');

const { requireAdmin } = require('../middleware/auth');
const { loginLimiter, bookingLimiter, apiLimiter } = require('../middleware/rateLimit');
const {
  reservationFormValidators,
  availabilityMonthValidators,
  availabilityRangeQueryValidators,
  priceRangeQueryValidators,
  updateSingleAvailabilityValidators,
  updateRangeAvailabilityValidators,
  updateCategoryPriceValidators,
  updateRangePriceValidators,
  updateSinglePriceValidators
} = require('../middleware/validators');

// Public routes
router.get('/', homeController.index);
router.get('/caracteristicas', homeController.features);
router.get('/sitemap.xml', homeController.sitemap);

router.get('/reservar', reservationController.showBookingForm);

/**
 * @swagger
 * /reservar:
 *   post:
 *     summary: Crea una nueva solicitud de reserva (estado pendiente)
 *     description: Registra la solicitud en una transacción, bloquea las noches y notifica por correo.
 *     responses:
 *       200:
 *         description: Solicitud creada exitosamente
 *       400:
 *         description: Errores de validación
 *       409:
 *         description: Fechas no disponibles
 */
router.post('/reservar', bookingLimiter, reservationFormValidators, reservationController.createReservation);

router.get('/consultar-reserva', reservationController.showLookupForm);
router.post('/consultar-reserva', apiLimiter, reservationController.lookupReservation);

// Public API endpoints
/**
 * @swagger
 * /api/availability/{year}/{month}:
 *   get:
 *     summary: Obtiene la disponibilidad diaria de un mes específico
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: detailed
 *         required: false
 *         schema:
 *           type: string
 *         description: Si es "1", retorna estado, precio y categoría por fecha
 *     responses:
 *       200:
 *         description: Disponibilidad mensual
 */
router.get('/api/availability/:year/:month', apiLimiter, availabilityMonthValidators, reservationController.getAvailability);

/**
 * @swagger
 * /api/availability/range:
 *   get:
 *     summary: Consulta disponibilidad y precios para un rango de fechas (soporta múltiples meses)
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Estado del rango y conflictos si existen
 */
router.get('/api/availability/range', apiLimiter, availabilityRangeQueryValidators, reservationController.getAvailabilityRange);

/**
 * @swagger
 * /api/precio:
 *   get:
 *     summary: Obtiene el precio por noche configurado para hoy
 *     responses:
 *       200:
 *         description: Precio diario actual
 */
router.get('/api/precio', apiLimiter, priceController.getCurrentPrice);

/**
 * @swagger
 * /api/precio/range:
 *   get:
 *     summary: Obtiene el precio total y desglose para una estadía
 *     parameters:
 *       - in: query
 *         name: checkIn
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: checkOut
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Desglose de precios y total
 */
router.get('/api/precio/range', apiLimiter, priceRangeQueryValidators, priceController.getPriceRange);

// Auth routes
router.get('/admin/login', authController.showLogin);
router.post('/admin/login', loginLimiter, authController.login);
router.post('/admin/logout', requireAdmin, authController.logout);

// Admin routes (protected)
router.get('/admin', requireAdmin, adminController.dashboard);
router.get('/admin/api/stats', requireAdmin, adminController.getStatsApi);

router.get('/admin/reservas', requireAdmin, adminController.reservations);
router.post('/admin/reservas', requireAdmin, reservationFormValidators, adminController.createManualReservation);
router.post('/admin/reservas/:id/confirm', requireAdmin, adminController.confirmReservation);
router.post('/admin/reservas/:id/cancel', requireAdmin, adminController.cancelReservation);
router.post('/admin/reservas/:id/edit', requireAdmin, adminController.updateReservation);
router.get('/admin/export/reservations', requireAdmin, adminController.exportReservationsCsv);

router.get('/admin/calendario', requireAdmin, adminController.calendar);
router.post('/admin/availability', requireAdmin, updateSingleAvailabilityValidators, adminController.updateAvailability);
router.post('/admin/availability-range', requireAdmin, updateRangeAvailabilityValidators, adminController.updateAvailabilityRange);

// Precios admin
router.get('/admin/precios', requireAdmin, priceController.showPricesPage);
router.post('/admin/precios/update-category', requireAdmin, updateCategoryPriceValidators, priceController.updatePricesByCategory);
router.post('/admin/precios/update-range', requireAdmin, updateRangePriceValidators, priceController.updatePricesByRange);
router.post('/admin/precios/update-single', requireAdmin, updateSinglePriceValidators, priceController.updateSinglePrice);

module.exports = router;
