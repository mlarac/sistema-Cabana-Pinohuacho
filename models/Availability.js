const cabin = require('../config/cabin');

module.exports = (sequelize, DataTypes) => {
  const Availability = sequelize.define('Availability', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'maintenance'),
      allowNull: false,
      defaultValue: 'available'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: cabin.defaultPrice
    },
    priceCategory: {
      type: DataTypes.ENUM('normal', 'weekend', 'high_season', 'holiday', 'special'),
      allowNull: false,
      defaultValue: 'normal'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    indexes: [
      {
        name: 'idx_availabilities_category',
        fields: ['priceCategory']
      },
      {
        name: 'idx_availabilities_status',
        fields: ['status']
      }
    ]
  });

  return Availability;
};
