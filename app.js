const express = require('express');
const ejsLayouts = require('express-ejs-layouts');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const cabin = require('./config/cabin');
const { sequelize, Session, configureSqlitePragmas } = require('./models');
const SequelizeSessionStore = require('./services/sessionStore');
const { ensureCsrfToken, verifyCsrfToken } = require('./middleware/csrf');
const { requireAdmin, wantsJson } = require('./middleware/auth');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

if (isProd) {
  app.set('trust proxy', 1);
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 24) {
    console.error('FATAL: SESSION_SECRET debe definirse con al menos 24 caracteres en producción.');
    process.exit(1);
  }
}

// Security middleware (CSP sin unsafe-inline ni unsafe-eval en scripts)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        scriptSrcAttr: ["'none'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);

app.use(compression());

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layout');

// Static files with cache headers in production
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: isProd ? '7d' : 0,
    etag: true
  })
);

// Body parsing middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Health check (sin sesión ni CSRF)
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      dialect: sequelize.getDialect(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

// Session configuration (Sequelize store: compatible con SQLite y MySQL)
const sessionStore = new SequelizeSessionStore(Session, {
  defaultTtlMs: 24 * 60 * 60 * 1000
});

app.use(
  session({
    name: 'pinohuacho.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-pino-huacho-secret-key-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// Global template locals
app.use((req, res, next) => {
  res.locals.cabin = cabin;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.currentPath = req.path;
  res.locals.metaDescription =
    'Cabaña Pino Huacho en la Araucanía, Chile. Alojamiento para hasta 5 personas rodeado de bosques nativos cerca de Lican Ray y Coñaripe.';
  next();
});

// CSRF protection (genera token en sesión y valida en mutaciones)
app.use(ensureCsrfToken);
app.use(verifyCsrfToken);

// Swagger UI: solo abierto en desarrollo; en producción requiere sesión admin
if (!isProd) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
} else {
  app.use('/api-docs', requireAdmin, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Routes
app.use('/', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  if (!isTest) {
    console.error(err.stack || err);
  }
  const status = err.statusCode || 500;
  if (wantsJson(req)) {
    return res.status(status).json({
      success: false,
      error: status < 500 ? err.message : 'Error interno del servidor'
    });
  }
  res.status(status).render('error', {
    title: status === 404 ? 'Página No Encontrada' : 'Error del Servidor',
    message: status < 500 ? err.message : 'Algo salió mal. Por favor, inténtelo de nuevo más tarde.'
  });
});

// 404 handler
app.use((req, res) => {
  if (wantsJson(req)) {
    return res.status(404).json({ success: false, error: 'Recurso no encontrado' });
  }
  res.status(404).render('error', {
    title: 'Página No Encontrada',
    message: 'La página que buscas no existe.'
  });
});

async function startServer() {
  try {
    await sequelize.authenticate();
    await configureSqlitePragmas();
    console.log(`Database connection established (${sequelize.getDialect()}).`);

    // En desarrollo crea tablas faltantes automáticamente; en producción usar `npm run db:migrate`
    if (!isProd) {
      await sequelize.sync();
      console.log('Database synchronized successfully.');
    }

    return app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

app.startServer = startServer;
module.exports = app;
