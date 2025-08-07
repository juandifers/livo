const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const config = require('./src/config/config');

async function debugLogin() {
  try {
    // Connect to database
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Find the admin user
    const user = await User.findOne({ email: 'admin@example.com' }).select('+password');
    
    if (!user) {
      console.log('Admin user not found!');
      return;
    }
    
    console.log('Admin user found:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      passwordExists: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });
    
    // Test password match
    const testPassword = 'admin123';
    const isMatch = await bcrypt.compare(testPassword, user.password);
    
    console.log(`Password match for '${testPassword}': ${isMatch}`);
    
    // Generate a new password hash for comparison
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(testPassword, salt);
    
    console.log('New hash for same password:', newHash);
    console.log('Existing hash in database:', user.password);
    
    // Update the password for testing
    if (!isMatch) {
      console.log('Updating password...');
      user.password = testPassword; // This will be hashed by the pre-save hook
      await user.save();
      console.log('Password updated');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugLogin(); 