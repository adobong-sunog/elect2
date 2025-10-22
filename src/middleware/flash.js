function flashMiddleware() {
  return (req, res, next) => {
    const existing = req.session.flash || {};
    res.locals.flash = {
      success: Array.isArray(existing.success) ? existing.success : [],
      error: Array.isArray(existing.error) ? existing.error : [],
    };
    delete req.session.flash;

    req.flash = (type, message) => {
      if (!req.session.flash) {
        req.session.flash = { success: [], error: [] };
      }
      if (!Array.isArray(req.session.flash[type])) {
        req.session.flash[type] = [];
      }
      req.session.flash[type].push(message);
    };

    next();
  };
}

module.exports = flashMiddleware;
