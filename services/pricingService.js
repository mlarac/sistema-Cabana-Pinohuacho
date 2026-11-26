const { Op } = require('sequelize');
const { sequelize, Availability } = require('../models');
const cabin = require('../config/cabin');
const {
  todayYMD,
  addDays,
  addMonths,
  eachNight,
  eachDateInclusive,
  isWeekendNight
} = require('./dateUtils');

const VALID_CATEGORIES = ['normal', 'weekend', 'high_season', 'holiday', 'special'];

async function ensureDatesExist(startYMD, endYMD, { transaction } = {}) {
  const dates = eachDateInclusive(startYMD, endYMD);
  if (dates.length === 0) return;

  const existing = await Availability.findAll({
    attributes: ['date'],
    where: { date: { [Op.between]: [startYMD, endYMD] } },
    transaction
  });

  const existingSet = new Set(existing.map((r) => r.date));
  const missing = dates
    .filter((d) => !existingSet.has(d))
    .map((date) => ({
      date,
      status: 'available',
      price: cabin.defaultPrice,
      priceCategory: isWeekendNight(date) ? 'weekend' : 'normal'
    }));

  if (missing.length > 0) {
    await Availability.bulkCreate(missing, {
      ignoreDuplicates: true,
      transaction
    });
  }
}

async function getTodayPrice() {
  const today = todayYMD();
  const record = await Availability.findOne({ where: { date: today } });
  return record && record.price !== null ? parseFloat(record.price) : cabin.defaultPrice;
}

async function calculateRangePrice(checkIn, checkOut, { transaction } = {}) {
  const nightsList = eachNight(checkIn, checkOut);
  if (nightsList.length === 0) {
    return { totalPrice: 0, nights: 0, averagePrice: cabin.defaultPrice, prices: [] };
  }

  const lastNight = nightsList[nightsList.length - 1];
  const rows = await Availability.findAll({
    where: {
      date: { [Op.between]: [checkIn, lastNight] }
    },
    transaction
  });

  const byDate = new Map(rows.map((r) => [r.date, r]));
  let totalPrice = 0;
  const prices = nightsList.map((date) => {
    const row = byDate.get(date);
    const price = row && row.price !== null ? parseFloat(row.price) : cabin.defaultPrice;
    const category = row ? row.priceCategory : (isWeekendNight(date) ? 'weekend' : 'normal');
    totalPrice += price;
    return { date, price, category };
  });

  return {
    totalPrice,
    nights: nightsList.length,
    averagePrice: Math.round(totalPrice / nightsList.length),
    prices
  };
}

async function updatePricesByDateRange(startYMD, endYMD, price, category = null) {
  const numericPrice = parseFloat(price);
  return sequelize.transaction(async (transaction) => {
    await ensureDatesExist(startYMD, endYMD, { transaction });

    const updateData = { price: numericPrice };
    if (category && VALID_CATEGORIES.includes(category)) {
      updateData.priceCategory = category;
    }

    const [updatedCount] = await Availability.update(updateData, {
      where: {
        date: { [Op.between]: [startYMD, endYMD] }
      },
      transaction
    });

    return updatedCount;
  });
}

async function updatePricesByCategory(category, price, horizonMonths = 6) {
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error('Categoría de precio inválida');
  }
  const numericPrice = parseFloat(price);
  const startYMD = todayYMD();
  const endYMD = addMonths(startYMD, horizonMonths);

  return sequelize.transaction(async (transaction) => {
    await ensureDatesExist(startYMD, endYMD, { transaction });

    const [updatedCount] = await Availability.update(
      { price: numericPrice },
      {
        where: { priceCategory: category },
        transaction
      }
    );

    return updatedCount;
  });
}

async function updateSinglePrice(dayId, price, category) {
  const updateData = { price: parseFloat(price) };
  if (category && VALID_CATEGORIES.includes(category)) {
    updateData.priceCategory = category;
  }

  const [updatedCount] = await Availability.update(updateData, {
    where: { id: dayId }
  });

  return updatedCount;
}

async function getUpcomingPrices(months = 3) {
  const startYMD = todayYMD();
  const endYMD = addDays(addMonths(startYMD, months), 0);

  await ensureDatesExist(startYMD, endYMD);

  return Availability.findAll({
    where: {
      date: { [Op.between]: [startYMD, endYMD] }
    },
    order: [['date', 'ASC']]
  });
}

module.exports = {
  VALID_CATEGORIES,
  ensureDatesExist,
  getTodayPrice,
  calculateRangePrice,
  updatePricesByDateRange,
  updatePricesByCategory,
  updateSinglePrice,
  getUpcomingPrices
};
