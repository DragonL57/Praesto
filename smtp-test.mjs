import 'dotenv/config';
import { createTransport } from 'nodemailer';

// Read config from environment variables
const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASSWORD,
  EMAIL_FROM,
  EMAIL_SECURE,
  EMAIL_TO // Add this to your .env for test recipient
} = process.env;

console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD);
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('EMAIL_TO:', process.env.EMAIL_TO);
console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE);

if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASSWORD || !EMAIL_FROM || !EMAIL_TO) {
  console.error('Missing one or more required environment variables: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM, EMAIL_TO');
  process.exit(1);
}

const transporter = createTransport({
  host: EMAIL_HOST,
  port: Number.parseInt(EMAIL_PORT, 10),
  secure: EMAIL_SECURE === 'true',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
  tls: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false // For testing only; remove for production
  },
  logger: true,
  debug: true
});

async function main() {
  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP server is ready to take messages.');

    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject: 'SMTP Test Email',
      text: 'This is a test email sent from smtp-test.mjs using Nodemailer.',
      html: '<b>This is a test email sent from <code>smtp-test.mjs</code> using Nodemailer.</b>'
    });
    console.log('Test email sent! Message ID:', info.messageId);
  } catch (err) {
    console.error('Error during SMTP test:', err);
  } finally {
    transporter.close();
  }
}

main(); 