import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';

/**
 * Google Calendar API Client
 * 
 * This module provides authentication and access to the Google Calendar API.
 * 
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select an existing one
 * 3. Enable the Google Calendar API
 * 4. Create credentials (OAuth 2.0 Client ID for web application)
 * 5. Add authorized redirect URIs (e.g., http://localhost:3000/api/auth/google/callback)
 * 6. Download the credentials and set the environment variables
 * 
 * For server-side applications (service account):
 * 1. Create a service account
 * 2. Download the JSON key file
 * 3. Set GOOGLE_SERVICE_ACCOUNT_KEY environment variable
 * 
 * For user authentication (OAuth):
 * 1. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 * 2. Implement OAuth flow to get access and refresh tokens
 * 3. Set GOOGLE_ACCESS_TOKEN and GOOGLE_REFRESH_TOKEN
 */

// Environment variables for Google Calendar API
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
const GOOGLE_ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

// Service account credentials (alternative to OAuth)
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';

// Cache for the authenticated client
let cachedCalendarClient: calendar_v3.Calendar | null = null;

/**
 * Initialize OAuth2 client with credentials
 */
function getOAuth2Client() {
    const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
    );

    // Set credentials if available
    if (GOOGLE_ACCESS_TOKEN || GOOGLE_REFRESH_TOKEN) {
        oauth2Client.setCredentials({
            access_token: GOOGLE_ACCESS_TOKEN,
            refresh_token: GOOGLE_REFRESH_TOKEN,
        });
    }

    return oauth2Client;
}

/**
 * Initialize service account authentication
 */
function getServiceAccountAuth() {
    try {
        if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
            throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not set');
        }

        // Parse the service account key
        const serviceAccountKey = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);

        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccountKey,
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });

        return auth;
    } catch (error) {
        console.error('Failed to initialize service account auth:', error);
        throw error;
    }
}

/**
 * Get authenticated Google Calendar client
 * 
 * This function returns a cached calendar client or creates a new one.
 * It supports both OAuth2 and service account authentication.
 */
export async function getGoogleCalendarClient(): Promise<calendar_v3.Calendar> {
    // Return cached client if available
    if (cachedCalendarClient) {
        return cachedCalendarClient;
    }

    try {
        let authClient: ReturnType<typeof getServiceAccountAuth> | ReturnType<typeof getOAuth2Client>;

        // Prefer service account if available
        if (GOOGLE_SERVICE_ACCOUNT_KEY) {
            authClient = getServiceAccountAuth();
        } else if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
            authClient = getOAuth2Client();
        } else {
            throw new Error(
                'Google Calendar API credentials not configured. ' +
                'Please set either GOOGLE_SERVICE_ACCOUNT_KEY or ' +
                'GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_ACCESS_TOKEN/GOOGLE_REFRESH_TOKEN ' +
                'environment variables.'
            );
        }

        // Create calendar client
        const options = {
            version: 'v3' as const,
            auth: authClient,
        };
        cachedCalendarClient = google.calendar(options);

        return cachedCalendarClient;
    } catch (error) {
        console.error('Failed to initialize Google Calendar client:', error);
        throw error;
    }
}

/**
 * Generate OAuth2 authorization URL
 * 
 * Use this to redirect users to Google's OAuth consent screen.
 */
export function getAuthorizationUrl(state?: string): string {
    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar'],
        state,
        prompt: 'consent',
    });

    return authUrl;
}

/**
 * Exchange authorization code for tokens
 * 
 * Call this after the user authorizes your app and you receive the code.
 */
export async function getTokensFromCode(code: string) {
    const oauth2Client = getOAuth2Client();

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
        };
    } catch (error) {
        console.error('Failed to exchange authorization code for tokens:', error);
        throw error;
    }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        return {
            access_token: credentials.access_token,
            expiry_date: credentials.expiry_date,
        };
    } catch (error) {
        console.error('Failed to refresh access token:', error);
        throw error;
    }
}

/**
 * Revoke access token
 */
export async function revokeToken(token: string) {
    const oauth2Client = getOAuth2Client();

    try {
        await oauth2Client.revokeToken(token);
        cachedCalendarClient = null; // Clear cached client
    } catch (error) {
        console.error('Failed to revoke token:', error);
        throw error;
    }
}

/**
 * Clear cached calendar client
 * 
 * Call this when credentials change or you want to force re-authentication.
 */
export function clearCalendarClientCache() {
    cachedCalendarClient = null;
}
