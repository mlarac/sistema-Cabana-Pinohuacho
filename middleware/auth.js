function wantsJson(req) {
  return (
    req.xhr ||
    req.path.startsWith('/admin/api/') ||
    req.path.startsWith('/api/') ||
    (req.headers.accept && req.headers.accept.includes('application/json'))
  );
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.isAdmin) {
    if (wantsJson(req)) {
      return res.status(401).json({ success: false, error: 'No autorizado. Inicia sesión nuevamente.' });
    }
    return res.redirect('/admin/login');
  }
  next();
}

module.exports = { requireAdmin, wantsJson };
