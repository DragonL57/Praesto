# Plan: Migration to Direct OpenAI-Compatible API (Poe Integration)

## Phase 1: Preparation & Dependency Removal
- [ ] Task: Audit codebase for Vercel AI SDK usage and tool dependencies.
- [ ] Task: Remove `app/api/get_transcript` directory and route.
- [ ] Task: Uninstall `ai` and `@ai-sdk/*` packages.
- [ ] Task: Conductor - User Manual Verification 'Preparation & Dependency Removal' (Protocol in workflow.md)

## Phase 2: Core Client Implementation
- [ ] Task: Create `lib/ai/client/types.ts` with strict OpenAI-compatible interfaces (ChatCompletion, Message, Delta, etc.).
- [ ] Task: Implement `OpenAICompatibleClient` class in `lib/ai/client/openai-client.ts` with `fetch` and streaming support.
- [ ] Task: Create a singleton instance configured for Poe in `lib/ai/client/poe.ts`.
- [ ] Task: Implement a basic tool execution helper/registry (to replace Vercel's `tool` definitions) in `lib/ai/tools/registry.ts`.
- [ ] Task: Conductor - User Manual Verification 'Core Client Implementation' (Protocol in workflow.md)

## Phase 3: Backend Refactor
- [ ] Task: Rewrite `app/api/chat/route.ts` to use `poeClient`.
- [ ] Task: Implement streaming response handling in the route (ensure headers are set for SSE).
- [ ] Task: Integrate the tool execution helper into the chat route (if tools are enabled) or ensure tool definitions are correctly passed to the API.
- [ ] Task: Conductor - User Manual Verification 'Backend Refactor' (Protocol in workflow.md)

## Phase 4: Frontend Implementation
- [ ] Task: Create `hooks/use-custom-chat.ts` to replace Vercel's `useChat`.
    - Implement `submitMessage` function.
    - Implement stream parsing logic (TextDecoder, line buffering).
- [ ] Task: Refactor `components/chat.tsx` to use `useCustomChat`.
- [ ] Task: Update message display components to handle the new message structure if changed.
- [ ] Task: Conductor - User Manual Verification 'Frontend Implementation' (Protocol in workflow.md)

## Phase 5: Verification & Cleanup
- [ ] Task: Run project-wide linting (`pnpm run lint`) and fix errors.
- [ ] Task: Run type checking (`pnpm exec tsc --noEmit`) and fix errors.
- [ ] Task: Manual end-to-end test of chat functionality.
- [ ] Task: Conductor - User Manual Verification 'Verification & Cleanup' (Protocol in workflow.md)
