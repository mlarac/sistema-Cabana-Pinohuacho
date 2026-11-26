const defaultPrice = parseInt(process.env.DEFAULT_NIGHT_PRICE, 10) || 50000;
const whatsappNumber = (process.env.CABIN_WHATSAPP || '56912345678').replace(/\D/g, '');

module.exports = {
  name: 'Cabaña Pino Huacho',
  tagline: 'Descanso Natural en el Corazón de la Araucanía',
  location: 'Pino Huacho, IX Región de la Araucanía, Chile',
  shortLocation: 'Pino Huacho, IX Región',
  timezone: process.env.TZ || 'America/Santiago',
  maxGuests: 5,
  bedrooms: 2,
  bedroomsDetail: '2 (1 cama matrimonial, 1 cama individual + litera)',
  bathrooms: '1 completo',
  areaSqm: 50,
  checkInTime: '15:00 hrs',
  checkOutTime: '11:00 hrs',
  defaultPrice,
  currency: 'CLP',
  contact: {
    email: process.env.CABIN_EMAIL || 'info@pinohuacho.cl',
    notifyEmail: process.env.ADMIN_NOTIFY_EMAIL || process.env.EMAIL_USER || '',
    phone: process.env.CABIN_PHONE || '+56 9 1234 5678',
    whatsapp: whatsappNumber,
    whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola, quiero consultar por disponibilidad en Cabaña Pino Huacho.')}`,
    mapsUrl: process.env.CABIN_MAPS_URL || 'https://www.google.com/maps/search/?api=1&query=Pino+Huacho+Araucania+Chile',
    facebookUrl: process.env.CABIN_FACEBOOK_URL || '',
    instagramUrl: process.env.CABIN_INSTAGRAM_URL || ''
  },
  siteUrl: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  features: [
    {
      icon: 'home',
      title: 'Capacidad para 5 personas',
      description: '2 habitaciones cómodas (1 cama matrimonial, 1 individual + litera)'
    },
    {
      icon: 'wifi',
      title: 'Wi-Fi gratuito',
      description: 'Internet estable para mantenerte conectado cuando lo necesites'
    },
    {
      icon: 'car',
      title: 'Estacionamiento privado',
      description: 'Espacio seguro dentro del recinto para tu vehículo'
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
      description: 'Rodeada de bosques nativos y paisajes únicos de la Araucanía'
    }
  ],
  gallery: [
    {
      src: '/img/portada.webp',
      fallback: '/img/portada.jpg',
      alt: 'Vista exterior de Cabaña Pino Huacho',
      title: 'Arquitectura Natural',
      description: 'Perfecta integración con el entorno boscoso de Pino Huacho'
    },
    {
      src: '/img/balcon.webp',
      fallback: '/img/balcon.jpg',
      alt: 'Balcón y vista interior acogedora de la cabaña',
      title: 'Terraza y Vista',
      description: 'Espacios cálidos y confortables con vista directa a la naturaleza'
    },
    {
      src: '/img/comedor.webp',
      fallback: '/img/comedor.png',
      alt: 'Comedor y cocina equipada de la cabaña',
      title: 'Comedor y Cocina Equipada',
      description: 'Todo lo necesario para compartir y preparar tus comidas'
    },
    {
      src: '/img/paisaje.webp',
      fallback: '/img/paisaje.png',
      alt: 'Paisaje natural circundante en la Araucanía',
      title: 'Paisajes Únicos',
      description: 'Naturaleza virgen y vistas panorámicas a tu alrededor'
    },
    {
      src: '/img/IMG_20200211_194220.webp',
      fallback: '/img/IMG_20200211_194220.jpg',
      alt: 'Detalle interior de la cabaña',
      title: 'Espacios Acogedores',
      description: 'Terminaciones en madera que invitan al descanso'
    },
    {
      src: '/img/IMG_20200211_194317.webp',
      fallback: '/img/IMG_20200211_194317.jpg',
      alt: 'Ambiente y entorno de Cabaña Pino Huacho',
      title: 'Entorno Familiar',
      description: 'Tranquilidad y aire puro cerca de Lican Ray y Coñaripe'
    }
  ]
};
