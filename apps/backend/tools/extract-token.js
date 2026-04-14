/**
 * Helper script to extract setup tokens for Postman tests
 * 
 * Usage: 
 *   node tools/extract-token.js
 * 
 * This will connect to the local MongoDB and extract the setup token
 * for the test user created in the Postman tests.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Get MongoDB URI from environment or use default
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/assetBookingSystem';
const email = process.argv[2] || 'testuser@example.com';

async function extractToken() {
  console.log(`Connecting to MongoDB at ${uri.split('@').pop()}...`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB ✅');
    
    const db = client.db();
    const users = db.collection('users');
    
    // Find the test user
    const user = await users.findOne({ email });
    
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      console.log('Make sure you have run the "Create New User" request in Postman first.');
      return;
    }
    
    console.log(`\nUser found: ${user.name} ${user.lastName} (${user.email})`);
    
    if (user.accountSetupToken) {
      console.log('\nAccount Setup Token:');
      console.log('--------------------');
      console.log(user.accountSetupToken);
      console.log('\nCopy this token and use it as the setupToken environment variable in Postman.');
      console.log('The token is already in hashed form, but Postman expects the unhashed version.');
      console.log('You will need to modify the tests to use the hashed token directly or');
      console.log('check the API logs for the unhashed token when creating the user.');
    } else {
      console.log('\n❌ No account setup token found for this user.');
      console.log('The user might have already completed account setup.');
    }
    
    if (user.resetPasswordToken) {
      console.log('\nPassword Reset Token:');
      console.log('--------------------');
      console.log(user.resetPasswordToken);
      console.log('\nCopy this token and use it as the resetToken environment variable in Postman.');
    }
    
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    await client.close();
  }
}

extractToken().catch(console.error); 