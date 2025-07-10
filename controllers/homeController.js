const moment = require('moment');

exports.index = async (req, res) => {
  try {
    res.render('index', {
      title: 'Cabaña Pino Huacho - Descanso Natural en la Araucanía',
      currentDate: moment().format('YYYY-MM-DD')
    });
  } catch (error) {
    console.error('Error loading home page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar la página principal'
    });
  }
};

exports.features = async (req, res) => {
  try {
    const features = [
      {
        icon: 'home',
        title: 'Capacidad para 6 personas',
        description: '3 habitaciones cómodas con camas matrimoniales y individuales'
      },
      {
        icon: 'wifi',
        title: 'Wi-Fi gratuito',
        description: 'Internet de alta velocidad para mantenerte conectado'
      },
      {
        icon: 'car',
        title: 'Estacionamiento privado',
        description: 'Espacio seguro para tu vehículo'
      },
      {
        icon: 'flame',
        title: 'Calefacción a leña',
        description: 'Ambiente cálido y acogedor durante todo el año'
      },
      {
        icon: 'utensils',
        title: 'Cocina equipada',
        description: 'Todo lo necesario para preparar tus comidas favoritas'
      },
      {
        icon: 'tree-pine',
        title: 'Entorno natural',
        description: 'Rodeada de bosques nativos y paisajes únicos'
      }
    ];

    res.render('features', {
      title: 'Características de la Cabaña',
      features
    });
  } catch (error) {
    console.error('Error loading features page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar las características'
    });
  }
};