const { validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = {};
  result.array().forEach((error) => { errors[error.path] = error.msg; });
  const safeValues = { ...req.body };
  delete safeValues.password;
  delete safeValues.confirmPassword;
  req.flash('formErrors', errors);
  req.flash('formValues', safeValues);
  req.flash('error', 'Please correct the highlighted fields.');
  const fallback = req.originalUrl;
  const referer = req.get('referer');
  if (!referer) return res.redirect(fallback);
  try {
    const destination = new URL(referer);
    if (destination.host === req.get('host')) return res.redirect(`${destination.pathname}${destination.search}${destination.hash}`);
  } catch (error) {
    if (!(error instanceof TypeError)) return next(error);
  }
  return res.redirect(fallback);
}

module.exports = { handleValidation };
