# AGENTS.md - UniTaskAI (Praesto)

**Next.js 15 AI chat app** with Vercel AI SDK, Drizzle ORM, NextAuth v5, Playwright tests.

## Structure
```
./
├── app/                    # Next.js App Router pages
├── components/             # UI + feature components
│   ├── ui/                 # shadcn/ui base components
│   ├── messages/           # Chat message components
│   ├── sidebar/            # Chat sidebar
│   └── markdown/           # Markdown rendering
├── lib/                    # Core utilities
│   ├── ai/                 # AI SDK integrations
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
| `lib/db/schema.ts` | Drizzle schema definitions |
| `lib/ai/providers.ts` | AI model providers config |
| `biome.jsonc` | Formatter/linter rules |
| `playwright.config.ts` | Test configuration |

## Subdirectory Guides
- `components/ui/AGENTS.md` - UI component patterns
- `lib/db/AGENTS.md` - Database conventions
- `lib/ai/AGENTS.md` - AI SDK integrations