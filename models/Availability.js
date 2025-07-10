module.exports = (sequelize, DataTypes) => {
  const Availability = sequelize.define('Availability', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'maintenance'),
      defaultValue: 'available'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 150000 // Default price in CLP
    },
    notes: {
      type: DataTypes.TEXT
    }
  });

  return Availability;
};