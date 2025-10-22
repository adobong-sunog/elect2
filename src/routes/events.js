const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const {
  showDashboard,
  renderNewForm,
  handleCreate,
  renderEventDetail,
  renderEditForm,
  handleUpdate,
  handleDelete,
} = require('../controllers/eventController');
const { createEventValidators, updateEventValidators } = require('../validators/eventValidator');
const { uploadFields } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', asyncHandler(showDashboard));
router.get('/events/new', renderNewForm);
router.post('/events', uploadFields, createEventValidators, asyncHandler(handleCreate));
router.get('/events/:id', asyncHandler(renderEventDetail));
router.get('/events/:id/edit', asyncHandler(renderEditForm));
router.put('/events/:id', uploadFields, updateEventValidators, asyncHandler(handleUpdate));
router.delete('/events/:id', asyncHandler(handleDelete));

module.exports = router;
