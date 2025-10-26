const express = require('express');
const { 
  getAssets, 
  getAsset, 
  createAsset, 
  updateAsset, 
  deleteAsset,
  addOwner,
  removeOwner,
  updateOwners,
  uploadPhotos
} = require('../controllers/assetController');

const {
  validateCreateAsset,
  validateUpdateAsset,
  validateGetAsset,
  validateDeleteAsset,
  validateAddOwner,
  validateRemoveOwner,
  validateUpdateOwners
} = require('../middleware/validation/assetValidation');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (for authenticated users)
router.get('/', getAssets);
router.get('/:id', validateGetAsset, getAsset);

// Admin only routes
router.post('/', authorize('admin'), validateCreateAsset, createAsset);
router.put('/:id', authorize('admin'), validateUpdateAsset, updateAsset);
router.delete('/:id', authorize('admin'), validateDeleteAsset, deleteAsset);

// Owner management (admin only)
router.post('/:id/owners', authorize('admin'), validateAddOwner, addOwner);
router.put('/:id/owners', authorize('admin'), validateUpdateOwners, updateOwners);
router.delete('/:id/owners/:userId', authorize('admin'), validateRemoveOwner, removeOwner);

// Photo upload (admin only)
router.post('/:id/photos', authorize('admin'), uploadPhotos);

module.exports = router; 