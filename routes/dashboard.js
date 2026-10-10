const express = require('express');
const { isLoggedIn } = require('../middleware/auth');
const controller = require('../controllers/dashboardController');

const router = express.Router();
router.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));
router.get('/dashboard', isLoggedIn, controller.index);
module.exports = router;
