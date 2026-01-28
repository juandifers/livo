const mongoose = require('mongoose');
const User = require('../src/models/User');
const Asset = require('../src/models/Asset');
const Booking = require('../src/models/Booking');
const SpecialDate = require('../src/models/SpecialDate');
const config = require('../src/config/config');

async function fixJuneSpecialDates() {
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
      return;
    }
    
    console.log('✅ Found Test User 1:', testUser1.name, testUser1.lastName);
    console.log('   Email:', testUser1.email);
    console.log('   ID:', testUser1._id, '\n');
    
    // Get all June 2026 bookings
    const june2026Bookings = await Booking.find({
      user: testUser1._id,
      startDate: { 
        $gte: new Date(2026, 5, 1),   // June 1, 2026
        $lte: new Date(2026, 5, 30)   // June 30, 2026
      }
    }).populate('asset', 'name type').sort({ startDate: 1 });
    
    console.log(`📅 Found ${june2026Bookings.length} June 2026 booking(s) for Test User 1:\n`);
    
    june2026Bookings.forEach((b, i) => {
      console.log(`${i + 1}. ${b.asset?.name || 'Unknown'}`);
      console.log(`   ${b.startDate.toISOString().split('T')[0]} to ${b.endDate.toISOString().split('T')[0]}`);
      console.log(`   Status: ${b.status}`);
      console.log(`   Special Date Type: ${b.specialDateType || 'None'}`);
      console.log(`   ID: ${b._id}\n`);
    });
    
    // Get all special dates
    const specialDates = await SpecialDate.find({}).sort({ startDate: 1 });
    
    console.log(`\n🌟 Found ${specialDates.length} special date(s) configured:\n`);
    
    specialDates.forEach((sd, i) => {
      const sdStart = new Date(sd.startDate);
      const sdEnd = new Date(sd.endDate);
      console.log(`${i + 1}. ${sd.name} (${sd.type})`);
      console.log(`   Original: ${sdStart.toISOString().split('T')[0]} to ${sdEnd.toISOString().split('T')[0]}`);
      console.log(`   Repeats Yearly: ${sd.repeatYearly ? 'Yes' : 'No'}`);
      console.log(`   Asset: ${sd.asset ? 'Asset-specific' : 'Universal'}\n`);
    });
    
    console.log('\n🔍 Checking which bookings should have special dates...\n');
    
    let updatedCount = 0;
    const updates = [];
    
    for (const booking of june2026Bookings) {
      const bookingStart = booking.startDate;
      const bookingEnd = booking.endDate;
      
      let shouldBeSpecialType = null;
      let overlappingSpecialDates = [];
      
      // Check each special date for overlap
      for (const sd of specialDates) {
        // Skip if asset-specific and doesn't match
        if (sd.asset && sd.asset.toString() !== booking.asset._id.toString()) {
          continue;
        }
        
        let sdStart = new Date(sd.startDate);
        let sdEnd = new Date(sd.endDate);
        
        // If repeating yearly, adjust to 2026
        if (sd.repeatYearly) {
          sdStart.setFullYear(2026);
          sdEnd.setFullYear(2026);
        }
        
        // Check for overlap (RULE-HOME-017: at least 1 day overlap)
        if (bookingStart <= sdEnd && bookingEnd >= sdStart) {
          overlappingSpecialDates.push({
            name: sd.name,
            type: sd.type,
            adjustedStart: sdStart.toISOString().split('T')[0],
            adjustedEnd: sdEnd.toISOString().split('T')[0]
          });
          
          // Type1 takes priority over Type2
          if (shouldBeSpecialType !== 'type1') {
            shouldBeSpecialType = sd.type;
          }
        }
      }
      
      console.log(`Booking ${booking.startDate.toISOString().split('T')[0]} to ${booking.endDate.toISOString().split('T')[0]}:`);
      
      if (overlappingSpecialDates.length > 0) {
        console.log(`  ✅ Overlaps with ${overlappingSpecialDates.length} special date(s):`);
        overlappingSpecialDates.forEach(osd => {
          console.log(`     - ${osd.name} (${osd.type}): ${osd.adjustedStart} to ${osd.adjustedEnd}`);
        });
        console.log(`  Should be: ${shouldBeSpecialType}`);
        console.log(`  Currently: ${booking.specialDateType || 'None'}`);
        
        if (booking.specialDateType !== shouldBeSpecialType) {
          console.log(`  ⚠️  NEEDS UPDATE!`);
          updates.push({
            bookingId: booking._id,
            currentValue: booking.specialDateType,
            newValue: shouldBeSpecialType
          });
        } else {
          console.log(`  ✅ Already correct`);
        }
      } else {
        console.log(`  No overlap with special dates`);
        console.log(`  Should be: null`);
        console.log(`  Currently: ${booking.specialDateType || 'None'}`);
        
        if (booking.specialDateType !== null) {
          console.log(`  ⚠️  NEEDS UPDATE (should be null)!`);
          updates.push({
            bookingId: booking._id,
            currentValue: booking.specialDateType,
            newValue: null
          });
        } else {
          console.log(`  ✅ Already correct`);
        }
      }
      console.log();
    }
    
    // Apply updates
    if (updates.length > 0) {
      console.log(`\n📝 Applying ${updates.length} update(s)...\n`);
      
      for (const update of updates) {
        await Booking.findByIdAndUpdate(update.bookingId, {
          specialDateType: update.newValue
        });
        
        console.log(`✅ Updated booking ${update.bookingId}`);
        console.log(`   Changed from: ${update.currentValue || 'None'} → ${update.newValue || 'None'}\n`);
        updatedCount++;
      }
      
      console.log(`\n✅ Updated ${updatedCount} booking(s)!\n`);
    } else {
      console.log('\n✅ All bookings already have correct special date types!\n');
    }
    
    // Verify the fix
    console.log('🔍 Verifying fix...\n');
    
    const verifyBookings = await Booking.find({
      user: testUser1._id,
      startDate: { 
        $gte: new Date(2026, 5, 1),
        $lte: new Date(2026, 5, 30)
      }
    }).populate('asset', 'name type').sort({ startDate: 1 });
    
    const type1Count = verifyBookings.filter(b => b.specialDateType === 'type1').length;
    const type2Count = verifyBookings.filter(b => b.specialDateType === 'type2').length;
    
    console.log('📊 FINAL RESULT');
    console.log('===============');
    console.log('Total June bookings:', verifyBookings.length);
    console.log('Type 1 special dates:', type1Count);
    console.log('Type 2 special dates:', type2Count);
    console.log();
    
    console.log('Bookings with special dates:');
    verifyBookings.filter(b => b.specialDateType).forEach(b => {
      console.log(`  - ${b.startDate.toISOString().split('T')[0]} to ${b.endDate.toISOString().split('T')[0]}: ${b.specialDateType}`);
    });
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixJuneSpecialDates();
