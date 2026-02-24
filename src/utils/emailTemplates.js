/**
 * Email Templates for Livo Application
 * Provides consistent, branded email templates
 */

const getAccountSetupTemplate = (setupUrl, userName) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Livo</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                color: #1E4640;
                margin-bottom: 10px;
            }
            .title {
                font-size: 24px;
                color: #1E4640;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                background-color: #1E4640;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #2a5a54;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Livo</div>
                <h1 class="title">Welcome to Livo!</h1>
            </div>
            
            <div class="content">
                <p>Hello ${userName || 'there'},</p>
                
                <p>You've been invited to join Livo, the premium asset booking platform. We're excited to have you as part of our community!</p>
                
                <p>To get started, please complete your account setup by clicking the button below:</p>
                
                <div style="text-align: center;">
                    <a href="${setupUrl}" class="button">Complete Account Setup</a>
                </div>
                
                <div class="warning">
                    <strong>Important:</strong> This link will expire in 24 hours for security reasons. If you don't complete your setup within this time, please contact your administrator for a new invitation.
                </div>
                
                <p>Once you've set up your account, you'll be able to:</p>
                <ul>
                    <li>Browse and book premium properties</li>
                    <li>Manage your bookings and preferences</li>
                    <li>Access exclusive member benefits</li>
                    <li>Connect with other Livo members</li>
                </ul>
                
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                
                <p>Welcome aboard!</p>
                <p><strong>The Livo Team</strong></p>
            </div>
            
            <div class="footer">
                <p>This email was sent to you because you were invited to join Livo.</p>
                <p>If you didn't expect this invitation, please ignore this email.</p>
                <p>&copy; 2024 Livo. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Livo!

Hello ${userName || 'there'},

You've been invited to join Livo, the premium asset booking platform. We're excited to have you as part of our community!

To get started, please complete your account setup by visiting the following link:

${setupUrl}

IMPORTANT: This link will expire in 24 hours for security reasons. If you don't complete your setup within this time, please contact your administrator for a new invitation.

Once you've set up your account, you'll be able to:
- Browse and book premium properties
- Manage your bookings and preferences  
- Access exclusive member benefits
- Connect with other Livo members

If you have any questions or need assistance, please don't hesitate to contact our support team.

Welcome aboard!
The Livo Team

---
This email was sent to you because you were invited to join Livo.
If you didn't expect this invitation, please ignore this email.
© 2024 Livo. All rights reserved.
  `;

  return { html, text };
};

const getPasswordResetTemplate = (resetUrl, userName) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Livo</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                color: #1E4640;
                margin-bottom: 10px;
            }
            .title {
                font-size: 24px;
                color: #1E4640;
                margin-bottom: 20px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                background-color: #1E4640;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 20px 0;
            }
            .button:hover {
                background-color: #2a5a54;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 14px;
                color: #666;
                text-align: center;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Livo</div>
                <h1 class="title">Password Reset Request</h1>
            </div>
            
            <div class="content">
                <p>Hello ${userName || 'there'},</p>
                
                <p>We received a request to reset your password for your Livo account.</p>
                
                <p>To reset your password, please click the button below:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <div class="warning">
                    <strong>Important:</strong> This link will expire in 10 minutes for security reasons. If you don't reset your password within this time, you'll need to request a new reset link.
                </div>
                
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                
                <p>For security reasons, we recommend using a strong, unique password that you haven't used elsewhere.</p>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
                
                <p>Best regards,<br><strong>The Livo Team</strong></p>
            </div>
            
            <div class="footer">
                <p>This email was sent because a password reset was requested for your Livo account.</p>
                <p>If you didn't request this reset, please ignore this email.</p>
                <p>&copy; 2024 Livo. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
Password Reset Request - Livo

Hello ${userName || 'there'},

We received a request to reset your password for your Livo account.

To reset your password, please visit the following link:

${resetUrl}

IMPORTANT: This link will expire in 10 minutes for security reasons. If you don't reset your password within this time, you'll need to request a new reset link.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

For security reasons, we recommend using a strong, unique password that you haven't used elsewhere.

If you have any questions or need assistance, please contact our support team.

Best regards,
The Livo Team

---
This email was sent because a password reset was requested for your Livo account.
If you didn't request this reset, please ignore this email.
© 2024 Livo. All rights reserved.
  `;

  return { html, text };
};

const getBookingConfirmationTemplate = ({ userName, assetName, bookingRanges = [], createdByAdmin = false }) => {
  const safeRanges = bookingRanges.length > 0 ? bookingRanges : ['Dates unavailable'];
  const bookingListHtml = safeRanges.map((range) => `<li>${range}</li>`).join('');
  const bookingListText = safeRanges.map((range) => `- ${range}`).join('\n');
  const adminNote = createdByAdmin
    ? '<p>This reservation was created by an administrator on your behalf.</p>'
    : '';
  const adminNoteText = createdByAdmin
    ? '\nThis reservation was created by an administrator on your behalf.\n'
    : '';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmed - Livo</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #1E4640; margin-top: 0;">Booking Confirmed</h1>
            <p>Hello ${userName || 'there'},</p>
            <p>Your booking for <strong>${assetName || 'your asset'}</strong> has been confirmed.</p>
            ${adminNote}
            <p><strong>Booking dates:</strong></p>
            <ul>${bookingListHtml}</ul>
            <p>Thank you for using Livo.</p>
        </div>
    </body>
    </html>
  `;

  const text = `
Booking Confirmed - Livo

Hello ${userName || 'there'},

Your booking for ${assetName || 'your asset'} has been confirmed.
${adminNoteText}
Booking dates:
${bookingListText}

Thank you for using Livo.
  `;

  return { html, text };
};

const getBookingCancellationTemplate = ({ userName, assetName, bookingRange, cancelledByAdmin = false }) => {
  const adminNote = cancelledByAdmin
    ? '<p>This booking was cancelled by an administrator.</p>'
    : '';
  const adminNoteText = cancelledByAdmin
    ? '\nThis booking was cancelled by an administrator.\n'
    : '';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Cancelled - Livo</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #1E4640; margin-top: 0;">Booking Cancelled</h1>
            <p>Hello ${userName || 'there'},</p>
            <p>Your booking for <strong>${assetName || 'your asset'}</strong> has been cancelled.</p>
            ${adminNote}
            <p><strong>Cancelled dates:</strong> ${bookingRange || 'Dates unavailable'}</p>
        </div>
    </body>
    </html>
  `;

  const text = `
Booking Cancelled - Livo

Hello ${userName || 'there'},

Your booking for ${assetName || 'your asset'} has been cancelled.
${adminNoteText}
Cancelled dates: ${bookingRange || 'Dates unavailable'}
  `;

  return { html, text };
};

module.exports = {
  getAccountSetupTemplate,
  getPasswordResetTemplate,
  getBookingConfirmationTemplate,
  getBookingCancellationTemplate
};
