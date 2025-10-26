const nodemailer = require('nodemailer');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

// Environment check for testing mode
const isTesting = process.env.NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true';

// Check if SMTP is configured
const isSmtpConfigured = config.email.host && config.email.username && config.email.password;

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {String} options.email - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.message - Email message (plain text)
 * @param {String} options.html - Email message (HTML)
 * @returns {Promise}
 */
const sendEmail = async (options) => {
  // If in testing mode or SMTP not configured, log email instead of sending
  if (isTesting || !isSmtpConfigured) {
    console.log('Mock email service active (not sending real emails)');
    console.log('SMTP Status:', isSmtpConfigured ? 'Configured' : 'Not configured');
    console.log('-------------------------------------------------');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: ${options.message}`);
    
    // Optionally save to a file for inspection
    const emailLog = {
      to: options.email,
      subject: options.subject,
      message: options.message,
      html: options.html,
      timestamp: new Date().toISOString()
    };
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Append to log file
    fs.appendFileSync(
      path.join(logsDir, 'email-logs.json'), 
      JSON.stringify(emailLog) + '\n'
    );
    
    // For testing purpose, return a fake messageId
    return { messageId: `mock-email-${Date.now()}@test.com` };
  }
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.username,
        pass: config.email.password
      }
    });

    // Define email options
    const mailOptions = {
      from: `${config.email.fromName} <${config.email.from}>`,
      to: options.email,
      subject: options.subject,
      text: options.message || '',
      html: options.html || ''
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log(`Email sent: ${info.messageId}`);
    
    return info;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    
    // We'll throw the error in production, but in development/test we'll 
    // return a mock success to allow testing to continue
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      console.log('Using mock email response due to SMTP error');
      return { messageId: `error-mock-${Date.now()}@test.com` };
    }
  }
};

module.exports = sendEmail;