function notFound(req, res) {
  res.status(404).render('errors/404', { title: 'Page not found' });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(error);
  res.status(error.status || 500).render('errors/500', {
    title: 'Something went wrong',
    message: process.env.NODE_ENV === 'production' ? 'Please try again later.' : error.message
  });
}

module.exports = { notFound, errorHandler };
