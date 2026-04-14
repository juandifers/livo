const mongoose = require('mongoose');
const User = require('../src/models/User');
const Asset = require('../src/models/Asset');
const Booking = require('../src/models/Booking');
const SpecialDate = require('../src/models/SpecialDate');
const config = require('../src/config/config');

async function checkTestUser1Bookings() {
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
      console.log('💡 Run: npm run demo-data');
      return;
    }
    
    console.log('✅ Found Test User 1:');
    console.log(`   Name: ${testUser1.name} ${testUser1.lastName}`);
    console.log(`   Email: ${testUser1.email}`);
    console.log(`   ID: ${testUser1._id}\n`);
    
    // Get all assets owned by Test User 1
    const assets = await Asset.find({ 'owners.user': testUser1._id });
    console.log(`📦 Test User 1 owns shares in ${assets.length} asset(s):\n`);
    
    assets.forEach(asset => {
      const ownership = asset.owners.find(o => o.user.toString() === testUser1._id.toString());
      console.log(`   ${asset.name} (${asset.type})`);
      console.log(`   - Ownership: ${ownership.sharePercentage}%`);
      console.log(`   - Since: ${ownership.since.toISOString().split('T')[0]}`);
      console.log(`   - ID: ${asset._id}\n`);
    });
    
    // Get all bookings for Test User 1
    const allBookings = await Booking.find({ user: testUser1._id })
      .populate('asset', 'name type')
      .sort({ startDate: 1 });
    
    console.log(`📅 Test User 1 has ${allBookings.length} total booking(s):\n`);
    
    if (allBookings.length === 0) {
      console.log('   No bookings found\n');
    } else {
      allBookings.forEach((booking, index) => {
        const startDate = booking.startDate.toISOString().split('T')[0];
        const endDate = booking.endDate.toISOString().split('T')[0];
        const duration = Math.ceil((booking.endDate - booking.startDate) / (1000 * 60 * 60 * 24)) + 1;
        const startMonth = booking.startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        
        console.log(`   ${index + 1}. ${booking.asset?.name || 'Unknown Asset'}`);
        console.log(`      Dates: ${startDate} to ${endDate} (${duration} days)`);
        console.log(`      Month: ${startMonth}`);
        console.log(`      Status: ${booking.status}`);
        console.log(`      Booking Type: ${booking.bookingType || 'N/A'}`);
        console.log(`      Flags: isShortTerm=${booking.isShortTerm}, isVeryShortTerm=${booking.isVeryShortTerm}`);
        console.log(`      Special Date: ${booking.specialDateType || 'None'}`);
        console.log(`      Notes: ${booking.notes || 'N/A'}\n`);
      });
    }
    
    // Check for June bookings specifically
    const currentYear = new Date().getFullYear();
    const juneStart = new Date(currentYear, 5, 1); // June 1
    const juneEnd = new Date(currentYear, 5, 30); // June 30
    
    const juneBookings = allBookings.filter(b => 
      b.startDate <= juneEnd && b.endDate >= juneStart
    );
    
    console.log(`\n🗓️  June ${currentYear} Bookings: ${juneBookings.length}\n`);
    
    if (juneBookings.length > 0) {
      juneBookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.asset?.name}`);
        console.log(`      ${booking.startDate.toISOString().split('T')[0]} to ${booking.endDate.toISOString().split('T')[0]}`);
        console.log(`      Special Date: ${booking.specialDateType || 'None'}\n`);
      });
    } else {
      console.log('   No June bookings found\n');
    }
    
    // Get all special dates
    console.log('🌟 Special Dates Configuration:\n');
    
    const specialDates = await SpecialDate.find({})
      .populate('asset', 'name type')
      .sort({ startDate: 1 });
    
    const specialDatesGrouped = {
      universal: specialDates.filter(sd => !sd.asset),
      byAsset: {}
    };
    
    // Group asset-specific special dates
    specialDates.filter(sd => sd.asset).forEach(sd => {
      const assetName = sd.asset?.name || 'Unknown';
      if (!specialDatesGrouped.byAsset[assetName]) {
        specialDatesGrouped.byAsset[assetName] = [];
      }
      specialDatesGrouped.byAsset[assetName].push(sd);
    });
    
    // Display universal special dates
    if (specialDatesGrouped.universal.length > 0) {
      console.log('   Universal Special Dates:');
      specialDatesGrouped.universal.forEach(sd => {
        console.log(`   - ${sd.name} (${sd.type})`);
        console.log(`     ${sd.startDate.toISOString().split('T')[0]} to ${sd.endDate.toISOString().split('T')[0]}`);
        console.log(`     Repeats Yearly: ${sd.repeatYearly ? 'Yes' : 'No'}\n`);
      });
    }
    
    // Display asset-specific special dates
    const assetNames = Object.keys(specialDatesGrouped.byAsset);
    if (assetNames.length > 0) {
      console.log('\n   Asset-Specific Special Dates:\n');
      assetNames.forEach(assetName => {
        console.log(`   ${assetName}:`);
        specialDatesGrouped.byAsset[assetName].forEach(sd => {
          console.log(`   - ${sd.name} (${sd.type})`);
          console.log(`     ${sd.startDate.toISOString().split('T')[0]} to ${sd.endDate.toISOString().split('T')[0]}`);
          console.log(`     Repeats Yearly: ${sd.repeatYearly ? 'Yes' : 'No'}\n`);
        });
      });
    }
    
    // Check for June special dates
    console.log(`\n🔍 Checking if any special dates overlap with June ${currentYear}:\n`);
    
    const juneSpecialDates = [];
    specialDates.forEach(sd => {
      const sdStart = new Date(sd.startDate);
      const sdEnd = new Date(sd.endDate);
      
      // Check if special date overlaps with June
      if (sdStart <= juneEnd && sdEnd >= juneStart) {
        juneSpecialDates.push(sd);
      }
      
      // If repeating yearly, check for this year's instance
      if (sd.repeatYearly) {
        const thisYearStart = new Date(sdStart);
        thisYearStart.setFullYear(currentYear);
        const thisYearEnd = new Date(sdEnd);
        thisYearEnd.setFullYear(currentYear);
        
        if (thisYearStart <= juneEnd && thisYearEnd >= juneStart) {
          if (!juneSpecialDates.find(jsd => jsd._id.toString() === sd._id.toString())) {
            juneSpecialDates.push({ ...sd.toObject(), adjustedForYear: currentYear });
          }
        }
      }
    });
    
    if (juneSpecialDates.length > 0) {
      console.log(`   Found ${juneSpecialDates.length} special date(s) overlapping with June ${currentYear}:\n`);
      juneSpecialDates.forEach(sd => {
        const name = sd.name || 'Unnamed';
        const type = sd.type;
        const start = sd.adjustedForYear 
          ? new Date(sd.startDate).setFullYear(currentYear)
          : sd.startDate;
        const end = sd.adjustedForYear 
          ? new Date(sd.endDate).setFullYear(currentYear)
          : sd.endDate;
        console.log(`   - ${name} (${type})`);
        console.log(`     ${new Date(start).toISOString().split('T')[0]} to ${new Date(end).toISOString().split('T')[0]}`);
        if (sd.adjustedForYear) {
          console.log(`     (Repeating yearly special date, adjusted to ${currentYear})`);
        }
        console.log();
      });
    } else {
      console.log('   No special dates overlap with June\n');
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log(`Total Bookings: ${allBookings.length}`);
    console.log(`June ${currentYear} Bookings: ${juneBookings.length}`);
    console.log(`Bookings with Special Dates: ${allBookings.filter(b => b.specialDateType).length}`);
    console.log(`  - Type 1: ${allBookings.filter(b => b.specialDateType === 'type1').length}`);
    console.log(`  - Type 2: ${allBookings.filter(b => b.specialDateType === 'type2').length}`);
    
    console.log(`\nTotal Special Dates Configured: ${specialDates.length}`);
    console.log(`  - Universal: ${specialDatesGrouped.universal.length}`);
    console.log(`  - Asset-Specific: ${specialDates.length - specialDatesGrouped.universal.length}`);
    
    // Check allocation for Test User 1
    console.log('\n' + '='.repeat(80));
    console.log('ALLOCATION SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    for (const asset of assets) {
      const ownership = asset.owners.find(o => o.user.toString() === testUser1._id.toString());
      const eighthShares = Math.floor(ownership.sharePercentage / 12.5);
      const assetBookings = allBookings.filter(b => 
        b.asset && b.asset._id.toString() === asset._id.toString() && b.status !== 'cancelled'
      );
      
      const specialType1 = assetBookings.filter(b => b.specialDateType === 'type1').length;
      const specialType2 = assetBookings.filter(b => b.specialDateType === 'type2').length;
      
      console.log(`${asset.name}:`);
      console.log(`  Ownership: ${ownership.sharePercentage}% (${eighthShares} eighths)`);
      console.log(`  Annual Days Allowed: ${eighthShares * 44} days`);
      console.log(`  Special Date Allowance:`);
      console.log(`    Type 1: ${specialType1} used / ${eighthShares} allowed`);
      console.log(`    Type 2: ${specialType2} used / ${eighthShares} allowed`);
      console.log(`  Active Bookings: ${assetBookings.length}\n`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkTestUser1Bookings();
