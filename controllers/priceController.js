const { validationResult } = require('express-validator');
const pricingService = require('../services/pricingService');
const { formatCLDate, formatCLP, dayNameEs, todayYMD } = require('../services/dateUtils');

const CATEGORY_LABELS = {
  normal: 'Normal',
  weekend: 'Fin de Semana',
  high_season: 'Temporada Alta',
  holiday: 'Feriado',
  special: 'Especial'
};

const STATUS_LABELS = {
  available: 'Disponible',
  occupied: 'Ocupado',
  maintenance: 'Mantenimiento'
};

exports.showPricesPage = async (req, res) => {
  try {
    const availabilityData = await pricingService.getUpcomingPrices(3);

    const formattedData = availabilityData.map((day) => ({
      id: day.id,
      date: day.date,
      formattedDate: formatCLDate(day.date),
      dayOfWeek: dayNameEs(day.date),
      price: parseFloat(day.price),
      formattedPrice: formatCLP(day.price),
      status: day.status,
      statusLabel: STATUS_LABELS[day.status] || day.status,
      priceCategory: day.priceCategory || 'normal',
      categoryLabel: CATEGORY_LABELS[day.priceCategory] || day.priceCategory
    }));

    res.render('admin/prices', {
      layout: 'admin/layout',
      title: 'Gestión de Precios',
      user: req.session.user,
      todayDate: todayYMD(),
      availabilityData: formattedData
    });
  } catch (error) {
    console.error('Error loading prices page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Error al cargar la página de precios'
    });
  }
};

exports.updatePricesByCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/admin/precios?error=category-update-failed');
    }

    const { category, price } = req.body;
    await pricingService.updatePricesByCategory(category, price);
    res.redirect('/admin/precios?success=category-updated');
  } catch (error) {
    console.error('Error updating prices by category:', error);
    res.redirect('/admin/precios?error=category-update-failed');
  }
};

exports.updatePricesByRange = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/admin/precios?error=range-update-failed');
    }

    const { startDate, endDate, price, category } = req.body;
    if (endDate < startDate) {
      return res.redirect('/admin/precios?error=invalid-range');
    }

    await pricingService.updatePricesByDateRange(startDate, endDate, price, category || null);
    res.redirect('/admin/precios?success=range-updated');
  } catch (error) {
    console.error('Error updating prices by range:', error);
    res.redirect('/admin/precios?error=range-update-failed');
  }
};

exports.updateSinglePrice = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/admin/precios?error=single-update-failed');
    }

    const { dayId, price, category } = req.body;
    await pricingService.updateSinglePrice(parseInt(dayId, 10), price, category || null);
    res.redirect('/admin/precios?success=single-updated');
  } catch (error) {
    console.error('Error updating single price:', error);
    res.redirect('/admin/precios?error=single-update-failed');
  }
};

exports.getCurrentPrice = async (req, res) => {
  try {
    const price = await pricingService.getTodayPrice();
    res.json({ price });
  } catch (error) {
    console.error('Error getting current price:', error);
    res.status(500).json({ error: 'No se pudo obtener el precio' });
  }
};

exports.getPriceRange = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Fechas inválidas', details: errors.array() });
    }

    const { checkIn, checkOut } = req.query;
    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'La fecha de salida debe ser posterior a la fecha de entrada' });
    }

    const pricing = await pricingService.calculateRangePrice(checkIn, checkOut);
    res.json(pricing);
  } catch (error) {
    console.error('Error in getPriceRange:', error);
    res.status(500).json({ error: 'No se pudo obtener el precio del rango' });
  }
};
