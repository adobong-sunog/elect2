const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const {
  renderRegister,
  handleRegister,
  renderLogin,
  handleLogin,
  handleLogout,
} = require('../controllers/authController');
const {
  registerValidators,
  loginValidators,
} = require('../validators/authValidator');

const router = express.Router();

router.get('/register', renderRegister);
router.post('/register', registerValidators, asyncHandler(handleRegister));
router.get('/login', renderLogin);
router.post('/login', loginValidators, asyncHandler(handleLogin));
router.post('/logout', handleLogout);

module.exports = router;
