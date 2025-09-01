const express = require('express');
const { 
  getUsers, 
  getUser, 
  updateUser, 
  deleteUser,
  getCurrentUser,
  getUserOwnedAssets,
  createUser
} = require('../controllers/userController');

const {
  validateUpdateUser,
  validateGetUser,
  validateDeleteUser,
  validateCreateUser
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
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), validateCreateUser, createUser);

router
  .route('/:id')
  .get(validateGetUser, getUser)
  .put(validateUpdateUser, updateUser)
  .delete(authorize('admin'), validateDeleteUser, deleteUser);

module.exports = router; 