const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const reservationController = require('../controllers/reservationController');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

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
router.post('/reservar', reservationController.createReservation);
router.get('/api/availability/:year/:month', reservationController.getAvailability);

// Auth routes
router.get('/admin/login', authController.showLogin);
router.post('/admin/login', authController.login);
router.get('/admin/logout', authController.logout);

// Admin routes (protected)
router.get('/admin', requireAdmin, adminController.dashboard);
router.get('/admin/reservas', requireAdmin, adminController.reservations);
router.post('/admin/reservas/:id/cancel', requireAdmin, adminController.cancelReservation);
router.get('/admin/calendario', requireAdmin, adminController.calendar);
router.post('/admin/availability', requireAdmin, adminController.updateAvailability);

module.exports = router;