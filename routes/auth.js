const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');
const { isLoggedIn } = require('../middleware/auth');
const controller = require('../controllers/authController');

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: 'Too many login attempts. Try again in 15 minutes.' });
const emailRule = body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail();

router.get('/register', (req, res, next) => req.session.user ? res.redirect('/dashboard') : next(), controller.showRegister);
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.'),
  emailRule,
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.'),
  handleValidation
], controller.register);
router.get('/login', (req, res, next) => req.session.user ? res.redirect('/dashboard') : next(), controller.showLogin);
router.post('/login', loginLimiter, [
  emailRule,
  body('password').notEmpty().withMessage('Enter your password.'),
  handleValidation
], controller.login);
router.post('/logout', isLoggedIn, controller.logout);

module.exports = router;
