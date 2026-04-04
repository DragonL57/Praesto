# lib/actions/

Server actions for auth, chat, and admin operations.

## Purpose
Consolidates server-side operations that can be called directly from client components.

## File Structure
```
lib/actions/
├── auth.ts                # Login, register, OAuth
├── chat.ts                # Title generation, messages, visibility
├── admin.ts               # User management
└── AGENTS.md
```

## Conventions
- All files start with `'use server'`
- Import using `@/lib/actions/{domain}`
- Generic error messages to prevent account enumeration
- `console.error` in all catch blocks

## Anti-Patterns
- ❌ Return detailed error messages (prevents account enumeration)
- ❌ Skip `console.error` in catch blocks
- ❌ Use `redirectTo` in server actions (triggers server-side redirect)
