const Asset = require('../models/Asset');
const User = require('../models/User');
const { handleNullOwners } = require('../utils/assetUtils');
const DateUtils = require('../utils/dateUtils');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// @desc    Get all assets
// @route   GET /api/assets
// @access  Public
exports.getAssets = async (req, res) => {
  try {
    // Get assets from database directly without validation
    const assetsFromDb = await Asset.find().lean();
    
    // Populate user info separately to avoid validation errors
    const assets = await Promise.all(
      assetsFromDb.map(async (asset) => {
        try {
          // Only populate valid user references
          if (asset.owners && Array.isArray(asset.owners)) {
            const populatedOwners = await Promise.all(
              asset.owners.map(async (owner) => {
                if (!owner.user) return owner;
                
                try {
                  const user = await User.findById(owner.user).select('name lastName email').lean();
                  if (user) {
                    return {
                      ...owner,
                      user
                    };
                  }
                  return owner;
                } catch (err) {
                  return owner;
                }
              })
            );
            
            return {
              ...asset,
              owners: populatedOwners
            };
          }
          return asset;
        } catch (err) {
          console.error(`Error populating asset ${asset._id}:`, err);
          return asset;
        }
      })
    );
    
    // Handle null owners for each asset
    let assetsModified = false;
    let assetErrors = [];
    
    const fixedAssets = [];
    
    for (const asset of assets) {
      try {
        // Skip assets that don't have an owners array
        if (!asset.owners || !Array.isArray(asset.owners)) {
          console.warn(`Asset ${asset._id} has no owners array, skipping`);
          assetErrors.push({
            assetId: asset._id,
            error: "Asset has no owners array"
          });
          continue;
        }
        
        // Remove any owners with invalid share percentages
        const validOwners = asset.owners.filter(owner => {
          if (!owner) return false;
          
          const sharePercentage = Number(owner.sharePercentage);
          return !isNaN(sharePercentage) && 
                 sharePercentage > 0 && 
                 [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100].includes(sharePercentage);
        });
        
        if (validOwners.length !== asset.owners.length) {
          assetsModified = true;
          console.log(`Filtered invalid owners from asset ${asset._id}`);
        }
        
        // Calculate total ownership percentage
        const totalPercentage = validOwners.reduce((sum, owner) => sum + Number(owner.sharePercentage), 0);
        
        if (totalPercentage > 100) {
          console.warn(`Asset ${asset._id} has invalid total ownership: ${totalPercentage}%`);
          assetErrors.push({
            assetId: asset._id,
            error: `Invalid total ownership percentage: ${totalPercentage}% (cannot exceed 100%)`
          });
        }
        
        // Create a fixed version of the asset for display purposes
        const fixedAsset = {
          ...asset,
          owners: validOwners
        };
        
        fixedAssets.push(fixedAsset);
      } catch (err) {
        console.error(`Error handling asset ${asset._id}:`, err);
        assetErrors.push({
          assetId: asset._id,
          error: err.message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      count: fixedAssets.length,
      data: fixedAssets,
      errors: assetErrors.length > 0 ? assetErrors : undefined
    });
  } catch (err) {
    console.error('Error in getAssets:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error: ' + err.message
    });
  }
};

// @desc    Get single asset
// @route   GET /api/assets/:id
// @access  Public
exports.getAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('owners.user', 'name lastName email');
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    // Handle null owners
    const modified = await handleNullOwners(asset);
    
    // If asset was modified, fetch it again with the updated data
    const finalAsset = modified 
      ? await Asset.findById(req.params.id).populate('owners.user', 'name lastName email')
      : asset;

    res.status(200).json({
      success: true,
      data: finalAsset
    });
  } catch (err) {
    console.error('Error in getAsset:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new asset
// @route   POST /api/assets
// @access  Private
exports.createAsset = async (req, res) => {
  try {
    // Create asset data from request body
    const assetData = {
      name: req.body.name,
      type: req.body.type,
      description: req.body.description,
      location: req.body.location,
      capacity: req.body.capacity,
      photos: req.body.photos || [],
      amenities: req.body.amenities || [],
      owners: [] // Start with no owners - ownership will be added as shares are sold
    };
    
    const asset = await Asset.create(assetData);
    
    // Populate owner details before returning (even though empty initially)
    const populatedAsset = await Asset.findById(asset._id).populate('owners.user', 'name lastName email');
    
    res.status(201).json({
      success: true,
      data: populatedAsset
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Create new asset (legacy - with admin ownership)
// @route   POST /api/assets/with-admin-owner
// @access  Private
exports.createAssetWithAdminOwner = async (req, res) => {
  try {
    // Find the admin user (user with ID 1)
    const adminUser = await User.findOne({ role: 'admin' }).sort({ _id: 1 }).limit(1);
    
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        error: 'Admin user not found. Please create a user first.'
      });
    }
    
    // Verify the user is an admin
    if (adminUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin users can create assets with 100% ownership'
      });
    }
    
    // Create asset with admin as default owner with 100% share
    const assetData = {
      ...req.body,
      owners: [{
        user: adminUser._id,
        sharePercentage: 100, // Admin starts with 100% ownership
        purchaseDate: new Date(),
        purchasePrice: 0 // Default purchase price
      }]
    };
    
    const asset = await Asset.create(assetData);
    
    // Add asset to admin's ownedAssets
    adminUser.ownedAssets.push({
      asset: asset._id,
      sharePercentage: 100,
      purchaseDate: new Date(),
      purchasePrice: 0
    });
    
    await adminUser.save();
    
    res.status(201).json({
      success: true,
      data: asset
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
        error: 'Server Error: ' + err.message
      });
    }
  }
};

