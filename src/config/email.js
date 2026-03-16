const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
      to, subject, html, text
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email sending failed: ${error.message}`);
    throw error;
  }
};

// Email Templates
const emailTemplates = {
  kycSubmitted: (name) => ({
    subject: 'KYC Documents Submitted - Rabanq',
    html: `<h2>Hello ${name},</h2><p>Your KYC documents have been submitted successfully. Our team will review them within 2-3 business days.</p><br/><p>Best regards,<br/>Rabanq Team</p>`
  }),
  kycApproved: (name) => ({
    subject: 'KYC Approved - Rabanq',
    html: `<h2>Congratulations ${name}!</h2><p>Your KYC has been approved. You can now access all features of Rabanq.</p><br/><p>Best regards,<br/>Rabanq Team</p>`
  }),
  kycRejected: (name, reason) => ({
    subject: 'KYC Rejected - Rabanq',
    html: `<h2>Hello ${name},</h2><p>Unfortunately, your KYC has been rejected.</p><p><strong>Reason:</strong> ${reason}</p><p>Please resubmit with correct documents.</p><br/><p>Best regards,<br/>Rabanq Team</p>`
  }),
  transactionAlert: (name, amount, type, reference) => ({
    subject: `Transaction ${type} - Rabanq`,
    html: `<h2>Hello ${name},</h2><p>A ${type} transaction of <strong>$${amount}</strong> has been processed.</p><p><strong>Reference:</strong> ${reference}</p><br/><p>Best regards,<br/>Rabanq Team</p>`
  }),
  passwordReset: (name, resetUrl) => ({
    subject: 'Password Reset - Rabanq',
    html: `<h2>Hello ${name},</h2><p>Click the link below to reset your password (valid for 10 minutes):</p><a href="${resetUrl}">${resetUrl}</a><br/><p>Best regards,<br/>Rabanq Team</p>`
  })
};

module.exports = { sendEmail, emailTemplates };
