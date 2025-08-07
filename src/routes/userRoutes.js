const express = require('express');
const { 
  getUsers, 
  getUser, 
  updateUser, 
  deleteUser,
  getCurrentUser,
  getUserOwnedAssets
} = require('../controllers/userController');

const {
  validateUpdateUser,
  validateGetUser,
  validateDeleteUser
} = require('../middleware/validation/userValidation');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Current user routes
router.get('/me', getCurrentUser);
router.get('/me/assets', getUserOwnedAssets);

// Routes limited to admin only
router
  .route('/')
  .get(authorize('admin'), getUsers);

router
  .route('/:id')
  .get(validateGetUser, getUser)
  .put(validateUpdateUser, updateUser)
  .delete(authorize('admin'), validateDeleteUser, deleteUser);

module.exports = router; 