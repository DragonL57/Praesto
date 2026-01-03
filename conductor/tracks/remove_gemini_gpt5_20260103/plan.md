# Plan: Remove Gemini and GPT-5-Chat Integration

## Phase 1: Cleanup & Dependency Removal [checkpoint: ca05b63]
- [x] Task: Delete `app/api/set-thinking-level-cookie` directory and route. f5eac3e
- [x] Task: Uninstall `@ai-sdk/google` dependency. 38bb4a9
- [x] Task: Conductor - User Manual Verification 'Cleanup & Dependency Removal' (Protocol in workflow.md) 400490b

## Phase 2: AI Logic Refactor [checkpoint: 2e09ea6]
- [x] Task: Refactor `lib/ai/providers.ts` to remove Google provider, Gemini models, GPT-5 model, and thinking-level logic. 38bb4a9
- [x] Task: Refactor `app/(chat)/api/chat/route.ts` to remove Gemini-specific PDF handling and thought signature logic. 38bb4a9
- [x] Task: Conductor - User Manual Verification 'AI Logic Refactor' (Protocol in workflow.md) 745d122

## Phase 3: UI & Documentation Cleanup [checkpoint: 1824ef7]
- [x] Task: Remove `ThinkingLevelSelector` usage from `components/chat-header.tsx`. bcf4594
- [x] Task: Delete `components/thinking-level-selector.tsx` file. f8ada76
- [x] Task: Update `app/cookies/page.tsx` to remove references to the thinking-level cookie. (no changes needed)
- [x] Task: Update `components/admin/dashboard/model-usage.tsx` to remove Gemini placeholder if present. 29c4b02
- [ ] Task: Conductor - User Manual Verification 'UI & Documentation Cleanup' (Protocol in workflow.md)

## Phase 4: Final Verification
- [x] Task: Run `pnpm run lint` and `pnpm exec tsc --noEmit` to ensure no regressions. 4076b69
- [~] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)