const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = process.env.ADMIN_EMAIL || 'admin@pinohuacho.cl';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM Users WHERE username = :username OR email = :email LIMIT 1',
      { replacements: { username, email } }
    );

    if (existing && existing.length > 0) {
      console.log(`Usuario admin "${username}" ya existe. Seeder omitido.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return queryInterface.bulkInsert('Users', [{
      username,
      email,
      password: hashedPassword,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: (queryInterface) => {
    return queryInterface.bulkDelete('Users', {
      username: process.env.ADMIN_USERNAME || 'admin'
    });
  }
};
