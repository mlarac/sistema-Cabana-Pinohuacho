const { sequelize } = require('../models');

async function updateDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync database with alter option to update existing tables
    await sequelize.sync({ alter: true });
    console.log('Database updated successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
}

updateDatabase();

