# AGENTS.md - UniTaskAI (Praesto)

**Next.js 15 AI chat app** with custom streaming (no Vercel AI SDK), Drizzle ORM, NextAuth v5, Playwright tests.

## Structure
```
./
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register, etc.)
│   ├── (chat)/            # Chat pages
│   ├── admin/             # Admin pages
│   ├── settings/          # User settings
│   ├── share/             # Shared chat pages
│   ├── docs/              # Documentation pages
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
│   ├── markdown/           # Markdown rendering
│   ├── settings/           # Settings UI components
│   ├── ai-elements/        # AI-specific UI elements
│   └── shared/             # Shared chat components
├── hooks/                  # Custom React hooks
│   └── use-praesto-chat.ts # Custom chat hook (no AI SDK)
├── lib/                    # Core utilities
│   ├── actions/            # Server actions (auth, chat, admin)
│   ├── ai/                 # AI logic (no Vercel AI SDK)
│   │   ├── chat/           # Chat service & streaming
│   │   ├── tools/          # AI tool implementations
│   │   ├── middleware/     # AI middleware
│   │   ├── prompts.ts      # System prompts with dynamic assembly
│   │   ├── providers.ts    # Model provider configuration
│   │   ├── models.ts       # Model definitions
│   │   ├── context.ts      # Shared context utilities
│   │   └── types.ts        # AI type definitions
│   ├── db/                 # Database schema + queries
│   ├── services/           # External services (Google Calendar, email)
│   └── *.ts                # Utilities (auth-handler, rate-limit, etc.)
├── api/                    # Python scripts (transcript extraction, separate project)
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

**IMPORTANT:** NEVER run `pnpm build` or `pnpm lint:fix` without explicit user permission. The user runs `pnpm dev` for real-time testing and build/lint commands will interrupt their workflow. Only run these commands when the user explicitly asks.

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
- ❌ Never modify `.env.local` - pull from Vercel instead

## Key Files
| File | Purpose |
|------|---------|
| `lib/utils.ts` | Shared utilities (cn, fetcher, UUID) |
| `lib/constants.ts` | App-wide constants (routes, env flags) |
| `lib/actions/` | Server actions by domain (auth, chat, admin) |
| `lib/ai/chat/chat-service.ts` | Main chat orchestration & streaming |
| `lib/ai/prompts.ts` | System prompts with dynamic context assembly |
| `lib/ai/providers.ts` | Model provider config & completion params |
| `lib/ai/models.ts` | Model definitions (Grok, Minimax, Gemma) |
| `lib/ai/context.ts` | Shared `buildUserTimeContext()` utility |
| `lib/ai/tools/` | AI tools (search, weather, calendar, sandbox) |
| `lib/db/schema.ts` | Drizzle schema definitions |
| `lib/services/google-calendar-api.ts` | Google Calendar client with `parseEnvJson()` |
| `lib/session-validator.ts` | Node-side session validation |
| `lib/rate-limit-edge.ts` | HMAC-signed cookie rate limiter |
| `hooks/use-praesto-chat.ts` | Custom chat hook (replaces Vercel AI SDK) |
| `middleware.ts` | Edge middleware with rate limiting |
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
- `chat/route.ts` - Main chat endpoint (streaming)
- `create-and-send/` - Create chat and send message
- `rename/` - Rename chat
- `delete-all/` - Delete all user chats
- `document/` - Document operations
- `files/upload/` - File upload handling
- `history/` - Chat history
- `suggestions/` - AI suggestions

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
- `components/settings/AGENTS.md` - Settings architecture & design system
- `lib/db/AGENTS.md` - Database conventions
- `lib/ai/AGENTS.md` - AI implementation details

---

## Design Philosophy

### Core Principles

**Research-First AI**: UniTaskAI is a research assistant, not a creative writer. Every factual claim must be backed by tool-based research (web search, extraction, sandbox execution). The model should never guess, assume, or rely solely on internal training data for facts.

**Token Efficiency**: Every token in the context window costs money and latency. Apply context engineering principles:
- System prompt is dynamically assembled based on conversation intent
- Irrelevant sections (calendar, sandbox, Vietnamese guidelines) are pruned per-request
- Tool descriptions are concise - only what the model needs to decide and call correctly
- Delete ruthlessly: pruning beats padding

**Edge-Native Architecture**: NextAuth middleware runs in the Edge runtime. Never call Node.js APIs (database drivers, file system) inside Edge-invoked callbacks. Session validation requiring DB access must happen in Node contexts (server components, API routes).

**Defensive by Default**: 
- `console.error` in all catch blocks for observability
- Generic error messages to prevent account enumeration
- Origin validation on all redirect URLs
- HMAC-signed rate limiting cookies

### Context Engineering Rules

**System Prompt Assembly** (`lib/ai/prompts.ts`):
- `systemPrompt()` accepts `userMessage` for intent detection
- Prunes `<planning_assistant_protocol>` if no calendar intent
- Prunes `<code_execution_tool>` if no code intent
- Prunes Vietnamese guidelines if message is English-only
- Includes 7-day forward reference table for accurate date-to-day mapping

**Environment Context**: Always includes current date, time, day of week, timezone, and a 7-day reference table (e.g., "Monday: 2026-04-06"). This prevents the model from making date calculation errors.

**Tool Descriptions**: Keep them tight. The model only needs to know:
1. What the tool does (1 line)
2. Required parameters
3. Key defaults/constraints
Remove verbose explanations, examples, and "use this to..." phrases.

**Dynamic Context Assembly Pattern**:
```
User message → Intent detection → Section pruning → Final prompt assembly → API call
```
This reduces per-request context by 20-30% for simple queries.

### Google Calendar Integration

**Timezone Handling**: The `listCalendarEvents` tool normalizes date strings to `+07:00` (Asia/Ho_Chi_Minh) when no timezone is specified. The model should always include timezone info in date parameters.

**Service Account Auth**: The `GOOGLE_SERVICE_ACCOUNT_KEY` env var stores JSON with mixed whitespace formats (literal `\n` for structural whitespace, actual newlines inside string values). Use `parseEnvJson()` in `lib/services/google-calendar-api.ts` to normalize before `JSON.parse`.

**Default Calendar**: `vmthelong2004@gmail.com` unless specified. Track event IDs and time zones.

### AI Model Configuration

**Provider**: Poe API via OpenAI-compatible client (`https://api.poe.com/v1`)

