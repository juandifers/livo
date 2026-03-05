const nodemailer = require('nodemailer');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

const shouldMockByFlag = process.env.NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true';
const isSmtpConfigured = Boolean(config.email.host && config.email.username && config.email.password);
const shouldAllowMockFallback = config.email.allowMockFallback === true;

const writeEmailToLogFile = (options, metadata = {}) => {
  const emailLog = {
    to: options.email,
    subject: options.subject,
    message: options.message,
    html: options.html,
    metadata,
    timestamp: new Date().toISOString()
  };

  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  fs.appendFileSync(
    path.join(logsDir, 'email-logs.json'),
    JSON.stringify(emailLog) + '\n'
  );
};

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
  if (shouldMockByFlag) {
    console.log('[Email] Mock mode enabled by NODE_ENV=test or MOCK_EMAIL=true.');
    writeEmailToLogFile(options, { reason: 'explicit_mock_mode' });
    return { messageId: `mock-email-${Date.now()}@test.com` };
  }

  if (!isSmtpConfigured) {
    const errorMessage = 'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD.';

    if (config.email.strictTransport) {
      const err = new Error(errorMessage);
      err.code = 'SMTP_NOT_CONFIGURED';
      throw err;
    }

    console.log('[Email] SMTP not configured. Falling back to logged mock email.');
    writeEmailToLogFile(options, { reason: 'smtp_not_configured' });
    return { messageId: `mock-email-${Date.now()}@test.com` };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: Number(config.email.port) === 465,
      auth: {
        user: config.email.username,
        pass: config.email.password
      }
    });

    const mailOptions = {
      from: `${config.email.fromName} <${config.email.from}>`,
      to: options.email,
      subject: options.subject,
      text: options.message || '',
      html: options.html || ''
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error.message);

    if (shouldAllowMockFallback) {
      console.log('[Email] Using mock fallback because ALLOW_EMAIL_MOCK_FALLBACK=true.');
      writeEmailToLogFile(options, {
        reason: 'smtp_send_failed_fallback',
        error: error.message
      });
      return { messageId: `error-mock-${Date.now()}@test.com` };
    }

    throw error;
  }
};

module.exports = sendEmail;
