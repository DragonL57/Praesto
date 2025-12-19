# Google Calendar Integration - Quick Reference

## 🎉 What's Been Created

Your AI assistant now has full Google Calendar capabilities! Here's what I've built:

### Files Created

1. **[lib/ai/tools/google-calendar.ts](lib/ai/tools/google-calendar.ts)**
   - 6 powerful calendar tools for your AI assistant
   
2. **[lib/google-calendar-api.ts](lib/google-calendar-api.ts)**
   - Google Calendar API authentication and client management
   
3. **[app/api/auth/google/callback/route.ts](app/api/auth/google/callback/route.ts)**
   - OAuth 2.0 callback handler for user authentication
   
4. **[GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)**
   - Complete setup guide with step-by-step instructions
   
5. **[.env.google-calendar.example](.env.google-calendar.example)**
   - Environment variables template

### Files Modified

- **[lib/ai/providers.ts](lib/ai/providers.ts)** - Added all 6 calendar tools to available tools
- **[package.json](package.json)** - Added googleapis dependency

---

## 🛠️ Available Calendar Tools

Your AI assistant can now:

### 1. **listCalendarEvents** 📋
List events in a time range, search for specific meetings, check availability.

**Example prompts:**
- "What's on my calendar today?"
- "Show me my meetings this week"
- "Do I have any meetings about the project review?"

### 2. **createCalendarEvent** ➕
Schedule new meetings, appointments, and time blocks.

**Example prompts:**
- "Schedule a team meeting tomorrow at 2 PM for 1 hour"
- "Block out time for focused work every morning from 9-11 AM this week"
- "Create a lunch appointment with John at noon on Friday"

### 3. **updateCalendarEvent** ✏️
Modify existing events, reschedule meetings, update details.

**Example prompts:**
- "Move my 3 PM meeting to 4 PM"
- "Add Sarah to my project review meeting"
- "Change the location of tomorrow's meeting to Conference Room B"

### 4. **deleteCalendarEvent** 🗑️
Cancel meetings and clear your schedule.

**Example prompts:**
- "Cancel my dentist appointment"
- "Delete all meetings on Friday afternoon"
- "Remove the recurring standup this week"

### 5. **findFreeTimeSlots** 🔍
Find available time slots for scheduling.

**Example prompts:**
- "When am I free this week?"
- "Find a 2-hour slot for deep work this week"
- "What's my availability for next Monday?"

### 6. **getCalendarEvent** 📝
Get detailed information about specific events.

**Example prompts:**
- "What's the agenda for my 2 PM meeting?"
- "Who's attending the team standup?"
- "Show me details of my next meeting"

---

## 🚀 Quick Start

### Step 1: Install Dependencies
```bash
pnpm install
```
✅ Already done! (googleapis installed)

### Step 2: Set Up Google Calendar API

Choose one authentication method:

#### **Option A: OAuth 2.0** (Recommended for user calendars)
1. Follow the guide in [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)
2. Get Client ID and Secret from Google Cloud Console
3. Visit `http://localhost:3000/api/auth/google/callback?action=authorize`
4. Copy the tokens to your `.env.local`

#### **Option B: Service Account** (For server automation)
1. Create service account in Google Cloud Console
2. Download JSON key file
3. Share your calendar with the service account email
4. Add the key to `.env.local`

### Step 3: Add Environment Variables

Create `.env.local` and add (copy from `.env.google-calendar.example`):

```bash
# For OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_ACCESS_TOKEN=your_access_token
GOOGLE_REFRESH_TOKEN=your_refresh_token

# OR for Service Account
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### Step 4: Test It!

Start your dev server and try asking:
- "What's on my calendar today?"
- "Schedule a meeting for tomorrow at 3 PM"
- "When am I free this week?"

---

## 💡 Usage Examples

### Calendar Assistant Capabilities

Your AI assistant is now a powerful calendar assistant that can:

#### 📊 **Planning & Scheduling**
- "Plan my week: I need to schedule 3 client meetings, 2 hours of focused work daily, and lunch breaks"
- "Find the best time for a 1-hour team sync this week when everyone is free"
- "Block out time for my quarterly review next month"

#### 🔄 **Smart Rescheduling**
- "I'm running late, push all my afternoon meetings back by 30 minutes"
- "Reschedule my dentist appointment to next week, same time"
- "Swap my Monday and Tuesday meetings"

#### 📈 **Availability Management**
- "What's my availability for a 2-hour meeting next week?"
- "Show me all my free slots between 2-5 PM this week"
- "When can I schedule a full-day workshop in the next two weeks?"

#### 🎯 **Smart Insights**
- "How many meetings do I have this week?"
- "Am I free for lunch on Thursday?"
- "What's my longest meeting today?"

#### 🔔 **Proactive Assistance**
- "Remind me about my next meeting and prepare a summary"
- "What meetings do I have in the next hour?"
- "Am I double-booked today?"

---

## 🔧 Customization

### Time Zones
All tools support time zone configuration. Default is America/New_York.

```typescript
// In the tool definitions, you can specify:
timeZone: z.string().default('America/New_York')
```

### Working Hours
The `findFreeTimeSlots` tool respects working hours (9 AM - 5 PM by default).

### Event Colors
Support for 11 color IDs to organize events visually.

### Recurring Events
Full support for RRULE format for recurring events.

---

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Encrypt tokens in database** - Don't store plain text
3. **Use refresh tokens** - Auto-refresh expired access tokens
4. **Rotate credentials** - Regularly update service account keys
5. **Limit permissions** - Only grant necessary calendar access

---

## 📚 Resources

- **Full Setup Guide**: [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)
- **Google Calendar API**: https://developers.google.com/calendar
- **OAuth 2.0 Playground**: https://developers.google.com/oauthplayground
- **Google Cloud Console**: https://console.cloud.google.com

---

## 🐛 Troubleshooting

### Common Issues

**"Credentials not configured"**
- Check that environment variables are set in `.env.local`
- Restart dev server after adding variables

**"Calendar not found"**
- For service accounts: Share calendar with service account email
- Check you're using correct calendar ID

**"Access token expired"**
- Ensure you have a valid `GOOGLE_REFRESH_TOKEN`
- System will auto-refresh if refresh token is present

**"Insufficient permissions"**
- Grant calendar scope: `https://www.googleapis.com/auth/calendar`
- For service accounts: Check calendar sharing permissions

---

## 🎯 Next Steps

1. **Test the integration**: Try the example prompts above
2. **Customize prompts**: Modify tool descriptions in `google-calendar.ts`
3. **Add UI components**: Create calendar views in your app
4. **Store tokens**: Implement secure token storage in database
5. **Add notifications**: Set up event reminders and alerts
6. **Multi-calendar**: Support multiple calendars per user

---

## 📝 Notes

- All tools return structured JSON responses
- Error handling is built-in for all operations
- Tools are automatically registered with your AI models
- Works with all AI models that support function calling

---

Need help? Check the [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md) for detailed setup instructions!