**Models** (`lib/ai/models.ts`):
| ID | Name | Tools | Thinking | Notes |
|---|---|---|---|---|
| `grok-4.1-fast-reasoning` | Grok-4.1 | Yes | Yes | Default model |
| `minimax-m2.7` | Minimax M2.7 | Yes | Yes | Thinks by default |
| `gemma-4-31b` | Gemma 4 31B | Yes | Yes | Requires `enable_thinking: true` |

**Model Mapping** (`lib/ai/providers.ts`):
- `chat-model` → `grok-4.1-fast-reasoning`
- `title-model` / `fast-model` → `grok-4.1-fast-non-reasoning`

### Key Architectural Decisions

1. **No Vercel AI SDK**: Custom streaming protocol (`StreamProtocol`) for direct OpenAI/Poe API integration. Prefix-based encoding for streaming over `ReadableStream`.

2. **Message Unrolling**: OpenAI-compatible providers require strict message sequences for tool calls. `convertToOpenAIMessages()` in `chat-service.ts` unrolls bundled UI messages into proper alternating sequences.

3. **Tool Call Loop**: `runCompletion()` recursively calls itself after tool execution until no more tool calls are returned. This enables multi-step tool usage in a single user turn.

4. **Retry Logic**: Automatic retry (up to 2 attempts) with exponential backoff for upstream 500/429 errors.

5. **Attachment Processing**: File attachments are processed before sending to the model. Extracted text is appended to the user message content.

### Env Variables

**Never modify `.env.local`**. If env values need fixing, pull from Vercel:
```bash
vercel env pull .env.local --yes
```

**Critical env vars**:
- `POE_API_KEY` - AI model access
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Calendar auth (JSON with mixed whitespace)
- `BRAVE_API_KEY` - Web search
- `TAVILY_API_KEY` - Website content extraction
- `VERCEL_SANDBOX_TOKEN` - Code execution
- `DEFAULT_CALENDAR_EMAIL` - Override default calendar (fallback: `vmthelong2004@gmail.com`)

### Lessons Learned

- **Edge Runtime Constraint**: NextAuth's `auth()` middleware runs in Edge runtime. Calling `getUserById()` (which uses the `postgres` Node driver) inside `callbacks.jwt` crashes when invoked by middleware.
- **Poe API Tool Calling**: `gemma-4-31b-n` (@novitaai) does NOT support tool calling despite UI claims. Use official `gemma-4-31b` (@google) instead.
- **Poe API Quota Limits**: `gemma-4-31b` frequently hits Google's backend input token quota (`429 RESOURCE_EXHAUSTED`). Fallback to `grok-4.1-fast-reasoning` recommended.
- **NextAuth `signIn` Redirects**: Using `redirectTo` in server action triggers server-side redirect. Use `redirect: false` + client-side `router.push` for safe post-login routing.
- **Date-Timezone Mismatch**: AI models generate dates without timezone suffix, causing Google Calendar 400 errors. Always normalize dates in tool execution.

