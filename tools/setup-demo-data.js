const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Asset = require('../src/models/Asset');
const Booking = require('../src/models/Booking');
const SpecialDate = require('../src/models/SpecialDate');
const config = require('../src/config/config');

let adminUser, testUser1, testUser2, testUser3;
let boatAsset, homeAsset, cabinAsset;

async function setupDemoData() {
  try {
    // Connect to database
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('🔗 Connected to MongoDB');
    console.log('🎯 Setting up organized demo data for code review...\n');

    // Step 1: Get admin user
    adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      throw new Error('Admin user not found. Run npm run seed first.');
    }
    console.log('✅ Admin user found');

    // Step 2: Create test users with realistic data
    await createTestUsers();
    
    // Step 3: Create diverse assets
    await createAssets();
    
    // Step 4: Add users to assets with different ownership percentages
    await addUsersToAssets();
    
    // Step 5: Create special dates for different scenarios
    await createSpecialDates();
    
    // Step 6: Create sample bookings to demonstrate rules
    await createSampleBookings();
    
    // Step 7: Display summary
    await displaySummary();
    
    console.log('\n🎉 Demo data setup complete!');
    console.log('📱 Ready for mobile app testing and code review presentation');
    
  } catch (err) {
    console.error('❌ Error setting up demo data:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function createTestUsers() {
  console.log('\n👥 Creating test users...');
  
  // Create realistic test users
  const users = [
    {
      name: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@example.com',
      phoneNumber: '+1-555-0101',
      role: 'user',
      isActive: true,
      profileSetup: true
    },
    {
      name: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@example.com',
      phoneNumber: '+1-555-0102',
      role: 'user',
      isActive: true,
      profileSetup: true
    },
    {
      name: 'Emma',
      lastName: 'Rodriguez',
      email: 'emma.rodriguez@example.com',
      phoneNumber: '+1-555-0103',
      role: 'user',
      isActive: true,
      profileSetup: true
    }
  ];

  for (let i = 0; i < users.length; i++) {
    // Set a default password for demo purposes
    users[i].password = 'demo123';
    const user = await User.create(users[i]);
    
    if (i === 0) testUser1 = user;
    if (i === 1) testUser2 = user;
    if (i === 2) testUser3 = user;
    
    console.log(`   ✅ Created: ${user.name} ${user.lastName} (${user.email})`);
  }
}

async function createAssets() {
  console.log('\n🏠 Creating diverse assets...');
  
  // Create a luxury yacht
  boatAsset = await Asset.create({
    name: 'Serenity Dreams',
    type: 'boat',
    description: 'Luxurious 52ft yacht perfect for weekend getaways and entertaining. Features modern amenities and sleeping for 8 guests.',
    location: 'Marina del Rey, California',
    capacity: 8,
    amenities: ['WiFi', 'Full Kitchen', 'Master Suite', 'Fishing Equipment', 'Sound System', 'Jet Ski Storage'],
    totalShares: 4,
    pricePerShare: 75000
  });
  console.log(`   ⛵ Created boat: ${boatAsset.name} (ID: ${boatAsset._id})`);

  // Create a mountain home
  homeAsset = await Asset.create({
    name: 'Alpine Vista Retreat',
    type: 'home',
    description: 'Stunning 4-bedroom mountain home with panoramic views. Perfect for family vacations and winter sports.',
    location: 'Lake Tahoe, California',
    capacity: 10,
    amenities: ['WiFi', 'Full Kitchen', 'Fireplace', 'Hot Tub', 'Game Room', 'Ski Storage'],
    totalShares: 8,
    pricePerShare: 50000
  });
  console.log(`   🏔️ Created home: ${homeAsset.name} (ID: ${homeAsset._id})`);

  // Create a beach cabin
  cabinAsset = await Asset.create({
    name: 'Coastal Haven Cabin',
    type: 'home',
    description: 'Charming 3-bedroom beachfront cabin with direct beach access. Ideal for relaxation and water activities.',
    location: 'Malibu, California',
    capacity: 6,
    amenities: ['WiFi', 'Full Kitchen', 'Beach Access', 'Fire Pit', 'Outdoor Shower', 'Surfboard Storage'],
    totalShares: 6,
    pricePerShare: 60000
  });
  console.log(`   🏖️ Created cabin: ${cabinAsset.name} (ID: ${cabinAsset._id})`);
}

async function addUsersToAssets() {
  console.log('\n🤝 Adding users to assets with ownership...');
  
  // Boat ownership - 4 shares total
  await Asset.findByIdAndUpdate(boatAsset._id, {
    $push: {
      owners: [
        { user: testUser1._id, sharePercentage: 50, since: new Date() }, // 2 shares
        { user: testUser2._id, sharePercentage: 25, since: new Date() }, // 1 share
        { user: testUser3._id, sharePercentage: 25, since: new Date() }  // 1 share
      ]
    }
  });
  console.log(`   ⛵ ${boatAsset.name}: Sarah (50%), Michael (25%), Emma (25%)`);

  // Mountain home ownership - 8 shares total
  await Asset.findByIdAndUpdate(homeAsset._id, {
    $push: {
      owners: [
        { user: testUser1._id, sharePercentage: 25, since: new Date() }, // 2 shares
        { user: testUser2._id, sharePercentage: 37.5, since: new Date() }, // 3 shares
        { user: testUser3._id, sharePercentage: 37.5, since: new Date() }  // 3 shares
      ]
    }
  });
  console.log(`   🏔️ ${homeAsset.name}: Sarah (25%), Michael (37.5%), Emma (37.5%)`);

  // Beach cabin ownership - 6 shares total
  await Asset.findByIdAndUpdate(cabinAsset._id, {
    $push: {
      owners: [
        { user: testUser2._id, sharePercentage: 50, since: new Date() }, // 3 shares
        { user: testUser3._id, sharePercentage: 50, since: new Date() }  // 3 shares
      ]
    }
  });
  console.log(`   🏖️ ${cabinAsset.name}: Michael (50%), Emma (50%)`);
}

async function createSpecialDates() {
  console.log('\n📅 Creating special dates for booking restrictions...');
  
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  // Type1 dates (Premium holidays) for boat
  const boatType1Dates = [
    {
      asset: boatAsset._id,
      type: 'type1',
      name: 'Memorial Day Weekend',
      startDate: new Date(`${currentYear}-05-25`),
      endDate: new Date(`${currentYear}-05-28`),
      year: currentYear
    },
    {
      asset: boatAsset._id,
      type: 'type1',
      name: 'Fourth of July Week',
      startDate: new Date(`${currentYear}-07-01`),
      endDate: new Date(`${currentYear}-07-07`),
      year: currentYear
    },
    {
      asset: boatAsset._id,
      type: 'type1',
      name: 'Labor Day Weekend',
      startDate: new Date(`${currentYear}-09-01`),
      endDate: new Date(`${currentYear}-09-04`),
      year: currentYear
    }
  ];

  // Type2 dates (Peak season) for mountain home
  const homeType2Dates = [
    {
      asset: homeAsset._id,
      type: 'type2',
      name: 'Christmas Holiday',
      startDate: new Date(`${currentYear}-12-23`),
      endDate: new Date(`${currentYear}-12-30`),
      year: currentYear
    },
    {
      asset: homeAsset._id,
      type: 'type2',
      name: 'New Year Week',
      startDate: new Date(`${nextYear}-01-01`),
      endDate: new Date(`${nextYear}-01-07`),
      year: nextYear
    },
    {
      asset: homeAsset._id,
      type: 'type2',
      name: 'Presidents Day Weekend',
      startDate: new Date(`${nextYear}-02-17`),
      endDate: new Date(`${nextYear}-02-20`),
      year: nextYear
    }
  ];

  // Mixed type dates for beach cabin
  const cabinMixedDates = [
    {
      asset: cabinAsset._id,
      type: 'type1',
      name: 'Summer Peak',
      startDate: new Date(`${currentYear}-07-15`),
      endDate: new Date(`${currentYear}-08-15`),
      year: currentYear
    },
    {
      asset: cabinAsset._id,
      type: 'type2',
      name: 'Thanksgiving Week',
      startDate: new Date(`${currentYear}-11-21`),
      endDate: new Date(`${currentYear}-11-28`),
      year: currentYear
    }
  ];

  const allSpecialDates = [...boatType1Dates, ...homeType2Dates, ...cabinMixedDates];
  
  for (const specialDate of allSpecialDates) {
    await SpecialDate.create(specialDate);
    console.log(`   📅 ${specialDate.name} (${specialDate.type})`);
  }
}

async function createSampleBookings() {
  console.log('\n📋 Creating sample bookings to demonstrate rules...');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  // Sample booking 1: Sarah books the boat (valid booking)
  const booking1 = await Booking.create({
    user: testUser1._id,
    asset: boatAsset._id,
    startDate: new Date(currentYear, currentMonth + 1, 10),
    endDate: new Date(currentYear, currentMonth + 1, 17),
    status: 'confirmed',
    notes: 'Family summer vacation',
    createdAt: new Date()
  });
  console.log(`   ✅ Sarah booked ${boatAsset.name}: 7 days`);

  // Sample booking 2: Michael books the mountain home (valid booking)
  const booking2 = await Booking.create({
    user: testUser2._id,
    asset: homeAsset._id,
    startDate: new Date(currentYear, currentMonth + 2, 5),
    endDate: new Date(currentYear, currentMonth + 2, 12),
    status: 'confirmed',
    notes: 'Weekend ski trip with friends',
    createdAt: new Date()
  });
  console.log(`   ✅ Michael booked ${homeAsset.name}: 7 days`);

  // Sample booking 3: Emma books the beach cabin (valid booking)
  const booking3 = await Booking.create({
    user: testUser3._id,
    asset: cabinAsset._id,
    startDate: new Date(currentYear, currentMonth + 1, 1),
    endDate: new Date(currentYear, currentMonth + 1, 4),
    status: 'confirmed',
    notes: 'Romantic weekend getaway',
    createdAt: new Date()
  });
  console.log(`   ✅ Emma booked ${cabinAsset.name}: 3 days`);
}

async function displaySummary() {
  console.log('\n📊 DEMO DATA SUMMARY');
  console.log('===================');
  
  const userCount = await User.countDocuments({ role: 'user' });
  const assetCount = await Asset.countDocuments();
  const bookingCount = await Booking.countDocuments();
  const specialDateCount = await SpecialDate.countDocuments();
  
  console.log(`👥 Users: ${userCount + 1} (1 admin + ${userCount} test users)`);
  console.log(`🏠 Assets: ${assetCount} (1 boat, 2 homes)`);
  console.log(`📋 Bookings: ${bookingCount} sample bookings`);
  console.log(`📅 Special Dates: ${specialDateCount} restriction periods`);
  
  console.log('\n🔑 Login Credentials for Testing:');
  console.log('================================');
  console.log('Admin: admin@example.com / admin123');
  console.log('Sarah: sarah.johnson@example.com / demo123');
  console.log('Michael: michael.chen@example.com / demo123');
  console.log('Emma: emma.rodriguez@example.com / demo123');
  
  console.log('\n🎯 Asset IDs for API Testing:');
  console.log('============================');
  console.log(`Boat (Serenity Dreams): ${boatAsset._id}`);
  console.log(`Home (Alpine Vista): ${homeAsset._id}`);
  console.log(`Cabin (Coastal Haven): ${cabinAsset._id}`);
}

// Run the setup
setupDemoData(); 