# AGENTS.md - UniTaskAI (Praesto)

**Next.js 15 AI chat app** with Vercel AI SDK, Drizzle ORM, NextAuth v5, Playwright tests.

## Structure
```
./
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register, etc.)
│   ├── (chat)/            # Chat pages
│   ├── admin/             # Admin pages
│   └── api/               # API routes (organized by domain)
│       ├── auth/          # Authentication endpoints
│       ├── chat/          # Chat & messaging endpoints
│       ├── admin/         # Admin management endpoints
│       ├── cron/          # Scheduled tasks
│       └── public/        # Public APIs (metadata, transcripts, etc.)
├── components/             # UI + feature components
│   ├── ui/                 # shadcn/ui base components
│   ├── messages/           # Chat message components
│   ├── sidebar/            # Chat sidebar
│   └── markdown/           # Markdown rendering
├── lib/                    # Core utilities
│   ├── actions/            # Server actions (auth, chat, admin)
│   ├── ai/                 # AI SDK integrations
│   │   ├── chat/           # Chat-specific AI utilities
│   │   │   ├── types.ts           # Type definitions
│   │   │   ├── attachments.ts     # File processing logic
│   │   │   ├── message-builder.ts # Message part construction
│   │   │   ├── stream-transformer.ts # Stream cleaning
│   │   │   └── handlers.ts        # Chat persistence handlers
│   │   ├── providers.ts    # Model provider configuration
│   │   └── calendar-tools.ts # Calendar integration
│   └── db/                 # Database schema + queries
└── tests/                  # Playwright E2E tests
```

## Commands
```bash
pnpm dev           # Dev server (Turbo)
pnpm build         # Production build (vercel-build.js)
pnpm lint:fix      # ESLint + Biome fix
pnpm format        # Biome format
pnpm db:migrate    # Run Drizzle migrations
pnpm test          # Playwright tests
pnpm exec playwright test --project=chat  # Single project
```

## Conventions

### Project Organization

#### Route Structure
- **Route Groups**: Use for layout-only grouping without URL segments
  - `(auth)/` - Auth pages: login, register, forgot-password, reset-password
  - `(chat)/` - Chat interface pages
- **API Routes**: All in `app/api/` organized by domain
  - `api/auth/` - Authentication endpoints (session, signout, verify, etc.)
  - `api/chat/` - Chat operations (create, rename, delete, history, etc.)
  - `api/admin/` - Admin management (users, analytics, conversations)
  - `api/cron/` - Scheduled background tasks
  - `api/public/` - Public endpoints (metadata, transcripts, model-cookie, og)

#### Server Actions
- Consolidated in `lib/actions/` by domain:
  - `lib/actions/auth.ts` - Auth operations (login, register)
  - `lib/actions/chat.ts` - Chat operations (title generation, messages, visibility)
  - `lib/actions/admin.ts` - Admin operations (user management)
- Import using `@/lib/actions/{domain}`

#### Naming Conventions
- **API routes**: kebab-case (e.g., `model-cookie`, `delete-all`)
- **Files/folders**: kebab-case for multi-word names
- **Components**: PascalCase files, camelCase props
- **Constants**: Export from `lib/constants.ts` (e.g., `loginRoute`, `registerRoute`)

### Import Order
1. React/framework imports
2. External libs (alphabetical)
3. Internal @/ imports
4. Type-only imports

### Types
- `interface` for object shapes, `type` for unions
- `import type` when possible
- Custom errors extend `Error` with `info` + `status`

### Components
```typescript
'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const variants = cva('base-classes', {
  variants: { variant: { default: '...', secondary: '...' } },
  defaultVariants: { variant: 'default' },
});

export interface Props extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof variants> {}
export function Component({ className, variant, ...props }: Props) {
  return <div className={cn(variants({ variant }), className)} {...props} />;
}
```

### State
- `useSWR` for server state
- `useLocalStorage` from `usehooks-ts` for persistence
- Optimistic updates for UX

## Anti-Patterns
- ❌ `@ts-ignore`, `as any`
- ❌ Empty catch blocks
- ❌ `forEach` with side effects (use map/filter/reduce)
- ❌ Console.log in production
- ❌ Direct DOM manipulation

## Key Files
| File | Purpose |
|------|---------|
| `lib/utils.ts` | Shared utilities (cn, fetcher, UUID) |
| `lib/constants.ts` | App-wide constants (routes, env flags) |
| `lib/actions/` | Server actions by domain (auth, chat, admin) |
| `lib/ai/chat/` | Modular chat handling (attachments, messages, streaming) |
| `lib/db/schema.ts` | Drizzle schema definitions |
| `lib/ai/providers.ts` | AI model providers config |
| `app/(auth)/auth.config.ts` | NextAuth configuration |
| `biome.jsonc` | Formatter/linter rules |
| `playwright.config.ts` | Test configuration |

## API Route Organization

### Authentication (`api/auth/`)
- `[...nextauth]/` - NextAuth handler
- `session/` - Session management
- `signout/` - Sign out endpoint
- `verify-email/` - Email verification
- `forgot-password/` - Password reset request
- `reset-password/` - Password reset confirmation
- `google/` - OAuth Google integration
- `csrf/` - CSRF token

### Chat (`api/chat/`)
- `route.ts` - Main chat endpoint (streaming)
- `create-and-send/` - Create chat and send message
- `rename/` - Rename chat
- `delete-all/` - Delete all user chats
- `document/` - Document operations
- `files/upload/` - File upload handling
- `history/` - Chat history
- `suggestions/` - AI suggestions
- `vote/` - Message voting

### Admin (`api/admin/`)
- `users/` - User management
- `analytics/` - Usage analytics
- `conversations/` - Chat moderation
- `stats/` - System statistics

### Public (`api/public/`)
- `metadata/` - Link metadata fetching
- `transcript/` - Video transcript extraction
- `model-cookie/` - Model preference storage
- `og/` - OpenGraph image generation

### Cron (`api/cron/`)
- `cleanup-unverified-users/` - Remove unverified accounts

## Subdirectory Guides
- `components/ui/AGENTS.md` - UI component patterns
- `lib/db/AGENTS.md` - Database conventions
- `lib/ai/AGENTS.md` - AI SDK integrations