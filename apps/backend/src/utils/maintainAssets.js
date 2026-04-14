const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const User = require('../models/User');
const config = require('../config/config');

// Connect to MongoDB
mongoose.connect(config.mongoURI)
  .then(() => {
    console.log('MongoDB Connected');
    maintainAssets().then(() => {
      console.log('Asset maintenance completed');
      mongoose.disconnect();
    });
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

/**
 * Comprehensive asset maintenance script
 * Performs multiple checks and fixes:
 * 1. Removes invalid owners (null, undefined, or with invalid share percentages)
 * 2. Ensures total ownership adds up to 100%
 * 3. Ensures all assets have at least one owner
 * 4. Updates user's ownedAssets to match asset ownership records
 */
async function maintainAssets() {
  try {
    console.log('Starting asset maintenance...');
    
    // Get all assets
    const assets = await Asset.find();
    console.log(`Found ${assets.length} total assets`);
    
    // Get admin user for assigning ownership if needed
    const adminUser = await User.findOne({ role: 'admin' }).sort({ _id: 1 });
    if (!adminUser) {
      console.error('No admin user found. Aborting.');
      return;
    }
    console.log(`Found admin user: ${adminUser.email}`);
    
    // Get all users for syncing ownedAssets
    const allUsers = await User.find();
    console.log(`Found ${allUsers.length} total users`);
    
    // Track stats
    let fixedCount = 0;
    let userSyncCount = 0;
    let errorCount = 0;
    let issuesByType = {
      nullOwners: 0,
      invalidSharePercentage: 0,
      totalShareNotEqual100: 0,
      noOwners: 0,
      userAssetMismatch: 0
    };
    
    // Process each asset
    for (const asset of assets) {
      let assetModified = false;
      
      console.log(`\nProcessing asset: ${asset._id} (${asset.name})`);
      
      // 1. Check if asset has owners array
      if (!asset.owners || !Array.isArray(asset.owners)) {
        console.log(`- Asset has no owners array. Creating one...`);
        asset.owners = [];
        assetModified = true;
        issuesByType.noOwners++;
      }
      
      // 2. Remove invalid owners
      const originalLength = asset.owners.length;
      asset.owners = asset.owners.filter(owner => {
        // Check for null user
        if (!owner || !owner.user) {
          console.log(`- Removing owner with null user reference`);
          issuesByType.nullOwners++;
          return false;
        }
        
        // Check for valid share percentage
        const sharePercentage = Number(owner.sharePercentage);
        const validPercentages = [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
        const hasValidPercentage = 
          !isNaN(sharePercentage) && 
          sharePercentage > 0 && 
          validPercentages.includes(sharePercentage);
        
        if (!hasValidPercentage) {
          console.log(`- Removing owner (${owner.user}) with invalid share percentage: ${sharePercentage}`);
          issuesByType.invalidSharePercentage++;
          return false;
        }
        
        return true;
      });
      
      if (originalLength !== asset.owners.length) {
        console.log(`- Removed ${originalLength - asset.owners.length} invalid owners`);
        assetModified = true;
      }
      
      // 3. Calculate total share percentage
      const totalPercentage = asset.owners.reduce((sum, owner) => sum + Number(owner.sharePercentage), 0);
      
      // 4. Handle cases where total is not 100%
      if (totalPercentage !== 100) {
        console.log(`- Total ownership is ${totalPercentage}% (should be 100%)`);
        issuesByType.totalShareNotEqual100++;
        
        if (totalPercentage < 100) {
          // If under 100%, add or update admin's share
          const adminOwnerIndex = asset.owners.findIndex(owner => 
            owner.user.toString() === adminUser._id.toString()
          );
          
          if (adminOwnerIndex !== -1) {
            // Admin is already an owner, increase their percentage
            asset.owners[adminOwnerIndex].sharePercentage = Number(asset.owners[adminOwnerIndex].sharePercentage) + (100 - totalPercentage);
            console.log(`- Increased admin share to ${asset.owners[adminOwnerIndex].sharePercentage}%`);
          } else {
            // Add admin as a new owner with the remaining percentage
            asset.owners.push({
              user: adminUser._id,
              sharePercentage: 100 - totalPercentage,
              purchaseDate: new Date()
            });
            console.log(`- Added admin with ${100 - totalPercentage}% share`);
          }
          
          assetModified = true;
        } else if (totalPercentage > 100) {
          // If over 100%, scale down proportionally
          const scaleFactor = 100 / totalPercentage;
          
          for (let i = 0; i < asset.owners.length; i++) {
            const originalPercentage = Number(asset.owners[i].sharePercentage);
            const newPercentage = Math.floor(originalPercentage * scaleFactor * 8) / 8; // Round to nearest 1/8
            
            // Make sure it's one of the standard percentages
            const standardPercentages = [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
            let closestPercentage = standardPercentages.reduce((prev, curr) => 
              Math.abs(curr - newPercentage) < Math.abs(prev - newPercentage) ? curr : prev
            );
            
            asset.owners[i].sharePercentage = closestPercentage;
          }
          
          console.log(`- Adjusted all ownership shares proportionally`);
          assetModified = true;
        }
      }
      
      // 5. Ensure asset has at least one owner
      if (asset.owners.length === 0) {
        // Add admin as sole owner
        asset.owners.push({
          user: adminUser._id,
          sharePercentage: 100,
          purchaseDate: new Date()
        });
        console.log(`- Added admin as sole owner with 100% share`);
        assetModified = true;
        issuesByType.noOwners++;
      }
      
      // 6. Save asset if modified
      if (assetModified) {
        try {
          await asset.save();
          console.log(`- Saved updated asset`);
          fixedCount++;
        } catch (err) {
          console.error(`- Error saving asset: ${err.message}`);
          errorCount++;
        }
      } else {
        console.log(`- No issues found with asset`);
      }
    }
    
    // 7. Sync user ownedAssets with asset ownership records
    console.log('\nSyncing user ownedAssets with asset ownership records...');
    
    for (const user of allUsers) {
      let userModified = false;
      
      // Get all assets owned by this user
      const userAssets = assets.filter(asset => 
        asset.owners.some(owner => owner.user.toString() === user._id.toString())
      );
      
      // Create map of asset ownerships for this user
      const assetOwnerships = new Map();
      
      userAssets.forEach(asset => {
        const ownerInfo = asset.owners.find(owner => owner.user.toString() === user._id.toString());
        if (ownerInfo) {
          assetOwnerships.set(asset._id.toString(), {
            asset: asset._id,
            sharePercentage: Number(ownerInfo.sharePercentage),
            purchaseDate: ownerInfo.purchaseDate || new Date()
          });
        }
      });
      
      // Check if user's ownedAssets match the assets they own
      const currentOwnedAssets = user.ownedAssets || [];
      
      // Remove assets user no longer owns
      const assetsToKeep = currentOwnedAssets.filter(owned => {
        if (!owned.asset) return false;
        
        const assetId = owned.asset.toString();
        if (!assetOwnerships.has(assetId)) {
          console.log(`- Removing asset ${assetId} from user ${user.email}'s ownedAssets`);
          userModified = true;
          issuesByType.userAssetMismatch++;
          return false;
        }
        
        // Check if share percentage matches
        const currentShare = Number(owned.sharePercentage);
        const actualShare = assetOwnerships.get(assetId).sharePercentage;
        
        if (currentShare !== actualShare) {
          console.log(`- User ${user.email}'s share of asset ${assetId} is wrong (${currentShare}% vs ${actualShare}%)`);
          // We'll update it below
          userModified = true;
          issuesByType.userAssetMismatch++;
          return false;
        }
        
        // Remove from map since it's already in user's ownedAssets and correct
        assetOwnerships.delete(assetId);
        return true;
      });
      
      // Add new assets user owns but aren't in their ownedAssets
      const newOwnedAssets = [...assetsToKeep];
      
      for (const [assetId, ownerInfo] of assetOwnerships.entries()) {
        console.log(`- Adding asset ${assetId} to user ${user.email}'s ownedAssets (${ownerInfo.sharePercentage}%)`);
        newOwnedAssets.push(ownerInfo);
        userModified = true;
        issuesByType.userAssetMismatch++;
      }
      
      // Update user if modified
      if (userModified) {
        try {
          user.ownedAssets = newOwnedAssets;
          await user.save();
          console.log(`- Updated user ${user.email}'s ownedAssets`);
          userSyncCount++;
        } catch (err) {
          console.error(`- Error updating user ${user.email}: ${err.message}`);
          errorCount++;
        }
      }
    }
    
    // Report results
    console.log('\n========================');
    console.log('MAINTENANCE SUMMARY');
    console.log('========================');
    console.log(`Total assets: ${assets.length}`);
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Assets fixed: ${fixedCount}`);
    console.log(`User records synced: ${userSyncCount}`);
    console.log(`Errors encountered: ${errorCount}`);
    console.log('\nIssues by type:');
    console.log(`- Null owner references: ${issuesByType.nullOwners}`);
    console.log(`- Invalid share percentages: ${issuesByType.invalidSharePercentage}`);
    console.log(`- Total share ≠ 100%: ${issuesByType.totalShareNotEqual100}`);
    console.log(`- Assets with no owners: ${issuesByType.noOwners}`);
    console.log(`- User-asset mismatches: ${issuesByType.userAssetMismatch}`);
    
  } catch (err) {
    console.error('Error in asset maintenance:', err);
  }
}

// Script will run automatically when executed 