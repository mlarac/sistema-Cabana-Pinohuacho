const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Cabaña Pino Huacho',
      version: '1.0.0',
      description: 'Documentación de la API para el sistema de reservas de Cabaña Pino Huacho',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local (Desarrollo)',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const specs = swaggerJsdoc(options);
module.exports = specs;
