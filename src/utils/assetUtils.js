const User = require('../models/User');
const { appendLogLine } = require('./logFiles');

/**
 * Log null owner information for bookkeeping
 * @param {string} assetId - The ID of the asset
 * @param {string} ownerId - The ID of the null owner
 * @param {number} sharePercentage - The share percentage
 */
const logNullOwner = (assetId, ownerId, sharePercentage) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - Asset: ${assetId}, Null Owner ID: ${ownerId}, Share: ${sharePercentage}%\n`;

  appendLogLine('null-owners.log', logEntry);
};

/**
 * Handle null user references in asset ownership
 * @param {Object} asset - The asset object
 * @returns {Promise<boolean>} - Returns true if changes were made
 */
const handleNullOwners = async (asset) => {
  let changes = false;
  const nullOwners = asset.owners.filter(owner => owner.user === null);
  
  if (nullOwners.length === 0) {
    return false;
  }
  
  // Find admin user
  const adminUser = await User.findOne({ role: 'admin' }).sort({ _id: 1 });
  if (!adminUser) {
    console.error('No admin user found to transfer shares to');
    return false;
  }
  
  // Find admin in current owners or add them
  let adminOwner = asset.owners.find(owner => 
    owner.user && owner.user.toString() === adminUser._id.toString()
  );
  
  // If admin is not an owner yet, add them
  if (!adminOwner) {
    adminOwner = {
      user: adminUser._id,
      sharePercentage: 0,
      since: new Date()
    };
    asset.owners.push(adminOwner);
  }
  
  // Process each null owner
  for (const nullOwner of nullOwners) {
    // Log the null owner for bookkeeping
    logNullOwner(asset._id, nullOwner._id, nullOwner.sharePercentage);
    
    // Transfer shares to admin
    adminOwner.sharePercentage += nullOwner.sharePercentage;
    
    // Remove the null owner
    asset.owners = asset.owners.filter(owner => owner._id.toString() !== nullOwner._id.toString());
    
    changes = true;
  }
  
  // Update admin's owned assets record
  if (changes) {
    const adminAssetIndex = adminUser.ownedAssets.findIndex(
      item => item.asset.toString() === asset._id.toString()
    );
    
    if (adminAssetIndex !== -1) {
      adminUser.ownedAssets[adminAssetIndex].sharePercentage = adminOwner.sharePercentage;
    } else {
      adminUser.ownedAssets.push({
        asset: asset._id,
        sharePercentage: adminOwner.sharePercentage,
        purchaseDate: new Date()
      });
    }
    
    await adminUser.save();
    await asset.save();
  }
  
  return changes;
};

module.exports = {
  handleNullOwners,
  logNullOwner
}; 
