const { findUserById } = require('../services/auth/userService');

async function attachUser(req, res, next) {
  const { userId } = req.session;
  if (!userId) {
    req.user = null;
    res.locals.currentUser = null;
    res.locals.isAdmin = false;
    return next();
  }

  try {
    const user = await findUserById(userId);
    if (user) {
      req.user = user;
      res.locals.currentUser = user;
      res.locals.isAdmin = user.role === 'admin';
    } else {
      req.user = null;
      res.locals.currentUser = null;
      res.locals.isAdmin = false;
      delete req.session.userId;
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/auth/login');
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    req.flash('error', 'Administrator access required.');
    return res.redirect('/');
  }
  return next();
}

module.exports = {
  attachUser,
  requireAuth,
  requireAdmin,
};
