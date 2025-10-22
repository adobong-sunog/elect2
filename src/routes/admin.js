const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { renderAdminDashboard } = require('../controllers/adminController');

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', asyncHandler(renderAdminDashboard));

module.exports = router;
