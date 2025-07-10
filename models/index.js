const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false
});

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Reservation = require('./Reservation')(sequelize, Sequelize.DataTypes);
const Availability = require('./Availability')(sequelize, Sequelize.DataTypes);

// Define associations
User.hasMany(Reservation);
Reservation.belongsTo(User);

module.exports = {
  sequelize,
  User,
  Reservation,
  Availability
};