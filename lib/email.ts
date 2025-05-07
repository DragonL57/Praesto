import nodemailer from 'nodemailer';
import crypto from 'crypto';
// fs and path are no longer needed as templates are inline
// import fs from 'fs';
// import path from 'path';

// Types
type EmailTemplate = 'verification' | 'password-reset';

interface VerificationContext {
  logoUrl: string;
  name: string;
  verificationUrl: string;
  year: number;
}

interface PasswordResetContext {
  logoUrl: string;
  name: string;
  resetUrl: string;
  year: number;
}

// Union type for context based on template
type TemplateContext = VerificationContext | PasswordResetContext;

interface EmailOptions {
  to: string;
  subject: string;
  template: EmailTemplate;
  context: Record<string, any>; // Keep this general for now, or refine further if desired
}

// Create reusable transporter
const createTransporter = () => {
  const transportConfig = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  };

  return nodemailer.createTransport(transportConfig);
};

// Email templates as functions
const templates = {
  'verification': (context: VerificationContext): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${context.logoUrl}" alt="UniTaskAI Logo" style="width: 60px; height: 60px;">
        <h1 style="color: #333; font-size: 24px; margin-top: 10px;">Verify Your Email</h1>
      </div>
      <p style="color: #555; line-height: 1.5;">Hello ${context.name},</p>
      <p style="color: #555; line-height: 1.5;">Thank you for signing up for UniTaskAI. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${context.verificationUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
      </div>
      <p style="color: #555; line-height: 1.5;">If you did not sign up for UniTaskAI, please ignore this email.</p>
      <p style="color: #555; line-height: 1.5;">This link will expire in 60 minutes.</p>
      <p style="color: #555; line-height: 1.5;">Best regards,<br>The UniTaskAI Team</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
        &copy; ${context.year} UniTaskAI. All rights reserved.
      </div>
    </div>
  `,
  'password-reset': (context: PasswordResetContext): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${context.logoUrl}" alt="UniTaskAI Logo" style="width: 60px; height: 60px;">
        <h1 style="color: #333; font-size: 24px; margin-top: 10px;">Reset Your Password</h1>
      </div>
      <p style="color: #555; line-height: 1.5;">Hello ${context.name},</p>
      <p style="color: #555; line-height: 1.5;">We received a request to reset your password for your UniTaskAI account. Click the button below to reset it:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${context.resetUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="color: #555; line-height: 1.5;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p style="color: #555; line-height: 1.5;">This link will expire in 15 minutes.</p>
      <p style="color: #555; line-height: 1.5;">Best regards,<br>The UniTaskAI Team</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
        &copy; ${context.year} UniTaskAI. All rights reserved.
      </div>
    </div>
  `,
};

// Generate secure token
export const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Send email
export const sendEmail = async ({ to, subject, template, context }: EmailOptions): Promise<boolean> => {
  try {
    console.log('Email configuration:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE,
      user: process.env.EMAIL_USER ? 'Set' : 'Not set',
      pass: process.env.EMAIL_PASSWORD ? 'Set' : 'Not set',
      from: process.env.EMAIL_FROM || 'noreply@unitaskai.com'
    });

    const fullContext = {
      ...context,
      year: new Date().getFullYear(),
      logoUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/UniTaskAI_logo.png`,
    };

    let html = '';
    if (template === 'verification') {
      html = templates.verification(fullContext as VerificationContext);
    } else if (template === 'password-reset') {
      html = templates['password-reset'](fullContext as PasswordResetContext);
    }

    // Setup transporter
    const transporter = createTransporter();
    console.log('Created email transporter');

    // Send mail
    const mailOptions = {
      from: `"UniTaskAI" <${process.env.EMAIL_FROM || 'noreply@unitaskai.com'}>`,
      to,
      subject,
      html,
    };
    console.log('Sending email with options:', { to, subject, from: mailOptions.from });

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// Send verification email
export const sendVerificationEmail = async (email: string, token: string): Promise<boolean> => {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    template: 'verification',
    context: {
      name: email.split('@')[0], // Use part of email as name
      verificationUrl,
    },
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (email: string, token: string): Promise<boolean> => {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password',
    template: 'password-reset',
    context: {
      name: email.split('@')[0], // Use part of email as name
      resetUrl,
    },
  });
}; 