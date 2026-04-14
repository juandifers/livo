const mongoose = require('mongoose');
const config = require('../config/config');
const User = require('../models/User');
const Asset = require('../models/Asset');
const { VALID_OWNERSHIP_PERCENTAGES } = require('@livo/contracts');
const { ObjectId } = mongoose.Types;

// Connect to MongoDB
mongoose.connect(config.mongoURI)
  .then(() => {
    console.log('MongoDB Connected');
    // Run the fix function after connection is established
    fixAssetOwners().then(() => {
      console.log('Script completed');
      mongoose.disconnect();
    });
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function fixAssetOwners() {
  try {
    console.log('Fixing assets with invalid ownership percentages...');
    
    // Problem asset IDs from the error response
    const problemAssetIds = [
      "682f7bf0ee62bc73017d53a4",
      "682f85a97fd51f0ca77dc3a0"
    ];
    
    console.log(`Targeting specific problem assets: ${problemAssetIds.join(', ')}`);
    
    // Using native MongoDB driver via mongoose.connection
    const assetCollection = mongoose.connection.collection('assets');
    
    // Find admin user for assigning ownership if needed
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found. Aborting.');
      return;
    }
    console.log(`Found admin user: ${adminUser.email}`);
    
    let fixedCount = 0;
    
    for (const assetId of problemAssetIds) {
      console.log(`Processing asset ${assetId}...`);
      
      // Convert string ID to ObjectId
      const objectId = new ObjectId(assetId);
      
      // Find the asset by ID
      const asset = await assetCollection.findOne({ _id: objectId });
      
      if (!asset) {
        console.log(`Asset ${assetId} not found in database`);
        continue;
      }
      
      console.log(`Found asset ${assetId}`);
      console.log(`Current owners:`, JSON.stringify(asset.owners, null, 2));
      
      let modified = false;
      
      // Check if asset has owners array
      if (!asset.owners || !Array.isArray(asset.owners)) {
        console.log(`Asset ${assetId} has no owners array. Creating one...`);
        asset.owners = [];
        modified = true;
      }
      
      // DIRECT FIX: Remove any owners with 0% or null share percentages
      const originalLength = asset.owners.length;
      asset.owners = asset.owners.filter(owner => {
        const sharePercentage = owner?.sharePercentage;
        
        // Log all owners for debugging
        console.log(`Owner: ${owner?.user}, SharePercentage: ${sharePercentage}`);
        
        const hasValidPercentage =
          owner &&
          sharePercentage !== undefined &&
          sharePercentage !== null &&
          sharePercentage > 0 &&
          VALID_OWNERSHIP_PERCENTAGES.includes(Number(sharePercentage));
        
        if (!hasValidPercentage) {
          console.log(`Removing invalid owner from asset ${assetId}: Share percentage: ${sharePercentage}`);
          modified = true;
        }
        
        return hasValidPercentage;
      });
      
      if (originalLength !== asset.owners.length) {
        console.log(`Removed ${originalLength - asset.owners.length} invalid owners from asset ${assetId}`);
      }
      
      // Calculate total share percentage
      const totalPercentage = asset.owners.reduce((sum, owner) => sum + Number(owner.sharePercentage), 0);
      console.log(`Total ownership percentage: ${totalPercentage}%`);
      
      // If total is less than 100%, assign the remainder to admin
      if (totalPercentage < 100) {
        console.log(`Asset ${assetId} has total ownership of ${totalPercentage}%. Adding admin for remaining ${100 - totalPercentage}%`);
        
        // Check if admin is already an owner
        const adminOwnerIndex = asset.owners.findIndex(owner => 
          owner.user && owner.user.toString() === adminUser._id.toString()
        );
        
        if (adminOwnerIndex !== -1) {
          // Admin is already an owner, increase their percentage
          asset.owners[adminOwnerIndex].sharePercentage = Number(asset.owners[adminOwnerIndex].sharePercentage) + (100 - totalPercentage);
          console.log(`Increased admin share in asset ${assetId} to ${asset.owners[adminOwnerIndex].sharePercentage}%`);
        } else {
          // Add admin as a new owner with the remaining percentage
          asset.owners.push({
            user: adminUser._id,
            sharePercentage: 100 - totalPercentage,
            purchaseDate: new Date()
          });
          console.log(`Added admin to asset ${assetId} with ${100 - totalPercentage}% share`);
        }
        
        modified = true;
      }
      
      // Update the asset if modified
      if (modified) {
        console.log(`Updated owners list:`, JSON.stringify(asset.owners, null, 2));
        await assetCollection.updateOne(
          { _id: objectId },
          { $set: { owners: asset.owners } }
        );
        fixedCount++;
        console.log(`Updated asset ${assetId} in database`);
      } else {
        console.log(`No changes needed for asset ${assetId}`);
      }
    }
    
    console.log(`Fixed ${fixedCount} assets with invalid ownership data`);
  } catch (err) {
    console.error('Error fixing assets:', err);
  }
} 