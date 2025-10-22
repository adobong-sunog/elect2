const { listEvents } = require('../services/eventService');

async function renderAdminDashboard(req, res, next) {
  try {
    const events = await listEvents({ includeAll: true });
    return res.render('admin/index', {
      title: 'All Activities',
      events,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  renderAdminDashboard,
};
