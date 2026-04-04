# lib/services/

External service integrations (Google Calendar, Email).

## Purpose
Clients for third-party APIs with authentication handling.

## File Structure
```
lib/services/
├── google-calendar-api.ts  # Google Calendar client with parseEnvJson()
├── email.ts                # Email service
└── AGENTS.md
```

## Key Patterns

### parseEnvJson()
The `GOOGLE_SERVICE_ACCOUNT_KEY` env var stores JSON with mixed whitespace:
- Literal `\n` for structural whitespace
- Actual newlines inside string values (like private_key)

`parseEnvJson()` normalizes both formats before `JSON.parse`.

## Anti-Patterns
- ❌ Call these services from Edge runtime (Node.js only)
- ❌ Skip error logging in catch blocks
- ❌ Hardcode credentials
