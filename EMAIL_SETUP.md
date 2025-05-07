# Email Verification and Password Reset Setup

This guide explains how to configure and use the email verification and password reset functionality in UniTaskAI.

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```
# Email Configuration
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@example.com"
EMAIL_PASSWORD="your-email-password"
EMAIL_FROM="noreply@unitaskai.com"
EMAIL_SECURE="false" # true for 465, false for other ports
NEXT_PUBLIC_APP_URL="http://localhost:3000" # Used for building email links
```

### SMTP Service Options

You can use any of the following SMTP services:

1. **Gmail SMTP**:
   ```
   EMAIL_HOST="smtp.gmail.com"
   EMAIL_PORT="587"
   EMAIL_USER="youremail@gmail.com"
   EMAIL_PASSWORD="your-app-password" # Generate an app password in Google account settings
   EMAIL_SECURE="false"
   ```

2. **SendGrid**:
   ```
   EMAIL_HOST="smtp.sendgrid.net"
   EMAIL_PORT="587"
   EMAIL_USER="apikey" # Use "apikey" as the username
   EMAIL_PASSWORD="your-sendgrid-api-key"
   EMAIL_SECURE="false"
   ```

3. **Mailgun**:
   ```
   EMAIL_HOST="smtp.mailgun.org"
   EMAIL_PORT="587"
   EMAIL_USER="postmaster@your-domain.com"
   EMAIL_PASSWORD="your-mailgun-password"
   EMAIL_SECURE="false"
   ```

4. **Testing with Mailtrap**:
   ```
   EMAIL_HOST="smtp.mailtrap.io"
   EMAIL_PORT="2525"
   EMAIL_USER="your-mailtrap-user"
   EMAIL_PASSWORD="your-mailtrap-password"
   EMAIL_SECURE="false"
   ```

## Features

### Email Verification

1. When a user registers, their email is not verified by default.
2. A verification email is sent with a secure token link.
3. The link redirects to `/verify-email?token=TOKEN&email=EMAIL`.
4. When the user clicks the link, their email is verified in the database.
5. Users can still log in before verifying, but they'll be reminded to verify their email.

### Password Reset

1. Users can request a password reset from the `/forgot-password` page.
2. A password reset email is sent with a secure token link.
3. The link redirects to `/reset-password?token=TOKEN&email=EMAIL`.
4. Users can set a new password that follows the security requirements.
5. After resetting the password, users can log in with the new password.

## Customization

### Email Templates

The email templates are defined in `lib/email.ts`. You can customize the HTML templates to match your branding.

### Security Settings

- Verification tokens expire after 60 minutes.
- Password reset tokens expire after 15 minutes.
- Passwords must be at least 6 characters long and include a lowercase letter and a number.

## Troubleshooting

If emails aren't being sent:

1. Check your SMTP credentials in the `.env.local` file.
2. Ensure your email provider allows SMTP access (some providers require enabling this).
3. If using Gmail, make sure you've created an app password.
4. Check server logs for any connection errors.
5. Try using Mailtrap for testing to eliminate email delivery issues.

If verification or reset links don't work:

1. Make sure `NEXT_PUBLIC_APP_URL` is set correctly.
2. Check if tokens are properly stored in the database.
3. Ensure the token hasn't expired. 