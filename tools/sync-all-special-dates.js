const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const SpecialDate = require('../src/models/SpecialDate');
const config = require('../src/config/config');

/**
 * Syncs special date types for all future bookings
 * Run this after adding/modifying special dates to update existing bookings
 */
async function syncAllSpecialDates() {
  try {
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('🔗 Connected to MongoDB\n');
    console.log('🔄 Syncing special dates for all future bookings...\n');
    
    // Get all special dates
    const specialDates = await SpecialDate.find({});
    console.log(`📅 Found ${specialDates.length} special date(s) configured\n`);
    
    // Get all future bookings (not cancelled)
    const now = new Date();
    const futureBookings = await Booking.find({
      status: { $ne: 'cancelled' },
      endDate: { $gte: now }
    }).populate('asset', '_id name type');
    
    console.log(`📋 Found ${futureBookings.length} future booking(s) to check\n`);
    
    let updatedCount = 0;
    let unchangedCount = 0;
    
    for (const booking of futureBookings) {
      const bookingStart = booking.startDate;
      const bookingEnd = booking.endDate;
      
      let shouldBeSpecialType = null;
      
      // Check each special date for overlap
      for (const sd of specialDates) {
        // Skip if asset-specific and doesn't match
        if (sd.asset && booking.asset && sd.asset.toString() !== booking.asset._id.toString()) {
          continue;
        }
        
        let sdStart = new Date(sd.startDate);
        let sdEnd = new Date(sd.endDate);
        
        // If repeating yearly, check multiple years
        if (sd.repeatYearly) {
          const bookingYear = bookingStart.getFullYear();
          // Check +/- 1 year to handle edge cases
          for (let year = bookingYear - 1; year <= bookingYear + 1; year++) {
            const adjustedStart = new Date(sdStart);
            adjustedStart.setFullYear(year);
            const adjustedEnd = new Date(sdEnd);
            adjustedEnd.setFullYear(year);
            
            // Check for overlap (at least 1 day)
            if (bookingStart <= adjustedEnd && bookingEnd >= adjustedStart) {
              // Type1 takes priority over Type2
              if (shouldBeSpecialType !== 'type1') {
                shouldBeSpecialType = sd.type;
              }
              break; // Found match for this year
            }
          }
        } else {
          // One-time special date
          if (bookingStart <= sdEnd && bookingEnd >= sdStart) {
            if (shouldBeSpecialType !== 'type1') {
              shouldBeSpecialType = sd.type;
            }
          }
        }
      }
      
      // Update if needed
      if (booking.specialDateType !== shouldBeSpecialType) {
        await Booking.findByIdAndUpdate(booking._id, {
          specialDateType: shouldBeSpecialType
        });
        
        console.log(`✅ Updated: ${booking.asset?.name || 'Unknown'} - ${bookingStart.toISOString().split('T')[0]} to ${bookingEnd.toISOString().split('T')[0]}`);
        console.log(`   Changed: ${booking.specialDateType || 'None'} → ${shouldBeSpecialType || 'None'}`);
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }
    
    console.log('\n📊 SYNC COMPLETE');
    console.log('================');
    console.log(`Total bookings checked: ${futureBookings.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Already correct: ${unchangedCount}`);
    
    if (updatedCount > 0) {
      console.log('\n✅ Bookings have been updated! Allocation summaries will now reflect special dates correctly.');
    } else {
      console.log('\n✅ All bookings already have correct special date types!');
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

syncAllSpecialDates();
