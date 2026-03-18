// Generate secure token
export const generateToken = (): string => {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Send email with retry logic
export const sendEmail = async ({
  to,
  subject,
  template,
  context,
}: EmailOptions): Promise<boolean> => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log('Email configuration:', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE,
        user: process.env.EMAIL_USER ? 'Set' : 'Not set',
        pass: process.env.EMAIL_PASSWORD ? 'Set' : 'Not set',
        from: process.env.EMAIL_FROM || 'noreply@unitaskai.thelong.online',
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
        from: `"UniTaskAI" <${process.env.EMAIL_FROM || 'noreply@unitaskai.thelong.online'}>`,
        to,
        subject,
        html,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          Importance: 'high',
        },
      };
      console.log('Sending email with options:', {
        to,
        subject,
        from: mailOptions.from,
      });

      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);

      // Close the transporter pool
      await transporter.close();
      return true;
    } catch (error) {
      retryCount++;
      console.error(
        `Failed to send email (attempt ${retryCount}/${maxRetries}):`,
        error,
      );

      if (retryCount === maxRetries) {
        console.error('Max retries reached, giving up on sending email');
        return false;
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, retryCount) * 1000),
      );
    }
  }

  return false;
};

// Send verification email
export const sendVerificationEmail = async (
  email: string,
  token: string,
): Promise<boolean> => {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/UniTaskAI_logo.png`;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    template: 'verification',
    context: {
      name: email.split('@')[0],
      verificationUrl,
      logoUrl,
      year: new Date().getFullYear(),
    },
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  token: string,
): Promise<boolean> => {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/UniTaskAI_logo.png`;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password',
    template: 'password-reset',
    context: {
      name: email.split('@')[0],
      resetUrl,
      logoUrl,
      year: new Date().getFullYear(),
    },
  });
};
