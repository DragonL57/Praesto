# lib/ai/

Praesto Core AI logic, services, and tools. Fully decoupled from Vercel AI SDK.

## Core Components
- `chat/`: Main chat service and streaming protocol implementation.
- `providers.ts`: Model provider configuration (OpenAI/Poe compatible).
- `tools/`: AI tool implementations (web-search, weather, etc.).
- `types.ts`: AI-related type definitions and interfaces.
- `prompts.ts`: System prompts and agent instructions.

## Conventions
```typescript
// chat/chat-service.ts
import { handleChatRequest } from './chat-service';
// ... main orchestration logic
```

## Key Types
- `Message`: Custom chat message structure with `parts`.
- `MessagePart`: Discriminated union for `text`, `reasoning`, `tool-call`, `tool-result`, and `file`.
- `ChatStatus`: `idle` | `submitted` | `streaming` | `ready` | `error`.
- `StreamProtocol`: Custom prefix-based encoding for streaming over `ReadableStream`.
