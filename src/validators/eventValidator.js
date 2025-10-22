const { body } = require('express-validator');

const nurturesOptions = [
  'Faith Formation',
  'Cultural Upliftment',
  'Leadership Development',
  'Community Building',
  'Values Formation',
  'Other',
];

const improvementOptions = [
  'Program Flow',
  'Content of the Activity',
  'Engagement Strategies',
  'Logistics',
  'Resource Management',
  'Other',
];

function ensureArray(fieldName) {
  return body(fieldName).customSanitizer((value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (value === undefined || value === null || value === '') {
      return [];
    }
    return [value];
  });
}

const baseValidators = [
  body('title').trim().notEmpty().withMessage('Activity title is required.'),
  body('leader_names').trim().notEmpty().withMessage('Activity leader(s) are required.'),
  body('leader_email').trim().isEmail().withMessage('A valid leader email is required.'),
  body('activity_date')
    .trim()
    .notEmpty()
    .withMessage('Activity date is required.')
    .isISO8601()
    .withMessage('Provide a valid date.'),
  body('venue').trim().notEmpty().withMessage('Venue is required.'),
  ensureArray('nurtures'),
  body('nurtures')
    .custom((value) => value && value.length > 0)
    .withMessage('Select at least one nurture focus.')
    .custom((value) => value.every((option) => option && option.trim().length > 0))
    .withMessage('Invalid nurture selection.'),
  body('aims').trim().notEmpty().withMessage('Objectives are required.'),
  body('impact_summary').trim().notEmpty().withMessage('Impact summary is required.'),
  body('primary_beneficiaries').trim().notEmpty().withMessage('Primary beneficiary occupation is required.'),
  body('secondary_beneficiaries').trim().notEmpty().withMessage('Secondary beneficiary occupation is required.'),
  body('secondary_beneficiaries_count')
    .notEmpty()
    .withMessage('Secondary beneficiary count is required.')
    .isInt({ min: 0 })
    .withMessage('Secondary beneficiary count must be zero or greater.'),
  ensureArray('improvement_areas'),
  body('improvement_areas')
    .custom((value) => value && value.length > 0)
    .withMessage('Select at least one improvement area.')
    .custom((value) => value.every((option) => option && option.trim().length > 0))
    .withMessage('Invalid improvement selection.'),
  body('improvement_actions').trim().notEmpty().withMessage('Improvement plan is required.'),
];

const createEventValidators = [
  ...baseValidators,
  body('attendance')
    .custom((value, { req }) => {
      if (!req.files || !req.files.attendance || req.files.attendance.length === 0) {
        throw new Error('Attendance sheet upload is required.');
      }
      return true;
    }),
  body('promo')
    .custom((value, { req }) => {
      if (!req.files || !req.files.promo || req.files.promo.length === 0) {
        throw new Error('Promotional material upload is required.');
      }
      return true;
    }),
];

const updateEventValidators = [...baseValidators];

module.exports = {
  createEventValidators,
  updateEventValidators,
  nurturesOptions,
  improvementOptions,
};
