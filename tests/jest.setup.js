process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/livo_booking_gate_test';
// Keep both env keys aligned because app config prefers MONGODB_URI.
process.env.MONGODB_URI = process.env.MONGO_URI;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'booking-gate-test-secret';
process.env.CORS_ALLOW_ALL_IN_DEV = 'true';
process.env.ALLOW_EMAIL_MOCK_FALLBACK = 'true';

const mongoose = require('mongoose');
const shouldSkipDb = process.env.SKIP_TEST_DB === 'true';

const clearCollections = async () => {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

beforeAll(async () => {
  if (shouldSkipDb) {
    return;
  }

  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
    return;
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10000
    });
  }
});

afterEach(async () => {
  if (shouldSkipDb) {
    return;
  }

  await clearCollections();
});

afterAll(async () => {
  if (shouldSkipDb) {
    return;
  }

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});
