const mongoose = require('mongoose');
const Asset = require('./src/models/Asset');
const User = require('./src/models/User');
const config = require('./src/config/config');

async function fixAssetOwnership() {
  try {
    // Connect to database
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('🔗 Connected to MongoDB');

    // Get the test users
    const sarah = await User.findOne({ email: 'sarah.johnson@example.com' });
    const michael = await User.findOne({ email: 'michael.chen@example.com' });
    const emma = await User.findOne({ email: 'emma.rodriguez@example.com' });

    if (!sarah || !michael || !emma) {
      console.log('❌ Test users not found');
      return;
    }

    console.log('👥 Found test users:');
    console.log(`   - Sarah: ${sarah._id}`);
    console.log(`   - Michael: ${michael._id}`);
    console.log(`   - Emma: ${emma._id}`);

    // Fix boat asset (Serenity Dreams)
    const boat = await Asset.findOne({ name: 'Serenity Dreams' });
    if (boat) {
      boat.owners = [
        { user: sarah._id, sharePercentage: 50, since: new Date() },
        { user: michael._id, sharePercentage: 25, since: new Date() },
        { user: emma._id, sharePercentage: 25, since: new Date() }
      ];
      await boat.save();
      console.log(`   ⛵ Fixed ${boat.name}: Sarah (50%), Michael (25%), Emma (25%)`);
    }

    // Fix mountain home (Alpine Vista Retreat)
    const home = await Asset.findOne({ name: 'Alpine Vista Retreat' });
    if (home) {
      home.owners = [
        { user: sarah._id, sharePercentage: 25, since: new Date() },
        { user: michael._id, sharePercentage: 37.5, since: new Date() },
        { user: emma._id, sharePercentage: 37.5, since: new Date() }
      ];
      await home.save();
      console.log(`   🏔️ Fixed ${home.name}: Sarah (25%), Michael (37.5%), Emma (37.5%)`);
    }

    // Fix beach cabin (Coastal Haven Cabin)
    const cabin = await Asset.findOne({ name: 'Coastal Haven Cabin' });
    if (cabin) {
      cabin.owners = [
        { user: michael._id, sharePercentage: 50, since: new Date() },
        { user: emma._id, sharePercentage: 50, since: new Date() }
      ];
      await cabin.save();
      console.log(`   🏖️ Fixed ${cabin.name}: Michael (50%), Emma (50%)`);
    }

    console.log('✅ Asset ownership fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing asset ownership:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixAssetOwnership(); 