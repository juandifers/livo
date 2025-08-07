const express = require('express');
const { getNullOwnersLog } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);
// Restrict to admin only
router.use(authorize('admin'));

// Admin routes
router.get('/logs/null-owners', getNullOwnersLog);

module.exports = router; 