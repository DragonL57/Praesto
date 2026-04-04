# components/sidebar/

Chat sidebar component.

## Purpose
Displays chat history, navigation, and sidebar controls.

## Key Files
| File | Purpose |
|------|---------|
| `sidebar.tsx` | Main sidebar container |
| `history.tsx` | Chat history list with pagination |

## Conventions
- Use `useSWR` for chat history fetching
- Implement infinite scroll pagination
- Swipe gestures for mobile

## Anti-Patterns
- ❌ Load all chats at once (use pagination)
- ❌ Skip loading states
- ❌ Hardcode chat history limit
