#!/usr/bin/env node

/**
 * Email Test Script
 * Tests the email functionality with real SMTP settings
 */

require('dotenv').config();
const sendEmail = require('./src/utils/sendEmail');
const { getAccountSetupTemplate } = require('./src/utils/emailTemplates');

async function testEmail() {
  console.log('🧪 Testing Email Functionality...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`MOCK_EMAIL: ${process.env.MOCK_EMAIL}`);
  console.log(`SMTP_HOST: ${process.env.SMTP_HOST ? '✅ Set' : '❌ Not set'}`);
  console.log(`SMTP_PORT: ${process.env.SMTP_PORT ? '✅ Set' : '❌ Not set'}`);
  console.log(`SMTP_USERNAME: ${process.env.SMTP_USERNAME ? '✅ Set' : '❌ Not set'}`);
  console.log(`SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '✅ Set' : '❌ Not set'}`);
  console.log(`FROM_EMAIL: ${process.env.FROM_EMAIL || '❌ Not set'}`);
  console.log(`BASE_URL: ${process.env.BASE_URL || '❌ Not set'}\n`);
  
  // Test email template
  console.log('📧 Testing Email Template...');
  const testUrl = 'https://yourdomain.com/account-setup.html?token=test123';
  const template = getAccountSetupTemplate(testUrl, 'John Doe');
  console.log('✅ Email template generated successfully\n');
  
  // Test email sending
  console.log('📤 Testing Email Sending...');
  
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  
  try {
    const result = await sendEmail({
      email: testEmail,
      subject: 'Livo Email Test - Account Setup',
      message: template.text,
      html: template.html
    });
    
    console.log('✅ Email sent successfully!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📬 Sent to: ${testEmail}`);
    
  } catch (error) {
    console.error('❌ Email sending failed:');
    console.error(error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('1. Check your SMTP_HOST and SMTP_PORT settings');
      console.log('2. Verify your SMTP credentials');
      console.log('3. Ensure your email provider allows SMTP access');
      console.log('4. Check if your firewall is blocking the connection');
    }
  }
}

// Run the test
testEmail().catch(console.error);
