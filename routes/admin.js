const express = require('express');
const { body, param } = require('express-validator');
const { allowRoles } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');
const controller = require('../controllers/adminController');

const router = express.Router();
router.use(allowRoles('Admin'));
router.get('/users', controller.users);
router.post('/users', [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['User', 'Agent', 'Admin']).withMessage('Choose a valid role.'),
  handleValidation
], controller.createUser);
router.patch('/users/:id/role', param('id').isMongoId().withMessage('Invalid user.'), body('role').isIn(['User', 'Agent', 'Admin']).withMessage('Choose a valid role.'), handleValidation, controller.updateRole);
router.delete('/users/:id', param('id').isMongoId().withMessage('Invalid user.'), handleValidation, controller.removeUser);
module.exports = router;
