'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      isAdmin: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.createTable('Reservations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      bookingCode: {
        type: Sequelize.STRING(32),
        allowNull: true,
        unique: true
      },
      guestName: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      guestEmail: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      guestPhone: {
        type: Sequelize.STRING(40),
        allowNull: false
      },
      checkIn: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      checkOut: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      guests: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      totalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('Reservations', ['checkIn', 'checkOut', 'status'], {
      name: 'idx_reservations_dates_status'
    });
    await queryInterface.addIndex('Reservations', ['status'], {
      name: 'idx_reservations_status'
    });

    await queryInterface.createTable('Availabilities', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('available', 'occupied', 'maintenance'),
        allowNull: false,
        defaultValue: 'available'
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 50000
      },
      priceCategory: {
        type: Sequelize.ENUM('normal', 'weekend', 'high_season', 'holiday', 'special'),
        allowNull: false,
        defaultValue: 'normal'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('Availabilities', ['priceCategory'], {
      name: 'idx_availabilities_category'
    });
    await queryInterface.addIndex('Availabilities', ['status'], {
      name: 'idx_availabilities_status'
    });

    await queryInterface.createTable('Sessions', {
      sid: {
        type: Sequelize.STRING(128),
        primaryKey: true,
        allowNull: false
      },
      expires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      data: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('Sessions', ['expires'], {
      name: 'idx_sessions_expires'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Sessions');
    await queryInterface.dropTable('Availabilities');
    await queryInterface.dropTable('Reservations');
    await queryInterface.dropTable('Users');
  }
};
