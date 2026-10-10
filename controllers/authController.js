const bcrypt = require('bcryptjs');
const { matchedData } = require('express-validator');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.showRegister = (req, res) => res.render('auth/register', { title: 'Create account' });
exports.showLogin = (req, res) => res.render('auth/login', { title: 'Log in' });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = matchedData(req, { locations: ['body'] });
  const existing = await User.findOne({ email });
  if (existing) {
    req.flash('formErrors', { email: 'An account with this email already exists.' });
    req.flash('formValues', { name, email });
    req.flash('error', 'Please correct the highlighted fields.');
    return res.redirect('/register');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await User.create({ name, email, passwordHash });
  } catch (error) {
    if (error.code !== 11000) throw error;
    req.flash('formErrors', { email: 'An account with this email already exists.' });
    req.flash('formValues', { name, email });
    req.flash('error', 'Please correct the highlighted fields.');
    return res.redirect('/register');
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  req.flash('success', 'Welcome to Tixly. Your account is ready.');
  return res.redirect('/dashboard');
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = matchedData(req, { locations: ['body'] });
  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = user && await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    req.flash('formErrors', { email: 'Email or password is incorrect.' });
    req.flash('formValues', { email });
    req.flash('error', 'Unable to log in. Check your details and try again.');
    return res.redirect('/login');
  }
  let destination = '/dashboard';
  if (typeof req.session.returnTo === 'string') {
    try {
      const returnUrl = new URL(req.session.returnTo, 'http://tixly.local');
      if (returnUrl.origin === 'http://tixly.local') {
        destination = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
      }
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
  }
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    req.flash('success', `Welcome back, ${user.name}.`);
    return req.session.save((saveError) => {
      if (saveError) return next(saveError);
      res.redirect(destination);
    });
  });
});

exports.logout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('tixly.sid');
    res.redirect('/login');
  });
};
