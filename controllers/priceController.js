const { Availability } = require('../models');
const moment = require('moment');
const { Op } = require('sequelize');

exports.showPricesPage = async (req, res) => {
  try {
    // Obtener datos de disponibilidad para los próximos 3 meses
    const startDate = moment().startOf('day').toDate();
    const endDate = moment().add(3, 'months').endOf('day').toDate();
    
    const availabilityData = await Availability.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });
    
    // Formatear datos para la vista
    const formattedData = availabilityData.map(day => ({
      id: day.id,
      date: day.date,
      formattedDate: moment(day.date).format('DD/MM/YYYY'),
      dayOfWeek: moment(day.date).format('dddd'),
      price: day.price,
      formattedPrice: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(day.price),
      status: day.status,
      priceCategory: day.priceCategory || 'normal'
    }));
    
    res.render('admin/prices', {
      title: 'Gestión de Precios',
      user: req.session.user,
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
    const { category, price } = req.body;
    
    if (!category || !price) {
      return res.redirect('/admin/precios?error=category-update-failed');
    }
    
    await Availability.updatePricesByCategory(category, price);
    
    res.redirect('/admin/precios?success=category-updated');
  } catch (error) {
    console.error('Error updating prices by category:', error);
    res.redirect('/admin/precios?error=category-update-failed');
  }
};

exports.updatePricesByRange = async (req, res) => {
  try {
    const { startDate, endDate, price, category } = req.body;
    
    if (!startDate || !endDate || !price) {
      return res.redirect('/admin/precios?error=range-update-failed');
    }
    
    const start = moment(startDate).startOf('day').toDate();
    const end = moment(endDate).endOf('day').toDate();
    
    await Availability.updatePricesByDateRange(start, end, price, category || null);
    
    res.redirect('/admin/precios?success=range-updated');
  } catch (error) {
    console.error('Error updating prices by range:', error);
    res.redirect('/admin/precios?error=range-update-failed');
  }
};

exports.updateSinglePrice = async (req, res) => {
  try {
    const { dayId, price, category } = req.body;
    
    if (!dayId || !price) {
      return res.redirect('/admin/precios?error=single-update-failed');
    }
    
    await Availability.update(
      { 
        price: parseFloat(price),
        priceCategory: category 
      },
      { where: { id: dayId } }
    );
    
    res.redirect('/admin/precios?success=single-updated');
  } catch (error) {
    console.error('Error updating single price:', error);
    res.redirect('/admin/precios?error=single-update-failed');
  }
};