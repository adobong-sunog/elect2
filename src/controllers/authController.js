const { validationResult } = require('express-validator');
const {
  createUser,
  findUserByEmail,
  verifyCredentials,
} = require('../services/auth/userService');

function renderRegister(req, res) {
  if (req.user) {
    return res.redirect('/');
  }
  return res.render('auth/register', {
    title: 'Create Account',
    form: {
      name: '',
      email: '',
    },
    errors: [],
  });
}

async function handleRegister(req, res, next) {
  if (req.user) {
    return res.redirect('/');
  }

  const errors = validationResult(req);
  const form = {
    name: req.body.name || '',
    email: req.body.email || '',
  };

  if (!errors.isEmpty()) {
    return res.status(400).render('auth/register', {
      title: 'Create Account',
      form,
      errors: errors.array(),
    });
  }

  try {
    const existing = await findUserByEmail(req.body.email);
    if (existing) {
      return res.status(400).render('auth/register', {
        title: 'Create Account',
        form,
        errors: [{ msg: 'An account with that email already exists.', param: 'email' }],
      });
    }

    const user = await createUser({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
    });

    req.session.userId = user.id;
    req.flash('success', 'Welcome! Your account has been created.');
    return res.redirect('/');
  } catch (error) {
    return next(error);
  }
}

function renderLogin(req, res) {
  if (req.user) {
    return res.redirect('/');
  }
  return res.render('auth/login', {
    title: 'Sign In',
    form: {
      email: '',
    },
    errors: [],
  });
}

async function handleLogin(req, res, next) {
  if (req.user) {
    return res.redirect('/');
  }

  const errors = validationResult(req);
  const form = {
    email: req.body.email || '',
  };

  if (!errors.isEmpty()) {
    return res.status(400).render('auth/login', {
      title: 'Sign In',
      form,
      errors: errors.array(),
    });
  }

  try {
    const user = await verifyCredentials(req.body.email, req.body.password);
    if (!user) {
      return res.status(400).render('auth/login', {
        title: 'Sign In',
        form,
        errors: [{ msg: 'Invalid email or password.', param: 'password' }],
      });
    }

    req.session.userId = user.id;
    req.flash('success', 'Signed in successfully.');
    return res.redirect('/');
  } catch (error) {
    return next(error);
  }
}

function handleLogout(req, res) {
  req.session.userId = null;
  req.flash('success', 'Signed out successfully.');
  req.session.save(() => {
    res.redirect('/auth/login');
  });
}

module.exports = {
  renderRegister,
  handleRegister,
  renderLogin,
  handleLogin,
  handleLogout,
};
