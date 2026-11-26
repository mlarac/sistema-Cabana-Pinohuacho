const cabin = require('../config/cabin');

module.exports = (sequelize, DataTypes) => {
  const Reservation = sequelize.define('Reservation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bookingCode: {
      type: DataTypes.STRING(32),
      allowNull: true,
      unique: true
    },
    guestName: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    guestEmail: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    guestPhone: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    checkIn: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    checkOut: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    guests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: cabin.maxGuests
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    indexes: [
      {
        name: 'idx_reservations_dates_status',
        fields: ['checkIn', 'checkOut', 'status']
      },
      {
        name: 'idx_reservations_status',
        fields: ['status']
      }
    ]
  });

  return Reservation;
};
