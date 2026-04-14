const mongoose = require('mongoose');
const User = require('../src/models/User');
const Asset = require('../src/models/Asset');
const Booking = require('../src/models/Booking');
const SpecialDate = require('../src/models/SpecialDate');
const config = require('../src/config/config');

async function cleanupTestData() {
  try {
    // Connect to database
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Delete all users except admin
    const deleteUsers = await User.deleteMany({ 
      email: { $ne: 'admin@example.com' } 
    });
    
    console.log(`Deleted ${deleteUsers.deletedCount} test users`);
    
    // Delete all test assets
    const deleteAssets = await Asset.deleteMany({});
    console.log(`Deleted ${deleteAssets.deletedCount} test assets`);
    
    // Delete all test bookings
    const deleteBookings = await Booking.deleteMany({});
    console.log(`Deleted ${deleteBookings.deletedCount} test bookings`);
    
    // Delete all special dates
    const deleteSpecialDates = await SpecialDate.deleteMany({});
    console.log(`Deleted ${deleteSpecialDates.deletedCount} special dates`);
    
    console.log('Database cleanup complete ✅');
  } catch (err) {
    console.error('Error cleaning up test data:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupTestData(); 