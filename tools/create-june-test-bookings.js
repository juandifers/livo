const mongoose = require('mongoose');
const User = require('../src/models/User');
const Asset = require('../src/models/Asset');
const Booking = require('../src/models/Booking');
const SpecialDate = require('../src/models/SpecialDate');
const config = require('../src/config/config');

async function createJuneTestBookings() {
  try {
    // Connect to database
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('🔗 Connected to MongoDB\n');
    
    // Find Test User 1
    const testUser1 = await User.findOne({ email: 'testuser@example.com' });
    if (!testUser1) {
      console.log('❌ Test User 1 (testuser@example.com) not found');
      console.log('💡 Run: npm run demo-data first');
      return;
    }
    
    // Find the boat asset (Serenity Dreams)
    const boatAsset = await Asset.findOne({ name: 'Serenity Dreams', type: 'boat' });
    if (!boatAsset) {
      console.log('❌ Serenity Dreams boat not found');
      return;
    }
    
    // Find the home asset (Alpine Vista Retreat)
    const homeAsset = await Asset.findOne({ name: 'Alpine Vista Retreat', type: 'home' });
    
    console.log('✅ Found Test User 1 and Assets\n');
    console.log(`Creating June ${new Date().getFullYear()} test bookings...\n`);
    
    const currentYear = new Date().getFullYear();
    
    // Check if July 4th special date exists for the boat
    const july4Special = await SpecialDate.findOne({
      $or: [{ asset: boatAsset._id }, { asset: null }],
      type: 'type1',
      startDate: { $lte: new Date(currentYear, 6, 7) },
      endDate: { $gte: new Date(currentYear, 6, 1) }
    });
    
    console.log(`July 4th special date exists: ${july4Special ? 'Yes' : 'No'}\n`);
    
    // Delete existing June bookings for Test User 1 to avoid duplicates
    const deleteResult = await Booking.deleteMany({
      user: testUser1._id,
      startDate: { 
        $gte: new Date(currentYear, 5, 1),
        $lte: new Date(currentYear, 5, 30)
      }
    });
    
    console.log(`Deleted ${deleteResult.deletedCount} existing June booking(s)\n`);
    
    // Create June bookings for Test User 1
    const juneBookings = [];
    
    // Booking 1: Early June (no special date)
    juneBookings.push({
      user: testUser1._id,
      asset: boatAsset._id,
      startDate: new Date(currentYear, 5, 1),  // June 1
      endDate: new Date(currentYear, 5, 7),    // June 7 (7 days)
      status: 'confirmed',
      notes: 'Early June vacation on Serenity Dreams',
      specialDateType: null,
      isShortTerm: false,
      isVeryShortTerm: false,
      year: currentYear
    });
    
    // Booking 2: Mid June (no special date)
    juneBookings.push({
      user: testUser1._id,
      asset: boatAsset._id,
      startDate: new Date(currentYear, 5, 10), // June 10
      endDate: new Date(currentYear, 5, 16),   // June 16 (7 days)
      status: 'confirmed',
      notes: 'Mid-June getaway',
      specialDateType: null,
      isShortTerm: false,
      isVeryShortTerm: false,
      year: currentYear
    });
    
    // Booking 3: Late June into July 4th (SHOULD BE TYPE1 SPECIAL)
    // July 4th week special date: July 1-7
    juneBookings.push({
      user: testUser1._id,
      asset: boatAsset._id,
      startDate: new Date(currentYear, 5, 28), // June 28
      endDate: new Date(currentYear, 6, 5),    // July 5 (8 days) - OVERLAPS July 1-7!
      status: 'confirmed',
      notes: 'End of June extending into July 4th week',
      specialDateType: july4Special ? 'type1' : null, // Should be type1 if special date exists
      isShortTerm: false,
      isVeryShortTerm: false,
      year: currentYear
    });
    
    // Booking 4: Home booking in June (no special date)
    if (homeAsset) {
      juneBookings.push({
        user: testUser1._id,
        asset: homeAsset._id,
        startDate: new Date(currentYear, 5, 20), // June 20
        endDate: new Date(currentYear, 5, 24),   // June 24 (5 days)
        status: 'confirmed',
        notes: 'June mountain retreat',
        specialDateType: null,
        isShortTerm: false,
        isVeryShortTerm: false,
        year: currentYear
      });
    }
    
    // Insert all bookings
    const createdBookings = await Booking.insertMany(juneBookings);
    
    console.log(`✅ Created ${createdBookings.length} June booking(s):\n`);
    
    createdBookings.forEach((booking, index) => {
      console.log(`   ${index + 1}. ${booking.startDate.toISOString().split('T')[0]} to ${booking.endDate.toISOString().split('T')[0]}`);
      console.log(`      Asset: ${booking.asset}`);
      console.log(`      Duration: ${Math.ceil((booking.endDate - booking.startDate) / (1000 * 60 * 60 * 24)) + 1} days`);
      console.log(`      Special Date Type: ${booking.specialDateType || 'None'}`);
      console.log(`      Booking Type: ${booking.isVeryShortTerm ? 'Very Short Term' : booking.isShortTerm ? 'Short Term' : 'Long Term'}`);
      console.log(`      Notes: ${booking.notes}\n`);
    });
    
    // Verify the bookings
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION');
    console.log('='.repeat(80) + '\n');
    
    const verifyBookings = await Booking.find({
      user: testUser1._id,
      startDate: { 
        $gte: new Date(currentYear, 5, 1),
        $lte: new Date(currentYear, 5, 30)
      }
    }).populate('asset', 'name type');
    
    console.log(`Total June ${currentYear} bookings for Test User 1: ${verifyBookings.length}`);
    console.log(`Bookings with Special Dates: ${verifyBookings.filter(b => b.specialDateType).length}`);
    console.log(`  - Type 1: ${verifyBookings.filter(b => b.specialDateType === 'type1').length}`);
    console.log(`  - Type 2: ${verifyBookings.filter(b => b.specialDateType === 'type2').length}\n`);
    
    const bookingWithSpecialDate = verifyBookings.find(b => b.specialDateType === 'type1');
    if (bookingWithSpecialDate) {
      console.log('✅ Special date booking verified:');
      console.log(`   ${bookingWithSpecialDate.asset.name}: ${bookingWithSpecialDate.startDate.toISOString().split('T')[0]} to ${bookingWithSpecialDate.endDate.toISOString().split('T')[0]}`);
      console.log(`   Type: ${bookingWithSpecialDate.specialDateType}\n`);
    } else {
      console.log('⚠️  Warning: No Type 1 special date booking found');
      console.log('   The June 28 - July 5 booking should overlap with July 4th (July 1-7)\n');
    }
    
    console.log('🎉 Done! Run the check script to verify:');
    console.log('   node tools/check-testuser1-bookings.js\n');
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the creation
createJuneTestBookings();
