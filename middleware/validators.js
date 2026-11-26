const { body, param, query } = require('express-validator');
const cabin = require('../config/cabin');
const { isValidYMD } = require('../services/dateUtils');
const { VALID_CATEGORIES } = require('../services/pricingService');

const PHONE_REGEX = /^\+?[\d\s\-()]{8,20}$/;

const reservationFormValidators = [
  body('guestName')
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  body('guestEmail')
    .trim()
    .isEmail()
    .withMessage('Ingrese un email válido')
    .normalizeEmail(),
  body('guestPhone')
    .trim()
    .matches(PHONE_REGEX)
    .withMessage('Ingrese un teléfono válido (ej. +56 9 1234 5678)'),
  body('checkIn')
    .custom(isValidYMD)
    .withMessage('Fecha de entrada inválida (formato YYYY-MM-DD)'),
  body('checkOut')
    .custom(isValidYMD)
    .withMessage('Fecha de salida inválida (formato YYYY-MM-DD)'),
  body('guests')
    .isInt({ min: 1, max: cabin.maxGuests })
    .withMessage(`El número de huéspedes debe ser entre 1 y ${cabin.maxGuests}`),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden superar los 1000 caracteres')
];

const availabilityMonthValidators = [
  param('year').isInt({ min: 2020, max: 2100 }).withMessage('Año inválido'),
  param('month').isInt({ min: 1, max: 12 }).withMessage('Mes inválido')
];

const availabilityRangeQueryValidators = [
  query('start').custom(isValidYMD).withMessage('Fecha de inicio inválida'),
  query('end').custom(isValidYMD).withMessage('Fecha de fin inválida')
];

const priceRangeQueryValidators = [
  query('checkIn').custom(isValidYMD).withMessage('Fecha de entrada inválida'),
  query('checkOut').custom(isValidYMD).withMessage('Fecha de salida inválida')
];

const updateSingleAvailabilityValidators = [
  body('date').custom(isValidYMD).withMessage('Fecha inválida'),
  body('status').isIn(['available', 'occupied', 'maintenance']).withMessage('Estado inválido'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 })
];

const updateRangeAvailabilityValidators = [
  body('startDate').custom(isValidYMD).withMessage('Fecha de inicio inválida'),
  body('endDate').custom(isValidYMD).withMessage('Fecha de fin inválida'),
  body('status').isIn(['available', 'occupied', 'maintenance']).withMessage('Estado inválido'),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 })
];

const updateCategoryPriceValidators = [
  body('category').isIn(VALID_CATEGORIES).withMessage('Categoría inválida'),
  body('price').isFloat({ min: 1000, max: 5000000 }).withMessage('Precio inválido')
];

const updateRangePriceValidators = [
  body('startDate').custom(isValidYMD).withMessage('Fecha de inicio inválida'),
  body('endDate').custom(isValidYMD).withMessage('Fecha de fin inválida'),
  body('price').isFloat({ min: 1000, max: 5000000 }).withMessage('Precio inválido'),
  body('category')
    .optional({ values: 'falsy' })
    .isIn(VALID_CATEGORIES)
    .withMessage('Categoría inválida')
];

const updateSinglePriceValidators = [
  body('dayId').isInt({ min: 1 }).withMessage('ID de día inválido'),
  body('price').isFloat({ min: 1000, max: 5000000 }).withMessage('Precio inválido'),
  body('category')
    .optional({ values: 'falsy' })
    .isIn(VALID_CATEGORIES)
    .withMessage('Categoría inválida')
];

module.exports = {
  reservationFormValidators,
  availabilityMonthValidators,
  availabilityRangeQueryValidators,
  priceRangeQueryValidators,
  updateSingleAvailabilityValidators,
  updateRangeAvailabilityValidators,
  updateCategoryPriceValidators,
  updateRangePriceValidators,
  updateSinglePriceValidators
};
