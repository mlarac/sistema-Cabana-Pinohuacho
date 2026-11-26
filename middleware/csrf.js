const crypto = require('crypto');
const { wantsJson } = require('./auth');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function ensureCsrfToken(req, res, next) {
  if (!req.session) return next();
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const sessionToken = req.session && req.session.csrfToken;
  const submittedToken =
    (req.body && req.body._csrf) ||
    req.get('X-CSRF-Token') ||
    req.get('x-csrf-token');

  if (!sessionToken || !submittedToken || typeof submittedToken !== 'string') {
    if (wantsJson(req)) {
      return res.status(403).json({ success: false, error: 'Token CSRF inválido o ausente.' });
    }
    return res.status(403).render('error', {
      title: 'Solicitud Inválida',
      message: 'Tu sesión de formulario expiró o la solicitud no es válida. Vuelve atrás e inténtalo nuevamente.'
    });
  }

  const a = Buffer.from(sessionToken, 'utf8');
  const b = Buffer.from(submittedToken, 'utf8');
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) {
    if (wantsJson(req)) {
      return res.status(403).json({ success: false, error: 'Token CSRF inválido.' });
    }
    return res.status(403).render('error', {
      title: 'Solicitud Inválida',
      message: 'Token de seguridad inválido. Recarga la página e inténtalo nuevamente.'
    });
  }

  next();
}

module.exports = { ensureCsrfToken, verifyCsrfToken };
