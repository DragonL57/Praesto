/**
 * Google Calendar Integration Test Script
 * 
 * Run this script to test your Google Calendar API setup:
 * node --loader tsx google-calendar-test.mjs
 * 
 * Or with tsx directly:
 * tsx google-calendar-test.mjs
 */

import 'dotenv/config';
import { getGoogleCalendarClient } from './lib/google-calendar-api.ts';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testCalendarConnection() {
  logSection('🔍 Testing Google Calendar API Connection');

  try {
    // Test 1: Check environment variables
    logSection('📋 Step 1: Checking Environment Variables');
    
    const hasOAuth = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      (process.env.GOOGLE_ACCESS_TOKEN || process.env.GOOGLE_REFRESH_TOKEN)
    );
    
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!hasOAuth && !hasServiceAccount) {
      log('❌ No credentials found!', 'red');
      log('\nPlease set one of the following in your .env.local:', 'yellow');
      log('  • GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_ACCESS_TOKEN, GOOGLE_REFRESH_TOKEN', 'yellow');
      log('  • GOOGLE_SERVICE_ACCOUNT_KEY', 'yellow');
      log('\nSee GOOGLE_CALENDAR_SETUP.md for instructions.', 'yellow');
      process.exit(1);
    }

    if (hasOAuth) {
      log('✓ OAuth 2.0 credentials found', 'green');
      log(`  Client ID: ${process.env.GOOGLE_CLIENT_ID?.substring(0, 20)}...`, 'blue');
      log(`  Has Access Token: ${!!process.env.GOOGLE_ACCESS_TOKEN}`, 'blue');
      log(`  Has Refresh Token: ${!!process.env.GOOGLE_REFRESH_TOKEN}`, 'blue');
    }

    if (hasServiceAccount) {
      log('✓ Service Account credentials found', 'green');
      try {
        const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        log(`  Service Account: ${key.client_email}`, 'blue');
        log(`  Project ID: ${key.project_id}`, 'blue');
      } catch (e) {
        log('⚠ Warning: Service account key format may be invalid', 'yellow');
      }
    }

    // Test 2: Initialize calendar client
    logSection('🔌 Step 2: Initializing Calendar Client');
    const calendar = await getGoogleCalendarClient();
    log('✓ Calendar client initialized successfully', 'green');

    // Test 3: List calendars
    logSection('📅 Step 3: Fetching Calendar List');
    const calendarList = await calendar.calendarList.list();
    
    if (!calendarList.data.items || calendarList.data.items.length === 0) {
      log('⚠ No calendars found', 'yellow');
      if (hasServiceAccount) {
        log('\nFor service accounts, make sure you\'ve shared your calendar with:', 'yellow');
        try {
          const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
          log(`  ${key.client_email}`, 'cyan');
        } catch (e) {
          log('  [service account email]', 'cyan');
        }
      }
    } else {
      log(`✓ Found ${calendarList.data.items.length} calendar(s)`, 'green');
      calendarList.data.items.forEach((cal, index) => {
        log(`  ${index + 1}. ${cal.summary} (${cal.id})`, 'blue');
        log(`     Access: ${cal.accessRole}`, 'blue');
      });
    }

    // Test 4: Fetch events from primary calendar
    logSection('📋 Step 4: Fetching Recent Events');
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: oneWeekAgo.toISOString(),
      timeMax: now.toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: 'startTime',
    });

    if (!events.data.items || events.data.items.length === 0) {
      log('ℹ No events found in the past week', 'yellow');
    } else {
      log(`✓ Found ${events.data.items.length} event(s) in the past week`, 'green');
      events.data.items.forEach((event, index) => {
        const start = event.start?.dateTime || event.start?.date;
        log(`  ${index + 1}. ${event.summary}`, 'blue');
        log(`     When: ${start}`, 'blue');
        log(`     Status: ${event.status}`, 'blue');
      });
    }

    // Test 5: Check calendar write permissions
    logSection('🔐 Step 5: Checking Permissions');
    try {
      // Try to get calendar settings to verify read access
      const calSettings = await calendar.calendarList.get({
        calendarId: 'primary',
      });
      
      log('✓ Read access confirmed', 'green');
      log(`  Access Role: ${calSettings.data.accessRole}`, 'blue');
      
      if (calSettings.data.accessRole === 'owner' || calSettings.data.accessRole === 'writer') {
        log('✓ Write access confirmed - can create/update/delete events', 'green');
      } else {
        log('⚠ Limited access - read-only', 'yellow');
      }
    } catch (error) {
      log('⚠ Could not verify permissions', 'yellow');
    }

    // Success summary
    logSection('✅ Connection Test Complete');
    log('Your Google Calendar integration is working!', 'green');
    log('\nNext steps:', 'cyan');
    log('  1. Start your dev server: pnpm dev', 'blue');
    log('  2. Open your chat app', 'blue');
    log('  3. Try asking: "What\'s on my calendar today?"', 'blue');
    log('\nFor more examples, see GOOGLE_CALENDAR_README.md', 'cyan');

  } catch (error) {
    logSection('❌ Connection Test Failed');
    log('Error: ' + error.message, 'red');
    
    if (error.message.includes('invalid_grant')) {
      log('\nYour access token may be expired.', 'yellow');
      log('Solutions:', 'yellow');
      log('  1. If using OAuth: Visit http://localhost:3000/api/auth/google/callback?action=authorize', 'blue');
      log('  2. If using Service Account: Check the key is valid and calendar is shared', 'blue');
    } else if (error.message.includes('invalid_client')) {
      log('\nYour client credentials may be incorrect.', 'yellow');
      log('Check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET', 'blue');
    } else if (error.message.includes('Credentials not configured')) {
      log('\nNo credentials found in environment variables.', 'yellow');
      log('See GOOGLE_CALENDAR_SETUP.md for setup instructions.', 'blue');
    }
    
    log('\nFull error details:', 'yellow');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testCalendarConnection();
