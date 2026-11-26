const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).render('admin/login', {
      title: 'Acceso Administrativo',
      layout: false,
      errors: [{ msg: 'Demasiados intentos de inicio de sesión. Espera 15 minutos e inténtalo nuevamente.' }],
      formData: { username: req.body?.username || '' }
    });
  }
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).render('booking', {
      title: 'Reservar Cabaña - Pino Huacho',
      errors: [{ msg: 'Has enviado demasiadas solicitudes en poco tiempo. Intenta nuevamente más tarde.' }],
      formData: req.body
    });
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas, intenta nuevamente en unos minutos.' }
});

module.exports = {
  loginLimiter,
  bookingLimiter,
  apiLimiter
};