// @desc    Update asset
// @route   PUT /api/assets/:id
// @access  Private
exports.updateAsset = async (req, res) => {
  try {
    let asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: asset
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private
exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    await Asset.deleteOne({ _id: req.params.id });
    
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

// @desc    Add owner to asset
// @route   POST /api/assets/:id/owners
// @access  Private
exports.addOwner = async (req, res) => {
  try {
    const { userId, sharePercentage, purchasePrice } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Validate allowed share percentages based on user role
    const validPercentages = [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
    
    if (!validPercentages.includes(Number(sharePercentage))) {
      return res.status(400).json({
        success: false,
        error: 'Share percentage must be one of the standard percentages: 12.5%, 25%, 37.5%, 50%, 62.5%, 75%, 87.5%, or 100%'
      });
    }
    
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    // Check if user is already an owner
    const existingOwnerIndex = asset.owners.findIndex(
      owner => owner.user.toString() === userId.toString()
    );
    
    if (existingOwnerIndex !== -1) {
      return res.status(400).json({
        success: false,
        error: 'User already owns shares in this asset'
      });
    }
    
    // Find the admin owner (first user added to the asset)
    const adminOwnerIndex = asset.owners.findIndex(
      owner => owner.user.toString() === asset.owners[0].user.toString()
    );
    
    if (adminOwnerIndex === -1) {
      return res.status(400).json({
        success: false,
        error: 'Admin owner not found in this asset'
      });
    }
    
    const adminCurrentShare = asset.owners[adminOwnerIndex].sharePercentage;
    
    // Check if admin has enough share to transfer
    if (adminCurrentShare < Number(sharePercentage)) {
      return res.status(400).json({
        success: false,
        error: `Cannot add ${sharePercentage}% share. Admin only has ${adminCurrentShare}% remaining.`
      });
    }
    
    // Reduce admin's share
    const adminNewShare = adminCurrentShare - Number(sharePercentage);
    asset.owners[adminOwnerIndex].sharePercentage = adminNewShare;
    
    // Add owner to asset
    asset.owners.push({
      user: userId,
      sharePercentage: Number(sharePercentage),
      purchaseDate: new Date(),
      purchasePrice: purchasePrice || 0
    });
    
    await asset.save();
    
    // Update admin's owned assets
    const adminUser = await User.findById(asset.owners[adminOwnerIndex].user);
    if (adminUser) {
      const adminAssetIndex = adminUser.ownedAssets.findIndex(
        item => item.asset.toString() === asset._id.toString()
      );
      
      if (adminAssetIndex !== -1) {
        adminUser.ownedAssets[adminAssetIndex].sharePercentage = adminNewShare;
        await adminUser.save();
      }
    }
    
    // Add asset to new user's owned assets
    user.ownedAssets.push({
      asset: asset._id,
      sharePercentage: Number(sharePercentage),
      purchaseDate: new Date(),
      purchasePrice: purchasePrice || 0
    });
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: asset
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error: ' + err.message
    });
  }
};

// @desc    Remove owner from asset
// @route   DELETE /api/assets/:id/owners/:userId
// @access  Private
exports.removeOwner = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    // Find owner index
    const ownerIndex = asset.owners.findIndex(
      owner => owner.user.toString() === req.params.userId
    );
    
    if (ownerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Owner not found in this asset'
      });
    }
    
    // Remove owner from asset
    asset.owners.splice(ownerIndex, 1);
    await asset.save();
    
    // Remove asset from user's owned assets
    const user = await User.findById(req.params.userId);
    if (user) {
      const assetIndex = user.ownedAssets.findIndex(
        item => item.asset.toString() === req.params.id
      );
      
      if (assetIndex !== -1) {
        user.ownedAssets.splice(assetIndex, 1);
        await user.save();
      }
    }
    
    res.status(200).json({
      success: true,
      data: asset
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update a user's anniversary anchor for an asset (forward-only)
// @route   PATCH /api/assets/:id/owners/:userId/anniversary
// @access  Private (Admin only)
exports.updateOwnerAnniversary = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { anniversaryDate, note } = req.body;

    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    const owner = asset.owners.find((o) => o.user && o.user.toString() === userId.toString());
    if (!owner) {
      return res.status(404).json({ success: false, error: 'Owner not found in this asset' });
    }

    const today = DateUtils.parseApiDate(DateUtils.normalize(new Date()));
    const anniv = DateUtils.parseApiDate(anniversaryDate);

    if (!owner.anniversaryHistory) owner.anniversaryHistory = [];

    owner.anniversaryHistory.push({
      anniversaryDate: anniv,
      effectiveFrom: today,
      updatedAt: new Date(),
      updatedByAdminId: req.user?.id || null,
      note: (note || '').toString()
    });

    await asset.save();

    return res.status(200).json({
      success: true,
      data: {
        assetId: asset._id,
        ownerUserId: userId,
        effectiveFrom: DateUtils.formatForApi(today),
        anniversaryDate: DateUtils.formatForApi(anniv),
        note: (note || '').toString()
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server Error: ' + err.message });
  }
};

// @desc    Update asset owners (bulk update)
// @route   PUT /api/assets/:id/owners
// @access  Private (Admin only)
exports.updateOwners = async (req, res) => {
  try {
    const { owners } = req.body;
    
    if (!owners || !Array.isArray(owners)) {
      return res.status(400).json({
        success: false,
        error: 'Owners array is required'
      });
    }
    
    // Validate share percentages
    const validPercentages = [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
    
    for (const owner of owners) {
      if (!owner.userId) {
        return res.status(400).json({
          success: false,
          error: 'Each owner must have a userId'
        });
      }
      
      if (!validPercentages.includes(Number(owner.sharePercentage))) {
        return res.status(400).json({
          success: false,
          error: `Share percentage must be one of: ${validPercentages.join(', ')}`
        });
      }
      
      // Check if user exists
      const user = await User.findById(owner.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: `User not found: ${owner.userId}`
        });
      }
    }
    
    // Validate total percentage does not exceed 100
    const totalPercentage = owners.reduce((sum, owner) => sum + Number(owner.sharePercentage), 0);
    if (totalPercentage > 100) {
      return res.status(400).json({
        success: false,
        error: `Total ownership cannot exceed 100% (currently ${totalPercentage}%)`
      });
    }
    
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }
    
    // Keep track of old owners for cleanup
    const oldOwners = asset.owners.map(o => ({
      userId: o.user.toString(),
      sharePercentage: o.sharePercentage
    }));
    
    // Update asset owners
    asset.owners = owners.map(owner => ({
      user: owner.userId,
      sharePercentage: Number(owner.sharePercentage),
      since: owner.since || new Date()
    }));
    
    await asset.save();
    
    // Update users' ownedAssets arrays
    // 1. Remove asset from users who are no longer owners
    const newOwnerIds = owners.map(o => o.userId);
    const removedOwners = oldOwners.filter(o => !newOwnerIds.includes(o.userId));
    
    for (const removed of removedOwners) {
      const user = await User.findById(removed.userId);
      if (user) {
        const assetIndex = user.ownedAssets.findIndex(
          item => item.asset.toString() === req.params.id
        );
        if (assetIndex !== -1) {
          user.ownedAssets.splice(assetIndex, 1);
          await user.save();
        }
      }
    }
    
    // 2. Add or update asset for current owners
    for (const owner of owners) {
      const user = await User.findById(owner.userId);
      if (user) {
        const assetIndex = user.ownedAssets.findIndex(
          item => item.asset.toString() === req.params.id
        );
        
        if (assetIndex !== -1) {
          // Update existing ownership
          user.ownedAssets[assetIndex].sharePercentage = Number(owner.sharePercentage);
        } else {
          // Add new ownership
          user.ownedAssets.push({
            asset: asset._id,
            sharePercentage: Number(owner.sharePercentage),
            purchaseDate: new Date()
          });
        }
        await user.save();
      }
    }
    
    // Fetch updated asset with populated owners
    const updatedAsset = await Asset.findById(req.params.id).populate('owners.user', 'name lastName email');
    
    res.status(200).json({
      success: true,
      data: updatedAsset
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error: ' + err.message
    });
  }
};

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/assets');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @desc    Upload photos for an asset
// @route   POST /api/assets/:id/photos
// @access  Private (Admin only)
exports.uploadPhotos = async (req, res) => {
  try {
    const assetId = req.params.id;
    
    // Check if asset exists
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    // Handle multer upload
    upload.array('photos', 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No photos uploaded'
        });
      }

      try {
        // Generate URLs for the uploaded photos
        const photoUrls = req.files.map(file => {
          return `/uploads/assets/${file.filename}`;
        });

        // Update asset with new photo URLs
        const updatedAsset = await Asset.findByIdAndUpdate(
          assetId,
          { $push: { photos: { $each: photoUrls } } },
          { new: true }
        );

        res.status(200).json({
          success: true,
          message: `${req.files.length} photo(s) uploaded successfully`,
          data: {
            photoUrls,
            asset: updatedAsset
          }
        });
      } catch (updateErr) {
        // Clean up uploaded files if database update fails
        req.files.forEach(file => {
          const filePath = path.join(__dirname, '../../uploads/assets', file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });

        res.status(500).json({
          success: false,
          error: 'Failed to update asset with photos: ' + updateErr.message
        });
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error: ' + err.message
    });
  }
}; 