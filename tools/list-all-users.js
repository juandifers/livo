const mongoose = require('mongoose');
const User = require('../src/models/User');
const Asset = require('../src/models/Asset');
const Booking = require('../src/models/Booking');
const config = require('../src/config/config');

async function listAllUsers() {
  try {
    // Connect to database
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('🔗 Connected to MongoDB\n');
    
    // Get all users
    const users = await User.find({}).select('name lastName email role isActive');
    
    console.log(`👥 Found ${users.length} user(s) in database:\n`);
    
    if (users.length === 0) {
      console.log('❌ No users found!');
      console.log('\n💡 You need to set up demo data first:');
      console.log('   npm run demo-data\n');
      return;
    }
    
    for (const user of users) {
      console.log(`📧 ${user.email}`);
      console.log(`   Name: ${user.name} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
      
      // Get assets owned by this user
      const assets = await Asset.find({ 'owners.user': user._id });
      if (assets.length > 0) {
        console.log(`   Assets: ${assets.length}`);
        assets.forEach(asset => {
          const ownership = asset.owners.find(o => o.user.toString() === user._id.toString());
          console.log(`     - ${asset.name} (${asset.type}): ${ownership?.sharePercentage || 0}%`);
        });
      } else {
        console.log(`   Assets: None`);
      }
      
      // Get booking count
      const bookingCount = await Booking.countDocuments({ user: user._id });
      console.log(`   Bookings: ${bookingCount}`);
      
      console.log();
    }
    
    // Show June 2026 bookings for all users
    console.log('\n📅 June 2026 Bookings by User:\n');
    
    const june2026Bookings = await Booking.find({
      startDate: { 
        $gte: new Date(2026, 5, 1),
        $lte: new Date(2026, 5, 30)
      }
    }).populate('user', 'name lastName email').populate('asset', 'name type');
    
    if (june2026Bookings.length === 0) {
      console.log('   No June 2026 bookings found\n');
    } else {
      console.log(`   Found ${june2026Bookings.length} June 2026 booking(s):\n`);
      
      // Group by user
      const byUser = {};
      june2026Bookings.forEach(b => {
        const userEmail = b.user?.email || 'Unknown';
        if (!byUser[userEmail]) {
          byUser[userEmail] = [];
        }
        byUser[userEmail].push(b);
      });
      
      Object.keys(byUser).forEach(userEmail => {
        const userBookings = byUser[userEmail];
        const userName = userBookings[0].user ? `${userBookings[0].user.name} ${userBookings[0].user.lastName}` : 'Unknown';
        
        console.log(`   ${userName} (${userEmail}):`);
        console.log(`     ${userBookings.length} booking(s)`);
        
        userBookings.forEach((b, i) => {
          console.log(`     ${i + 1}. ${b.asset?.name || 'Unknown'}: ${b.startDate.toISOString().split('T')[0]} to ${b.endDate.toISOString().split('T')[0]}`);
          console.log(`        Status: ${b.status}, Special Date: ${b.specialDateType || 'None'}`);
        });
        console.log();
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the list
listAllUsers();
