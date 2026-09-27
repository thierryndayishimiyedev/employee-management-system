const nodemailer = require('nodemailer');

const configured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM);
let transporter;
const mailer = () => {
  if (!configured()) return null;
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transport = mailer();
  if (!transport) throw new Error('Email is not configured. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM on the server.');
  return transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text, html });
};
module.exports = { configured, sendEmail };