---

## UI/UX Design Philosophy

### Core Principles

**Competent Pragmatism**: The AI should feel like a highly capable junior analyst - polite, incredibly direct, structurally organized, and entirely focused on resolving the query. Users should feel they're interacting with a sophisticated tool, not a fake human. Avoid excessive slang, fake typing delays, or pretending to have human emotions.

**Transparency First**: Never deceive users about the AI's nature. The interface should make it clear they're interacting with an AI assistant. When the AI is working, show it - use "thinking" states, tool call indicators, and progress feedback instead of generic loading spinners.

**Conversations Replace Clicks**: Every interaction should feel natural and conversational. Users should never need to navigate complex menus or guess what actions are available. The interface adapts to how users communicate, not the other way around.

### Visual Design

**Rich Output Over Plain Text**: When the AI executes complex actions, the UI should render appropriate visual components:
- Tool calls show as interactive cards with status indicators
- Search results render as structured cards with citations
- Calendar events display as formatted event blocks with action buttons
- Code execution shows output in styled terminal blocks

**Ambient UI**: The chat interface should not obscure content. Use collapsible, translucent sidebars that dock to the side, allowing users to continue browsing while the AI conversation remains persistently visible.

**Thinking States**: Instead of generic loading spinners, show the AI's internal process:
- `Searching web...` → `Analyzing results...` → `Drafting response...`
- This micro-transparency builds trust and proves the AI is actually working.

**No Emojis in AI Responses**: The system prompt explicitly forbids emoji usage. The UI should maintain a clean, professional aesthetic consistent with this constraint.

### Conversational UX

**Context Awareness**: The system understands and adapts to:
- User's language (English/Vietnamese with different formatting rules)
- Time of day and timezone (Asia/Ho_Chi_Minh default)
- Conversation history and previous context
- User intent (research, calendar, code, casual)

**Natural Language Interactions**: Users speak naturally - imperfect grammar, slang, mixed languages. The system interprets meaning regardless of phrasing. No rigid command structures.

**Clear Feedback Loop**: Every user action receives immediate, unambiguous feedback:
- Message sent → streaming indicator appears
- Tool called → tool card with status updates
- Error occurred → clear error message with suggested next steps
- Never leave users wondering if something happened

**Error Handling**: Errors are acknowledged neutrally with actionable next steps. Never force users to restart. Offer alternatives and clarify what went wrong in plain language.

**Conversational Flow**: 
- Respond quickly, avoid interrupting
- Don't force unnecessary confirmations
- Break complex tasks into manageable steps
- Anticipate follow-up questions with suggested actions
- Let users control pacing

### Accessibility

- Screen reader compatibility for all interactive elements
- Keyboard navigation for all chat functions
- Speech recognition input support
- High contrast mode support
- Simple sentence structures for clarity
- Text alternatives for all voice/audio interactions
- Multi-language support (English, Vietnamese)

### Mobile-First Responsiveness

- Touch-friendly tap targets (min 44px)
- Swipe gestures for sidebar navigation
- Optimized input area for mobile keyboards
- Collapsible tool cards on small screens
- Persistent scroll-to-bottom button
- Viewport-aware layout adjustments

---

## Development Workflow

### Branch Strategy

**Always create a new branch for new development**:
```bash
git checkout -b feat/{feature-name}    # New features
git checkout -b fix/{bug-name}        # Bug fixes
git checkout -b docs/{topic}          # Documentation updates
git checkout -b refactor/{area}       # Code refactoring
```

**Never commit directly to `main`**. All changes go through PR review.

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Run `pnpm lint:fix && pnpm build` to verify
4. Push branch and create PR
5. Request code review
6. Address review comments
7. Merge to `main` after approval

### AGENTS.md Maintenance

**Every folder should have its own AGENTS.md** documenting:
- Purpose and responsibilities of the folder
- File structure and key files
- Conventions and patterns used
- Anti-patterns to avoid
- How it connects to other parts of the codebase

**Continuously update AGENTS.md files** when:
- Adding new files or folders
- Changing architectural patterns
- Introducing new conventions
- Discovering lessons learned

**Current AGENTS.md locations**:
- `AGENTS.md` (root) - Project-wide conventions and philosophy
- `components/ui/AGENTS.md` - UI component patterns
- `components/settings/AGENTS.md` - Settings architecture & design system
- `lib/db/AGENTS.md` - Database conventions
- `lib/ai/AGENTS.md` - AI implementation details
