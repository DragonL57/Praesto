# lib/ai/

Vercel AI SDK integrations, providers, and tools.

## Files
- providers.ts: Model provider configuration
- tools/: AI tool implementations (web-search, weather, etc.)
- types.ts: AI-related type definitions

## Conventions
```typescript
// providers.ts
import { openai } from '@ai-sdk/openai';
import { createProvider } from 'ai';

export const providers = {
  openai: createProvider(openai('gpt-4')),
  // ...
};

// tools/web-search.ts
export async function webSearch(query: string) {
  // Implementation using DuckDuckGo
}
```

## Key Types
- `UIMessage`: Chat message structure
- `ToolInvocation`: AI tool call structure

## Anti-Patterns
- ❌ Direct fetch calls (use AI SDK)
- ❌ Skip error handling on tool calls
- ❌ Hardcode model names (use constants)