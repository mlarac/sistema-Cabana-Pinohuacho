const swaggerJsdoc = require('swagger-jsdoc');
const cabin = require('./cabin');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: `API ${cabin.name}`,
      version: '2.0.0',
      description: 'Documentación de la API para el sistema de reservas de Cabaña Pino Huacho'
    },
    servers: [
      {
        url: cabin.siteUrl,
        description: 'Servidor Activo'
      }
    ]
  },
  apis: ['./routes/*.js']
};

module.exports = swaggerJsdoc(options);
