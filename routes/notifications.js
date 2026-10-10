const express = require('express');
const mongoose = require('mongoose');
const { param } = require('express-validator');
const { isLoggedIn } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');
const controller = require('../controllers/notificationController');

const router = express.Router();
router.use(isLoggedIn);
router.get('/', controller.index);
router.post('/:id/read', param('id').custom((id) => id === 'all' || mongoose.isValidObjectId(id)).withMessage('Invalid notification.'), handleValidation, controller.markRead);
module.exports = router;
