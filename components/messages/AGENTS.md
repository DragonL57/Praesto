# components/messages/

Chat message display components.

## Purpose
Renders all message types (text, reasoning, tool-calls, tool-results, files) with appropriate styling and interactive elements.

## File Structure
```
components/messages/
├── messages.tsx           # Main message list container
├── message.tsx            # Individual message component
├── tool-call-card.tsx     # Tool call display with status
├── reasoning-card.tsx     # AI thinking/reasoning display
├── ... (other message sub-components)
└── AGENTS.md
```

## Conventions
- Each message type has its own card component
- Tool calls show streaming status (input-available → output-available/output-error)
- Reasoning content is collapsible by default
- Use `<citation-button>` for search result citations

## Anti-Patterns
- ❌ Mix message rendering logic with chat orchestration
- ❌ Hardcode message styles (use Tailwind classes)
- ❌ Skip loading states for tool results
