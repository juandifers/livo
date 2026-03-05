const express = require('express');
const { 
  getUsers, 
  getUser, 
  updateUser, 
  deleteUser,
  getCurrentUser,
  getUserOwnedAssets,
  deleteMyAccount
} = require('../controllers/userController');
const { createUser } = require('../controllers/authController');

const {
  validateUpdateUser,
  validateGetUser,
  validateDeleteUser,
  validateCreateUser,
  validateDeleteMyAccount
} = require('../middleware/validation/userValidation');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Current user routes
router.get('/me', getCurrentUser);
router.get('/me/assets', getUserOwnedAssets);
router.delete('/me', validateDeleteMyAccount, deleteMyAccount);

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
