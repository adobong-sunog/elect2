const { body } = require('express-validator');

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('A valid email address is required.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match.');
      }
      return true;
    }),
];

const loginValidators = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Enter your email or username.')
    .bail()
    .custom((value) => {
      if (value.toLowerCase() === 'admin') {
        return true;
      }
      const emailPattern = /.+@.+\..+/;
      if (!emailPattern.test(value)) {
        throw new Error('Enter a valid email address.');
      }
      return true;
    }),
  body('password').notEmpty().withMessage('Password is required.'),
];

module.exports = {
  registerValidators,
  loginValidators,
};
