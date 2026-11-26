const { Sequelize } = require('sequelize');
const path = require('path');
const configAll = require('../config/config.json');

const env = process.env.NODE_ENV || 'development';
const envConfig = configAll[env] || configAll.development;

function createSequelizeInstance() {
  const databaseUrl = process.env.DATABASE_URL;

  if (env === 'test') {
    return new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false
    });
  }

  // Producción (MySQL) o DATABASE_URL explícita
  if (databaseUrl && (databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://'))) {
    return new Sequelize(databaseUrl, {
      dialect: 'mysql',
      logging: false,
      dialectOptions: {
        charset: 'utf8mb4',
        ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {})
      },
      pool: envConfig.pool || { max: 10, min: 0, acquire: 30000, idle: 10000 }
    });
  }

  if (env === 'production') {
    if (process.env.DB_NAME && process.env.DB_USER) {
      return new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS || '',
        {
          host: process.env.DB_HOST || '127.0.0.1',
          port: parseInt(process.env.DB_PORT, 10) || 3306,
          dialect: 'mysql',
          logging: false,
          dialectOptions: {
            charset: 'utf8mb4',
            ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {})
          },
          pool: envConfig.pool || { max: 10, min: 0, acquire: 30000, idle: 10000 }
        }
      );
    }

    if (databaseUrl) {
      return new Sequelize(databaseUrl, { logging: false });
    }
  }

  // Desarrollo: SQLite local
  const storagePath = envConfig.storage && envConfig.storage !== ':memory:'
    ? path.resolve(__dirname, '..', envConfig.storage)
    : path.join(__dirname, '../database.sqlite');

  return new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false
  });
}

const sequelize = createSequelizeInstance();

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Reservation = require('./Reservation')(sequelize, Sequelize.DataTypes);
const Availability = require('./Availability')(sequelize, Sequelize.DataTypes);
const Session = require('./Session')(sequelize, Sequelize.DataTypes);

// Define associations
User.hasMany(Reservation);
Reservation.belongsTo(User);

async function configureSqlitePragmas() {
  if (sequelize.getDialect() === 'sqlite') {
    await sequelize.query('PRAGMA foreign_keys = ON;');
    if (env !== 'test') {
      await sequelize.query('PRAGMA journal_mode = WAL;');
    }
  }
}

module.exports = {
  sequelize,
  Sequelize,
  User,
  Reservation,
  Availability,
  Session,
  configureSqlitePragmas
};
