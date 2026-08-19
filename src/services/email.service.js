const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

let transporter;

const hasSmtpConfig =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASSWORD;

if (hasSmtpConfig) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  transporter.verify((error) => {
    if (error) {
      logger.error({ message: "Email server connection error", error: error.message });
    } else {
      logger.info("Email server ready");
    }
  });
} else {
  logger.warn("SMTP credentials missing — email service running in stub mode");
}

const FROM_ADDRESS =
  process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@bank-backend.local";

const sendEmail = async (to, subject, text, html) => {
  try {
    if (!transporter) {
      logger.debug({ message: "Email stub", to, subject });
      return;
    }
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${FROM_ADDRESS}>`,
      to,
      subject,
      text,
      html,
    });
    logger.info({ message: "Email sent", messageId: info.messageId, to });
  } catch (error) {
    logger.error({ message: "Failed to send email", error: error.message, to });
  }
};

async function sendRegistrationEmail(userEmail, name) {
  const subject = "Welcome to Backend Ledger!";
  const text = `Hello ${name},\n\nThank you for registering at Backend Ledger. We're excited to have you on board!\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hello ${name},</p><p>Thank you for registering at Backend Ledger. We're excited to have you on board!</p><p>Best regards,<br>The Backend Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Successful!";
  const text = `Hello ${name},\n\nYour transaction of ₹${amount} to account ${toAccount} was successful.\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hello ${name},</p><p>Your transaction of ₹${amount} to account ${toAccount} was successful.</p><p>Best regards,<br>The Backend Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
  const subject = "Transaction Failed";
  const text = `Hello ${name},\n\nWe regret to inform you that your transaction of ₹${amount} to account ${toAccount} has failed. Please try again later.\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hello ${name},</p><p>We regret to inform you that your transaction of ₹${amount} to account ${toAccount} has failed. Please try again later.</p><p>Best regards,<br>The Backend Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail,
};