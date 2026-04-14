const mongoose = require('mongoose');
const User = require('../src/models/User');
const Asset = require('../src/models/Asset');
const Booking = require('../src/models/Booking');
const SpecialDate = require('../src/models/SpecialDate');
const DateUtils = require('../src/utils/dateUtils');
const config = require('../src/config/config');

async function diagnoseJuneBooking() {
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
    console.log('   ID:', testUser1._id, '\n');
    
    // Find June 26-29 booking
    const currentYear = new Date().getFullYear();
    const june26 = new Date(currentYear, 5, 26); // June 26
    const june29 = new Date(currentYear, 5, 29); // June 29
    
    console.log(`🔍 Looking for booking around June 26-29, ${currentYear}...\n`);
    
    // Find bookings that overlap with June 26-29
    const juneBooking = await Booking.findOne({
      user: testUser1._id,
      startDate: { $lte: june29 },
      endDate: { $gte: june26 }
    }).populate('asset', 'name type owners');
    
    if (!juneBooking) {
      console.log('❌ No booking found overlapping June 26-29');
      console.log('   Searching for all June bookings instead...\n');
      
      const allJuneBookings = await Booking.find({
        user: testUser1._id,
        startDate: { 
          $gte: new Date(currentYear, 5, 1),
          $lte: new Date(currentYear, 5, 30)
        }
      }).populate('asset', 'name type');
      
      console.log(`Found ${allJuneBookings.length} June booking(s):\n`);
      allJuneBookings.forEach((b, i) => {
        console.log(`${i + 1}. ${b.asset?.name || 'Unknown'}`);
        console.log(`   ${b.startDate.toISOString().split('T')[0]} to ${b.endDate.toISOString().split('T')[0]}`);
        console.log(`   Status: ${b.status}`);
        console.log(`   Special Date Type: ${b.specialDateType || 'None'}`);
        console.log(`   Booking Type: ${b.bookingType || 'N/A'}\n`);
      });
      
      return;
    }
    
    console.log('✅ Found booking:\n');
    console.log('📅 BOOKING DETAILS');
    console.log('==================');
    console.log('ID:', juneBooking._id);
    console.log('Asset:', juneBooking.asset?.name || 'Unknown');
    console.log('Asset Type:', juneBooking.asset?.type || 'Unknown');
    console.log('Start Date:', juneBooking.startDate.toISOString().split('T')[0]);
    console.log('End Date:', juneBooking.endDate.toISOString().split('T')[0]);
    console.log('Status:', juneBooking.status);
    console.log('Special Date Type:', juneBooking.specialDateType || 'None');
    console.log('Booking Type:', juneBooking.bookingType || 'N/A');
    console.log('Year:', juneBooking.year || 'N/A');
    console.log('Created:', juneBooking.createdAt.toISOString().split('T')[0]);
    
    const duration = Math.ceil((juneBooking.endDate - juneBooking.startDate) / (1000 * 60 * 60 * 24)) + 1;
    console.log('Duration:', duration, 'days\n');
    
    // Check what special dates exist for this asset
    console.log('🌟 SPECIAL DATES FOR THIS ASSET');
    console.log('================================\n');
    
    const specialDates = await SpecialDate.find({
      $or: [
        { asset: null },
        { asset: juneBooking.asset._id }
      ]
    }).sort({ startDate: 1 });
    
    console.log(`Found ${specialDates.length} special date(s):\n`);
    
    specialDates.forEach((sd, i) => {
      console.log(`${i + 1}. ${sd.name} (${sd.type})`);
      console.log(`   ${sd.startDate.toISOString().split('T')[0]} to ${sd.endDate.toISOString().split('T')[0]}`);
      console.log(`   Asset: ${sd.asset ? 'Asset-specific' : 'Universal'}`);
      console.log(`   Repeats Yearly: ${sd.repeatYearly ? 'Yes' : 'No'}`);
      
      // Check if this special date overlaps with the June booking
      const bookingStart = juneBooking.startDate;
      const bookingEnd = juneBooking.endDate;
      const sdStart = new Date(sd.startDate);
      const sdEnd = new Date(sd.endDate);
      
      // Check overlap
      const overlaps = bookingStart <= sdEnd && bookingEnd >= sdStart;
      
      if (overlaps) {
        console.log(`   ✅ OVERLAPS with booking!`);
      }
      
      // If repeating, check for overlap with current year's instance
      if (sd.repeatYearly) {
        const thisYearStart = new Date(sdStart);
        thisYearStart.setFullYear(currentYear);
        const thisYearEnd = new Date(sdEnd);
        thisYearEnd.setFullYear(currentYear);
        
        const overlapsThisYear = bookingStart <= thisYearEnd && bookingEnd >= thisYearStart;
        if (overlapsThisYear) {
          console.log(`   ✅ OVERLAPS with ${currentYear} instance!`);
          console.log(`      (${thisYearStart.toISOString().split('T')[0]} to ${thisYearEnd.toISOString().split('T')[0]})`);
        }
      }
      
      console.log();
    });
    
    // Get user's ownership for this asset
    const ownership = juneBooking.asset.owners.find(o => 
      o.user.toString() === testUser1._id.toString()
    );
    
    if (!ownership) {
      console.log('❌ User ownership not found for this asset\n');
      return;
    }
    
    console.log('👤 USER OWNERSHIP');
    console.log('=================');
    console.log('Share Percentage:', ownership.sharePercentage + '%');
    console.log('Since:', ownership.since.toISOString().split('T')[0]);
    
    const eighthShares = Math.floor(ownership.sharePercentage / 12.5);
    console.log('Eighth Shares:', eighthShares);
    console.log('Type 1 Allowance:', eighthShares, 'special dates');
    console.log('Type 2 Allowance:', eighthShares, 'special dates\n');
    
    // Get allocation windows
    const now = new Date();
    const today = DateUtils.parseApiDate(DateUtils.normalize(now));
    
    const history = Array.isArray(ownership.anniversaryHistory) ? ownership.anniversaryHistory : [];
    const effectiveEntry = history
      .filter((h) => h && h.effectiveFrom && h.anniversaryDate && new Date(h.effectiveFrom).getTime() <= today.getTime())
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];
    
    const anchorDate = effectiveEntry?.anniversaryDate || ownership.since;
    const rolling = DateUtils.getRollingAnniversaryWindows(anchorDate, today);
    
    console.log('📊 ALLOCATION WINDOWS');
    console.log('=====================');
    console.log('Anchor Date:', anchorDate.toISOString().split('T')[0]);
    console.log('Current Window:', DateUtils.formatForApi(rolling.currentWindow.start), 'to', DateUtils.formatForApi(rolling.currentWindow.end));
    console.log('Next Window:', DateUtils.formatForApi(rolling.nextWindow.start), 'to', DateUtils.formatForApi(rolling.nextWindow.end));
    
    // Check which window the June booking falls into
    const bookingInCurrent = juneBooking.startDate >= rolling.currentWindow.start && 
                             juneBooking.endDate < rolling.currentWindow.end;
    const bookingInNext = juneBooking.startDate >= rolling.nextWindow.start && 
                          juneBooking.endDate < rolling.nextWindow.end;
    
    console.log('\n🎯 BOOKING WINDOW PLACEMENT');
    console.log('===========================');
    console.log('Booking falls in Current Window:', bookingInCurrent ? '✅ YES' : '❌ NO');
    console.log('Booking falls in Next Window:', bookingInNext ? '✅ YES' : '❌ NO');
    
    if (!bookingInCurrent && !bookingInNext) {
      console.log('\n⚠️  WARNING: Booking is outside both windows!');
      console.log('This could be why it\'s not being counted.\n');
    }
    
    // Get all bookings in each window to count special dates
    console.log('\n📈 SPECIAL DATE USAGE');
    console.log('=====================\n');
    
    const currentWindowBookings = await Booking.find({
      user: testUser1._id,
      asset: juneBooking.asset._id,
      status: { $ne: 'cancelled' },
      startDate: { $gte: rolling.currentWindow.start },
      endDate: { $lt: rolling.currentWindow.end }
    });
    
    const nextWindowBookings = await Booking.find({
      user: testUser1._id,
      asset: juneBooking.asset._id,
      status: { $ne: 'cancelled' },
      startDate: { $gte: rolling.nextWindow.start },
      endDate: { $lt: rolling.nextWindow.end }
    });
    
    const countSpecialDates = (bookings) => {
      const type1 = bookings.filter(b => b.specialDateType === 'type1').length;
      const type2 = bookings.filter(b => b.specialDateType === 'type2').length;
      return { type1, type2 };
    };
    
    const currentUsage = countSpecialDates(currentWindowBookings);
    const nextUsage = countSpecialDates(nextWindowBookings);
    
    console.log('Current Window:');
    console.log('  Total bookings:', currentWindowBookings.length);
    console.log('  Type 1 special dates:', currentUsage.type1);
    console.log('  Type 2 special dates:', currentUsage.type2);
    
    console.log('\nNext Window:');
    console.log('  Total bookings:', nextWindowBookings.length);
    console.log('  Type 1 special dates:', nextUsage.type1);
    console.log('  Type 2 special dates:', nextUsage.type2);
    
    console.log('\nMaximum (what allocation endpoint returns):');
    console.log('  Type 1:', Math.max(currentUsage.type1, nextUsage.type1));
    console.log('  Type 2:', Math.max(currentUsage.type2, nextUsage.type2));
    
    // Check if this specific booking is in the lists
    const inCurrent = currentWindowBookings.some(b => b._id.toString() === juneBooking._id.toString());
    const inNext = nextWindowBookings.some(b => b._id.toString() === juneBooking._id.toString());
    
    console.log('\n🔍 DIAGNOSIS');
    console.log('============');
    console.log('June 26-29 booking in current window query:', inCurrent ? '✅ YES' : '❌ NO');
    console.log('June 26-29 booking in next window query:', inNext ? '✅ YES' : '❌ NO');
    
    if (!inCurrent && !inNext) {
      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   The June booking is not being included in either window query!');
      console.log('\n   Possible reasons:');
      console.log('   1. Status is cancelled');
      console.log('   2. Booking dates don\'t match the window criteria exactly');
      console.log('   3. endDate is >= window.end (should be <)');
      console.log('\n   Booking status:', juneBooking.status);
      console.log('   Booking startDate:', juneBooking.startDate.toISOString());
      console.log('   Booking endDate:', juneBooking.endDate.toISOString());
      console.log('   Current window end:', rolling.currentWindow.end.toISOString());
      console.log('   Next window end:', rolling.nextWindow.end.toISOString());
    } else {
      console.log('\n✅ Booking is being included in window queries');
      if (juneBooking.specialDateType === 'type1') {
        console.log('✅ Booking has specialDateType set to type1');
        console.log('✅ Should be counted in allocation');
      } else {
        console.log('❌ Booking does NOT have specialDateType set to type1');
        console.log('   Current value:', juneBooking.specialDateType || 'null');
        console.log('\n   This is why it\'s not being counted!');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the diagnosis
diagnoseJuneBooking();
