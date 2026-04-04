# lib/ai/

Praesto Core AI logic, services, and tools. Fully decoupled from Vercel AI SDK.

## Purpose
Handles all AI-related functionality: model configuration, system prompts, tool implementations, chat streaming, and context management.

## File Structure
```
lib/ai/
├── chat/                    # Chat service & streaming
│   ├── chat-service.ts      # Main orchestration: handleChatRequest, convertToOpenAIMessages
│   ├── stream-protocol.ts   # Custom prefix-based streaming protocol
│   ├── attachments.ts       # File attachment processing
│   └── types.ts             # Chat-specific types (UserTimeContext, etc.)
├── tools/                   # AI tool implementations
│   ├── index.ts             # Tool registry and getTools()
│   ├── web-search.ts        # Brave Search API
│   ├── read-website-content.ts # Tavily Extract API
│   ├── get-weather.ts       # Open Meteo API
│   ├── execute-sandbox-code.ts # Vercel Sandbox
│   └── google-calendar.ts   # Google Calendar (list, create, update, delete, findFreeTimeSlots)
├── middleware/              # AI middleware
│   └── logging.ts           # AI request logging
├── prompts.ts               # System prompts with dynamic context assembly
├── providers.ts             # Model provider config (Poe API via OpenAI-compatible client)
├── models.ts                # Model definitions (Grok, Minimax, Gemma)
├── context.ts               # Shared buildUserTimeContext() utility
├── suggestions-prompt.ts    # Prompt for lightweight suggestion agent
└── types.ts                 # AI type definitions (Message, MessagePart, etc.)
```

## Key Patterns

### Chat Flow
```
User message → handleChatRequest() → processMessageAttachments() → convertToOpenAIMessages() → runCompletion() → StreamProtocol streaming
```

### Tool Execution Loop
`runCompletion()` recursively calls itself after tool execution until no more tool calls are returned.

### Dynamic Context Assembly
`systemPrompt()` in `prompts.ts` prunes irrelevant sections based on user message intent:
- Calendar section: only if calendar/schedule/meeting intent detected
- Sandbox section: only if code/run/execute intent detected
- Vietnamese guidelines: only if Vietnamese text detected

## Conventions

### Tool Structure
Each tool exports an object with:
- `description`: 1-line concise description
- `parameters`: JSON Schema for parameters
- `execute`: Async function that performs the action

### Error Handling
- All catch blocks must have `console.error` for observability
- Tools return error objects, never throw (except critical failures)
- Use `isErrorWithMessage` type guard for safe error extraction

### Streaming
- Use `StreamProtocol.format(type, data)` for consistent prefix-based encoding
- Send tool call streaming updates for immediate UI feedback
- Check `controller.desiredSize` before enqueuing

## Anti-Patterns
- ❌ Import Vercel AI SDK (we use custom streaming)
- ❌ Hardcode model names (use `chatModels` array)
- ❌ Verbose tool descriptions (keep to 1 line)
- ❌ Skip `console.error` in catch blocks
- ❌ Call Node.js APIs in Edge contexts

## Key Files
| File | Purpose |
|------|---------|
| `chat/chat-service.ts` | Main chat orchestration & streaming |
| `prompts.ts` | System prompts with dynamic assembly |
| `providers.ts` | Model provider config & completion params |
| `models.ts` | Model definitions |
| `tools/index.ts` | Tool registry |
| `context.ts` | Shared `buildUserTimeContext()` utility |
