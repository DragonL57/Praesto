# Plan: Remove Gemini and GPT-5-Chat Integration

## Phase 1: Cleanup & Dependency Removal
- [x] Task: Delete `app/api/set-thinking-level-cookie` directory and route. f5eac3e
- [~] Task: Uninstall `@ai-sdk/google` dependency.
- [ ] Task: Conductor - User Manual Verification 'Cleanup & Dependency Removal' (Protocol in workflow.md)

## Phase 2: AI Logic Refactor
- [ ] Task: Refactor `lib/ai/providers.ts` to remove Google provider, Gemini models, GPT-5 model, and thinking-level logic.
- [ ] Task: Refactor `app/(chat)/api/chat/route.ts` to remove Gemini-specific PDF handling and thought signature logic.
- [ ] Task: Conductor - User Manual Verification 'AI Logic Refactor' (Protocol in workflow.md)

## Phase 3: UI & Documentation Cleanup
- [ ] Task: Remove `ThinkingLevelSelector` usage from `components/chat-header.tsx`.
- [ ] Task: Delete `components/thinking-level-selector.tsx` file.
- [ ] Task: Update `app/cookies/page.tsx` to remove references to the thinking-level cookie.
- [ ] Task: Update `components/admin/dashboard/model-usage.tsx` to remove Gemini placeholder if present.
- [ ] Task: Conductor - User Manual Verification 'UI & Documentation Cleanup' (Protocol in workflow.md)

## Phase 4: Final Verification
- [ ] Task: Run `pnpm run lint` and `pnpm exec tsc --noEmit` to ensure no regressions.
- [ ] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
