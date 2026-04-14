const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const User = require('../models/User');
const config = require('../config/config');
const { VALID_OWNERSHIP_PERCENTAGES } = require('@livo/contracts');

// Connect to MongoDB
mongoose.connect(config.mongoURI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

async function fixInvalidAssets() {
  try {
    console.log('Looking for assets with invalid ownership percentages...');
    
    // Find all assets
    const assets = await Asset.find();
    console.log(`Found ${assets.length} total assets`);
    
    let fixedCount = 0;
    
    for (const asset of assets) {
      let needsFixing = false;
      
      // Check for null users or invalid percentages
      if (asset.owners && Array.isArray(asset.owners)) {
        // Filter out owners with invalid percentages (0 or null)
        const validOwners = asset.owners.filter(owner => {
          const isValid = owner.sharePercentage > 0 && 
                         VALID_OWNERSHIP_PERCENTAGES.includes(owner.sharePercentage);
          
          if (!isValid) {
            console.log(`Found invalid owner in asset ${asset._id}: User ${owner.user}, SharePercentage: ${owner.sharePercentage}`);
            needsFixing = true;
          }
          
          return isValid;
        });
        
        // Check if any owners were removed
        if (validOwners.length !== asset.owners.length) {
          // Calculate total share percentage of valid owners
          const totalValidPercentage = validOwners.reduce((sum, owner) => sum + owner.sharePercentage, 0);
          
          // If total is less than 100%, find admin to assign remaining percentage
          if (totalValidPercentage < 100) {
            const adminUser = await User.findOne({ role: 'admin' });
            
            if (adminUser) {
              // Check if admin is already an owner
              const adminOwnerIndex = validOwners.findIndex(owner => 
                owner.user && owner.user.toString() === adminUser._id.toString()
              );
              
              if (adminOwnerIndex !== -1) {
                // Admin is already an owner, increase their percentage
                validOwners[adminOwnerIndex].sharePercentage += (100 - totalValidPercentage);
                console.log(`Increased admin share in asset ${asset._id} by ${100 - totalValidPercentage}%`);
              } else {
                // Add admin as a new owner with the remaining percentage
                validOwners.push({
                  user: adminUser._id,
                  sharePercentage: 100 - totalValidPercentage,
                  since: new Date()
                });
                console.log(`Added admin to asset ${asset._id} with ${100 - totalValidPercentage}% share`);
              }
            }
          }
          
          // Update the asset with valid owners
          asset.owners = validOwners;
          await asset.save();
          fixedCount++;
          console.log(`Fixed asset ${asset._id}`);
        }
      }
    }
    
    console.log(`Fixed ${fixedCount} assets with invalid ownership data`);
    console.log('Done!');
  } catch (err) {
    console.error('Error fixing assets:', err);
  } finally {
    mongoose.disconnect();
  }
}

// Run the fix
fixInvalidAssets(); 