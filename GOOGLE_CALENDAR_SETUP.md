# Google Calendar Integration Setup

This guide will help you set up Google Calendar integration for your AI assistant.

## Overview

The Google Calendar integration allows your AI assistant to:
- 📅 **List** calendar events and check availability
- ➕ **Create** new calendar events and meetings
- ✏️ **Update** existing events (reschedule, modify details)
- 🗑️ **Delete** calendar events
- 🔍 **Find** free time slots for scheduling
- 📋 **Get** detailed information about specific events

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Setup Methods

You can authenticate using either **OAuth 2.0** (recommended for user-specific calendars) or **Service Account** (recommended for server-side automation).

---

## Method 1: OAuth 2.0 (User Authentication)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **NEW PROJECT**
3. Enter a project name (e.g., "Calendar Assistant")
4. Click **CREATE**

### Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and click **ENABLE**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (or Internal for workspace accounts)
   - App name: Your app name
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `https://www.googleapis.com/auth/calendar`
   - Test users: Add your email (for development)
4. After configuring consent screen, create OAuth client ID:
   - Application type: **Web application**
   - Name: "Calendar Integration"
   - Authorized redirect URIs: 
     - Development: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`
5. Click **CREATE**
6. Save the **Client ID** and **Client Secret**

### Step 4: Get Access and Refresh Tokens

You have two options:

#### Option A: Using OAuth Playground (Quick Start)

**IMPORTANT: First, add OAuth Playground redirect URI to your credentials:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID (the one you created earlier)
3. Under **Authorized redirect URIs**, click **ADD URI**
4. Add: `https://developers.google.com/oauthplayground`
5. Click **SAVE**

**Now, use the OAuth Playground:**

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check **Use your own OAuth credentials**
4. Enter your **Client ID** and **Client Secret**
5. In the left sidebar, find "Calendar API v3"
6. Select `https://www.googleapis.com/auth/calendar`
7. Click **Authorize APIs**
8. Sign in with your Google account and grant permissions
9. Click **Exchange authorization code for tokens**
10. Copy the **Access Token** and **Refresh Token**

#### Option B: Implement OAuth Flow (Production)

Create an API route at `app/api/auth/google/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google-calendar-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }
  
  try {
    const tokens = await getTokensFromCode(code);
    
    // Store tokens securely (in database, encrypted)
    // For testing, you can return them:
    return NextResponse.json({ 
      message: 'Authentication successful', 
      tokens 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}
```

### Step 5: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Google Calendar OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Tokens (get these from OAuth Playground or your OAuth flow)
GOOGLE_ACCESS_TOKEN=your_access_token_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

---

## Method 2: Service Account (Server-Side)

Service accounts are ideal for server-to-server interactions where you don't need user-specific access.

### Step 1: Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click **CREATE CREDENTIALS** → **Service account**
5. Enter service account details:
   - Name: "Calendar Service Account"
   - Description: "Service account for calendar automation"
6. Click **CREATE AND CONTINUE**
7. Grant roles (optional): **Editor** or **Viewer** depending on needs
8. Click **CONTINUE** → **DONE**

### Step 2: Create and Download Key

1. In the service accounts list, click on your new service account
2. Go to the **KEYS** tab
3. Click **ADD KEY** → **Create new key**
4. Choose **JSON** format
5. Click **CREATE**
6. The key file will download automatically
7. **Keep this file secure!**

### Step 3: Enable Google Calendar API

Same as Method 1, Step 2.

### Step 4: Share Calendar with Service Account

For the service account to access your calendar:

1. Open [Google Calendar](https://calendar.google.com/)
2. Find your calendar in the left sidebar
3. Click the three dots (⋮) → **Settings and sharing**
4. Scroll to **Share with specific people**
5. Click **Add people**
6. Enter the service account email (found in the JSON key file)
7. Set permission to **Make changes to events**
8. Click **Send**

### Step 5: Configure Environment Variable

Add this to your `.env.local` file:

```bash
# Google Calendar Service Account Configuration
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

**Note**: The entire JSON key file content should be on one line, properly escaped.

---

## Installation

Install the required package:

```bash
pnpm add googleapis
```

Or if using npm/yarn:

```bash
npm install googleapis
# or
yarn add googleapis
```

---

## Testing the Integration

Once configured, you can test the integration by asking your AI assistant:

- "What's on my calendar today?"
- "Schedule a meeting for tomorrow at 2 PM for 1 hour about project review"
- "When am I free this week?"
- "Reschedule my 3 PM meeting to 4 PM"
- "Cancel my dentist appointment"
- "Show me all my meetings next week"

---

## Troubleshooting

### "Error 400: redirect_uri_mismatch"

This occurs when the redirect URI in your Google Cloud Console doesn't match the one being used:

**For OAuth Playground:**
- Add `https://developers.google.com/oauthplayground` to **Authorized redirect URIs** in your OAuth client settings

**For local development:**
- Add `http://localhost:3000/api/auth/google/callback` to **Authorized redirect URIs**

**Steps to fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add the missing URI
4. Click **SAVE**
5. Wait a few minutes for changes to propagate
6. Try again

### "Credentials not configured" error

- Ensure environment variables are set correctly in `.env.local`
- Restart your development server after adding environment variables

### "Calendar not found" error

- If using a service account, make sure you've shared the calendar with the service account email
- Check that you're using the correct calendar ID (usually 'primary' for the main calendar)

### "Access token expired" error

- The access token expires after a short time
- If using OAuth, ensure you have a valid `GOOGLE_REFRESH_TOKEN` - the system will automatically refresh the access token

### "Insufficient permissions" error

- Make sure you've granted the calendar scope: `https://www.googleapis.com/auth/calendar`
- For service accounts, check calendar sharing permissions

---

## Security Best Practices

1. **Never commit credentials to version control**
   - Add `.env.local` to `.gitignore`
   - Use environment variables for all sensitive data

2. **Use refresh tokens for OAuth**
   - Store refresh tokens securely (encrypted in database)
   - Implement token refresh logic

3. **Limit service account access**
   - Only share specific calendars with the service account
   - Use the principle of least privilege

4. **Rotate credentials regularly**
   - Periodically create new service account keys
   - Revoke old access tokens

5. **For production**
   - Use environment variable management services (Vercel, AWS Secrets Manager, etc.)
   - Implement proper error logging
   - Add rate limiting to prevent API abuse

---

## API Limits

Google Calendar API has the following limits:

- **Queries per day**: 1,000,000
- **Queries per 100 seconds per user**: 5,000
- **Queries per 100 seconds**: 10,000

For most use cases, these limits are more than sufficient. If you exceed them, consider implementing caching.

---

## Next Steps

- Implement user-specific calendar storage in your database
- Add calendar event reminders and notifications
- Create calendar views in your UI
- Add support for multiple calendars
- Implement recurring events management
- Add calendar color coding

---

## Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Service Accounts Documentation](https://cloud.google.com/iam/docs/service-accounts)
- [Google API Node.js Client](https://github.com/googleapis/google-api-nodejs-client)

---

## Support

If you encounter any issues, please check:

1. Environment variables are set correctly
2. Google Calendar API is enabled
3. Credentials are valid and not expired
4. Calendar is shared with service account (if using)
5. OAuth consent screen is properly configured (if using OAuth)
