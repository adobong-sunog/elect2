function notFoundHandler(req, res) {
  res.status(404);
  if (req.accepts('html')) {
    return res.render('errors/404', { title: 'Not Found' });
  }
  if (req.accepts('json')) {
    return res.json({ error: 'Not Found' });
  }
  return res.type('txt').send('Not Found');
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(error);
  const status = error.status || 500;
  res.status(status);
  if (req.accepts('html')) {
    return res.render('errors/500', {
      title: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error : null,
    });
  }
  if (req.accepts('json')) {
    return res.json({ error: error.message || 'Internal Server Error' });
  }
  return res.type('txt').send(error.message || 'Internal Server Error');
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
