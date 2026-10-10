const express = require('express');
const { allowRoles } = require('../middleware/auth');
const controller = require('../controllers/reportController');

const router = express.Router();
router.get('/', allowRoles('Agent', 'Admin'), controller.index);
module.exports = router;
