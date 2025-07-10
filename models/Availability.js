const { Op } = require('sequelize');

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
    priceCategory: {
      type: DataTypes.ENUM('normal', 'weekend', 'high_season', 'holiday', 'special'),
      defaultValue: 'normal'
    },
    notes: {
      type: DataTypes.TEXT
    }
  });

  // Método estático para actualizar precios por categoría
  Availability.updatePricesByCategory = async function(category, newPrice) {
    return this.update(
      { price: newPrice },
      { where: { priceCategory: category } }
    );
  };

  // Método estático para actualizar precios por rango de fechas
  Availability.updatePricesByDateRange = async function(startDate, endDate, newPrice, category = null) {
    const updateData = { price: newPrice };
    if (category) {
      updateData.priceCategory = category;
    }
    
    return this.update(
      updateData,
      { 
        where: {
          date: {
            [Op.between]: [startDate, endDate]
          }
        }
      }
    );
  };

  // Método estático para actualizar disponibilidad por rango de fechas
  Availability.updateAvailabilityByDateRange = async function(startDate, endDate, status, notes = null) {
    const updateData = { status };
    if (notes) {
      updateData.notes = notes;
    }
    
    // Primero crear los registros que no existen en el rango
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      await this.findOrCreate({
        where: { date: new Date(current) },
        defaults: {
          date: new Date(current),
          status: 'available',
          price: 150000
        }
      });
      current.setDate(current.getDate() + 1);
    }
    
    // Luego actualizar todos los registros en el rango
    return this.update(
      updateData,
      { 
        where: {
          date: {
            [Op.between]: [startDate, endDate]
          }
        }
      }
    );
  };

  return Availability;
};