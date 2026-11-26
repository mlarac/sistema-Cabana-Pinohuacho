const { sequelize, configureSqlitePragmas } = require('../models');

async function updateDatabase() {
  try {
    await sequelize.authenticate();
    await configureSqlitePragmas();
    console.log(`Database connection established (${sequelize.getDialect()}).`);

    await sequelize.sync({ alter: true });
    console.log('Database updated successfully.');

    process.exit(0);
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
}

updateDatabase();
