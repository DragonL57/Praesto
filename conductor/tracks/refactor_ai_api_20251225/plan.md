# Plan: Refactor AI Integration (Target: Z.AI / glm-4.7)

## Phase 1: Preparation & Dependency Removal
- [ ] Task: Audit and document all current usages of Vercel AI SDK (api routes, hooks, components).
- [ ] Task: Remove Vercel AI SDK packages from `package.json` and uninstall them.
- [ ] Task: Clean up imports in files identified during audit.
- [ ] Task: Conductor - User Manual Verification 'Preparation & Dependency Removal' (Protocol in workflow.md)

## Phase 2: Z.AI Client Implementation
- [ ] Task: Implement a custom `fetch`-based client in `lib/ai/client.ts` specifically configured for `https://api.z.ai/api/coding/paas/v4` and `glm-4.7`.
- [ ] Task: Implement SSE (Server-Sent Events) parsing logic for handling Z.AI streaming chunks.
- [ ] Task: Create helper functions for formatting messages to Z.AI spec.
- [ ] Task: Conductor - User Manual Verification 'Z.AI Client Implementation' (Protocol in workflow.md)

## Phase 3: Backend Refactor (Chat Route)
- [ ] Task: Refactor `app/api/chat/route.ts` to use the new Z.AI client.
- [ ] Task: Ensure the route handles the hardcoded `glm-4.7` model correctly.
- [ ] Task: Implement basic tool calling support for Z.AI (if supported) or temporarily disable tools to ensure core chat stability first.
- [ ] Task: Conductor - User Manual Verification 'Backend Refactor (Chat Route)' (Protocol in workflow.md)

## Phase 4: Frontend Adaptation
- [ ] Task: Replace `useChat` hook from `@ai-sdk/react` with a custom React hook `useCustomChat` compatible with the new streaming format.
- [ ] Task: Update Chat UI to consume the new hook.
- [ ] Task: Conductor - User Manual Verification 'Frontend Adaptation' (Protocol in workflow.md)

## Phase 5: Verification & Cleanup
- [ ] Task: Run full linting (`pnpm run lint`) and type checks (`tsc --noEmit`).
- [ ] Task: Perform end-to-end manual testing of chat with Z.AI.
- [ ] Task: Conductor - User Manual Verification 'Verification & Cleanup' (Protocol in workflow.md)
