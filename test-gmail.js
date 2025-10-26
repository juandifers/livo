#!/usr/bin/env node

/**
 * Simple Gmail Credentials Test
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailCredentials() {
  console.log('🔐 Testing Gmail Credentials...\n');
  
  console.log('📋 Your Settings:');
  console.log(`Username: ${process.env.SMTP_USERNAME}`);
  console.log(`Password: ${process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'Not set'}`);
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}\n`);
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD
    }
  });
  
  try {
    console.log('🔍 Verifying credentials...');
    await transporter.verify();
    console.log('✅ Gmail credentials are valid!');
    
    console.log('\n📧 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: process.env.SMTP_USERNAME, // Send to yourself
      subject: 'Livo Email Test',
      text: 'This is a test email from Livo!',
      html: '<h1>Livo Email Test</h1><p>This is a test email from Livo!</p>'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`📧 Check your inbox: ${process.env.SMTP_USERNAME}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('1. Make sure 2-Step Verification is enabled');
      console.log('2. Check that your app password has no spaces');
      console.log('3. Verify you\'re using your full Gmail address');
      console.log('4. Try generating a new app password');
    }
  }
}

testGmailCredentials().catch(console.error);
