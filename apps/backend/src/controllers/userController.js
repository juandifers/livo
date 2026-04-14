const User = require('../models/User');
const Asset = require('../models/Asset');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');
const { DAYS_PER_EIGHTH_SHARE } = require('@livo/contracts');

// @desc    Get all users
// @route   GET /api/users
// @access  Public
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Public
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Public
exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Public
exports.updateUser = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    await User.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete current user account
// @route   DELETE /api/users/me
// @access  Private
exports.deleteMyAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: 'Account setup not completed. Unable to delete account.'
      });
    }

    const isPasswordValid = await user.matchPassword(req.body.currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // A user that owns assets must be handled by an admin to prevent ownership gaps.
    const ownedAssetCount = await Asset.countDocuments({ 'owners.user': user._id });
    if (ownedAssetCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your account while you are an owner of one or more assets. Please contact an administrator.'
      });
    }

    const now = new Date();
    const upcomingBookings = await Booking.countDocuments({
      user: user._id,
      status: { $ne: 'cancelled' },
      endDate: { $gte: now }
    });

    if (upcomingBookings > 0) {
      return res.status(400).json({
        success: false,
        error: 'You have upcoming bookings. Cancel them before deleting your account.'
      });
    }

    // Remove historical and cancelled bookings tied to this user to avoid dangling references.
    await Booking.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Account deleted successfully'
      }
    });
  } catch (err) {
    console.error('Error deleting account:', err);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get user's owned assets with detailed information
// @route   GET /api/users/me/assets
// @access  Private
exports.getUserOwnedAssets = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentYear = new Date().getFullYear();
    
    // Find all assets where the user is an owner
    const assets = await Asset.find({
      'owners.user': userId
    }).populate('owners.user', 'name email');
    
    if (!assets || assets.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Get all bookings for the user's assets in the current year
    const assetIds = assets.map(asset => asset._id);
    
    const bookings = await Booking.find({
      asset: { $in: assetIds },
      year: currentYear,
      status: { $ne: 'cancelled' }
    }).lean();
    
    // Process each owned asset to add detailed information
    const detailedAssets = await Promise.all(assets.map(async (asset) => {
      // Find the user's ownership info in this asset
      const userOwnership = asset.owners.find(owner => 
        owner.user._id.toString() === userId.toString()
      );
      
      if (!userOwnership) {
        return null; // This shouldn't happen since we queried for it
      }
      
      // Get asset bookings for this user
      const assetBookings = bookings.filter(booking => 
        booking.asset.toString() === asset._id.toString()
      );
      
      // Calculate days used by this user
      const daysUsed = assetBookings
        .filter(booking => booking.user.toString() === userId.toString())
        .reduce((total, booking) => {
          // Calculate duration (including both start and end dates)
          const duration = Math.ceil((new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)) + 1;
          return total + duration;
        }, 0);
      
      // Get special dates used by this user
      const specialDatesUsed = assetBookings
        .filter(booking => 
          booking.user.toString() === userId.toString() && 
          booking.specialDateType !== null
        )
        .map(booking => ({
          type: booking.specialDateType,
          startDate: booking.startDate,
          endDate: booking.endDate
        }));
      
      // Get active bookings (confirmed and not yet ended) for this user
      const activeBookings = assetBookings
        .filter(booking => 
          booking.user.toString() === userId.toString() &&
          booking.status === 'confirmed' &&
          new Date(booking.endDate) >= new Date()
        )
        .map(booking => ({
          _id: booking._id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
          isShortTerm: booking.isShortTerm,
          specialDateType: booking.specialDateType
        }));
      
      // Calculate days remaining based on ownership percentage
      const daysAllocation = Math.floor((userOwnership.sharePercentage / 12.5) * DAYS_PER_EIGHTH_SHARE);
      const daysRemaining = Math.max(0, daysAllocation - daysUsed);
      
      // Format the response
      return {
        _id: asset._id,
        name: asset.name,
        type: asset.type,
        location: asset.location,
        locationAddress: asset.locationAddress,
        propertyManager: asset.propertyManager,
        description: asset.description,
        capacity: asset.capacity,
        photos: asset.photos,
        amenities: asset.amenities,
        owners: asset.owners.map(owner => ({
          user: {
            _id: owner.user._id,
            name: owner.user.name,
            email: owner.user.email
          },
          sharePercentage: owner.sharePercentage,
          since: owner.since
        })),
        ownership: {
          sharePercentage: userOwnership.sharePercentage,
          since: userOwnership.since
        },
        usage: {
          daysAllocation,
          daysUsed,
          daysRemaining,
          specialDatesUsed
        },
        activeBookings
      };
    }));
    
    // Filter out null assets
    const filteredAssets = detailedAssets.filter(asset => asset !== null);
    
    res.status(200).json({
      success: true,
      count: filteredAssets.length,
      data: filteredAssets
    });
  } catch (err) {
    console.error('Error fetching user assets:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error: ' + err.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// sample api call
