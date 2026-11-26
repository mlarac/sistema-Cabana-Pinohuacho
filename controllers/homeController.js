const cabin = require('../config/cabin');
const { todayYMD } = require('../services/dateUtils');

exports.index = async (req, res) => {
  try {
    res.render('index', {
      title: `${cabin.name} - ${cabin.tagline}`,
      metaDescription: `Arrienda ${cabin.name} en la Araucanía. Capacidad hasta ${cabin.maxGuests} personas, ${cabin.bedrooms} habitaciones, calefacción a leña y calendario de disponibilidad en tiempo real.`,
      currentDate: todayYMD()
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
    res.render('features', {
      title: `Características - ${cabin.name}`,
      metaDescription: `Conoce las comodidades de ${cabin.name}: ${cabin.maxGuests} personas, ${cabin.bedrooms} habitaciones, cocina equipada, parrilla y atractivos cercanos a Lican Ray y Coñaripe.`,
      features: cabin.features,
      gallery: cabin.gallery
    });
  } catch (error) {
    console.error('Error loading features page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar las características'
    });
  }
};

exports.sitemap = (req, res) => {
  const baseUrl = cabin.siteUrl;
  const today = todayYMD();
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/caracteristicas', priority: '0.8', changefreq: 'weekly' },
    { loc: '/reservar', priority: '0.9', changefreq: 'daily' },
    { loc: '/consultar-reserva', priority: '0.5', changefreq: 'monthly' }
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
      .map(
        (u) => `  <url>
    <loc>${baseUrl}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
      )
      .join('\n')}
</urlset>`;

  res.type('application/xml').send(xml);
};
