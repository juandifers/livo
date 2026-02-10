const express = require('express');
const { 
  getBookings, 
  getBooking, 
  getAssetBookings,
  createBooking, 
  updateBooking, 
  deleteBooking,
  getAvailability,
  getUserAllocation,
  getSpecialDates,
  getAllSpecialDates,
  createSpecialDates,
  deleteSpecialDate,
  processExtraDaysPayment,
  getBlockedDates,
  createBlockedDate,
  deleteBlockedDate
} = require('../controllers/bookingController');

const {
  validateCreateBooking,
  validateUpdateBooking,
  validateGetBooking,
  validateDeleteBooking,
  validateGetBookings,
  validateGetAvailability,
  validateGetUserAllocation,
  validateCreateSpecialDates,
  validateGetSpecialDates,
  validateDeleteSpecialDate,
  validateProcessPayment
} = require('../middleware/validation/bookingValidation');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public availability route - available to all authenticated users
router.get('/availability/:assetId', validateGetAvailability, getAvailability);

// User allocation route
router.get('/allocation/:userId/:assetId', validateGetUserAllocation, getUserAllocation);

// Special dates routes - admin only for creation/deletion
router.get('/special-dates/all', authorize('admin'), getAllSpecialDates);
router.get('/special-dates/:assetId', validateGetSpecialDates, getSpecialDates);
router.post('/special-dates', authorize('admin'), validateCreateSpecialDates, createSpecialDates);
router.delete('/special-dates/:id', authorize('admin'), validateDeleteSpecialDate, deleteSpecialDate);

// Blocked dates routes - admin only (FEAT-ADMIN-BLOCK-001)
router.get('/blocked-dates/:assetId', authorize('admin'), getBlockedDates);
router.post('/blocked-dates', authorize('admin'), createBlockedDate);
router.delete('/blocked-dates/:id', authorize('admin'), deleteBlockedDate);

// Payment processing
router.post('/payment/:id', validateProcessPayment, processExtraDaysPayment);

// Asset bookings route
router.get('/asset/:assetId', getAssetBookings);

// Standard booking CRUD routes
router
  .route('/')
  .get(validateGetBookings, getBookings)
  .post(validateCreateBooking, createBooking);

router
  .route('/:id')
  .get(validateGetBooking, getBooking)
  .put(validateUpdateBooking, updateBooking)
  .delete(validateDeleteBooking, deleteBooking);

module.exports = router; 