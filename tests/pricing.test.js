process.env.NODE_ENV = 'test';

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { sequelize, Availability } = require('../models');
const pricingService = require('../services/pricingService');
const availabilityService = require('../services/availabilityService');
const dateUtils = require('../services/dateUtils');

describe('DateUtils & PricingService', () => {
  before(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await Availability.destroy({ where: {}, truncate: true });
  });

  it('validates YYYY-MM-DD dates and rejects impossible calendar dates', () => {
    assert.equal(dateUtils.isValidYMD('2027-02-28'), true);
    assert.equal(dateUtils.isValidYMD('2027-02-29'), false);
    assert.equal(dateUtils.isValidYMD('2028-02-29'), true);
    assert.equal(dateUtils.isValidYMD('2027-13-01'), false);
    assert.equal(dateUtils.nightsBetween('2027-01-30', '2027-02-02'), 3);
  });

  it('creates missing availability records when updating prices by date range', async () => {
    const updated = await pricingService.updatePricesByDateRange(
      '2027-01-29',
      '2027-02-02',
      85000,
      'high_season'
    );

    assert.equal(updated, 5);

    const calc = await pricingService.calculateRangePrice('2027-01-30', '2027-02-02');
    assert.equal(calc.nights, 3);
    assert.equal(calc.totalPrice, 255000);
    assert.equal(calc.averagePrice, 85000);
  });

  it('calculates mixed prices across consecutive months in a single query', async () => {
    await pricingService.updatePricesByDateRange('2027-03-31', '2027-03-31', 70000, 'special');
    await pricingService.updatePricesByDateRange('2027-04-01', '2027-04-01', 90000, 'holiday');
    // 2027-04-02 queda con precio base por defecto ($50.000)

    const calc = await pricingService.calculateRangePrice('2027-03-31', '2027-04-03');
    assert.equal(calc.nights, 3);
    assert.equal(calc.totalPrice, 70000 + 90000 + 50000);
  });

  it('preserves custom prices when dates are marked occupied or freed', async () => {
    await pricingService.updatePricesByDateRange('2027-05-10', '2027-05-12', 120000, 'high_season');

    await availabilityService.setDatesStatus(['2027-05-10', '2027-05-11'], 'occupied');
    const rowOccupied = await Availability.findOne({ where: { date: '2027-05-10' } });
    assert.equal(rowOccupied.status, 'occupied');
    assert.equal(parseFloat(rowOccupied.price), 120000);
    assert.equal(rowOccupied.priceCategory, 'high_season');

    await availabilityService.setDatesStatus(['2027-05-10'], 'available');
    const rowFreed = await Availability.findOne({ where: { date: '2027-05-10' } });
    assert.equal(rowFreed.status, 'available');
    assert.equal(parseFloat(rowFreed.price), 120000);
  });

  it('updates weekend category prices across upcoming horizon even on empty DB', async () => {
    const count = await pricingService.updatePricesByCategory('weekend', 75000, 1);
    assert.ok(count >= 4, `Expected at least 4 weekend nights updated, got ${count}`);
    const weekendRow = await Availability.findOne({ where: { priceCategory: 'weekend' } });
    assert.equal(parseFloat(weekendRow.price), 75000);
  });
});
