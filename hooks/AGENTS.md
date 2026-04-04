# hooks/

Custom React hooks for Praesto.

## Purpose
Reusable state logic shared across components.

## Key Files
| File | Purpose |
|------|---------|
| `use-praesto-chat.ts` | Custom chat hook (replaces Vercel AI SDK). Handles message state, streaming, tool calls, and API communication. |

## Conventions
- All hooks start with `use` prefix
- Return consistent object shape
- Use `useSWR` for server state, `useLocalStorage` for persistence

## Anti-Patterns
- ❌ Mix UI rendering with hook logic
- ❌ Skip TypeScript return types
- ❌ Direct DOM manipulation in hooks
