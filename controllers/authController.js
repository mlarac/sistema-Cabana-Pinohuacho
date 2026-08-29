const { User } = require('../models');
const { body, validationResult } = require('express-validator');

exports.showLogin = (req, res) => {
  if (req.session.user && req.session.user.isAdmin) {
    return res.redirect('/admin');
  }
  
  res.render('admin/login', {
    title: 'Acceso Administrativo',
    layout: false
  });
};

exports.login = [
  body('username').trim().notEmpty().withMessage('Usuario requerido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),

  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render('admin/login', {
          title: 'Acceso Administrativo',
          layout: false,
          errors: errors.array(),
          formData: req.body
        });
      }

      const { username, password } = req.body;

      const user = await User.findOne({
        where: { username }
      });

      if (!user || !await user.validatePassword(password) || !user.isAdmin) {
        return res.render('admin/login', {
          title: 'Acceso Administrativo',
          layout: false,
          errors: [{ msg: 'Credenciales inválidas' }],
          formData: req.body
        });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      };

      res.redirect('/admin');
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).render('error', {
        title: 'Error',
        message: 'Error durante el inicio de sesión'
      });
    }
  }
];

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
};