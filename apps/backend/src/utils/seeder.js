const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config/config');

// Connect to database
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Create initial admin user
const createAdmin = async () => {
  try {
    // Check if admin already exists and remove it
    await User.findOneAndDelete({ email: 'admin@example.com' });
    
    console.log('Deleted existing admin user (if any)');
    
    // Create admin user with direct password (will be hashed by pre-save hook)
    const admin = await User.create({
      name: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      phoneNumber: '555-123-4567',
      password: 'admin123', // Will be hashed by the pre-save hook in the User model
      role: 'admin',
      isActive: true
    });
    
    console.log('Admin user created successfully:', admin.email);
    console.log('Password: admin123');
    
    // Verify the password works
    const user = await User.findOne({ email: 'admin@example.com' }).select('+password');
    const isMatch = await user.matchPassword('admin123');
    console.log('Password verification:', isMatch ? 'Successful ✅' : 'Failed ❌');
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    mongoose.disconnect();
  }
};

// Run seeder
createAdmin(); 