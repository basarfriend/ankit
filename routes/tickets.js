const express = require('express');
const { body, param } = require('express-validator');
const { isLoggedIn, allowRoles } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validation');
const controller = require('../controllers/ticketController');

const router = express.Router();
const ticketFields = [
  body('title').trim().isLength({ min: 4, max: 120 }).withMessage('Title must be 4–120 characters.'),
  body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Description must be 10–5000 characters.'),
  body('category').isIn(['Bug', 'Access', 'Billing', 'Booking', 'General']).withMessage('Choose a valid category.'),
  body('priority').isIn(['Low', 'Medium', 'High', 'Urgent']).withMessage('Choose a valid priority.')
];
const validId = param('id').isMongoId().withMessage('Invalid ticket.');
router.use(isLoggedIn);
router.get('/', controller.list);
router.get('/new', controller.newForm);
router.post('/', ticketFields.concat(handleValidation), controller.create);
router.get('/:id', validId, handleValidation, controller.show);
router.get('/:id/edit', validId, handleValidation, controller.editForm);
router.put('/:id', validId, ...ticketFields, handleValidation, controller.update);
router.delete('/:id', validId, handleValidation, controller.remove);
router.patch('/:id/status', validId, body('status').isIn(['Open', 'In Progress', 'Resolved', 'Closed']).withMessage('Choose a valid status.'), handleValidation, controller.changeStatus);
router.patch('/:id/assign', allowRoles('Agent', 'Admin'), validId, body('assignedTo').isMongoId().withMessage('Choose a valid agent.'), handleValidation, controller.assign);
router.post('/:id/comments', validId, body('message').trim().isLength({ min: 2, max: 3000 }).withMessage('Reply must be 2–3000 characters.'), handleValidation, controller.comment);
module.exports = router;
