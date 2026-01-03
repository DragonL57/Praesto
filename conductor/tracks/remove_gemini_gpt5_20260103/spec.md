# Specification: Remove Gemini and GPT-5-Chat Integration

## Overview
This track involves the complete removal of Google Gemini models and the specific `gpt-5-chat` model from the Poe provider. It also includes decommissioning the "Thinking Level" feature which was exclusive to Gemini models.

## Functional Requirements
- **Provider Cleanup:**
    - Remove `@ai-sdk/google` integration and the `google` provider from `lib/ai/providers.ts`.
    - Remove `gemini-3-flash-preview` from the `chatModels` list.
    - Remove the `gpt-5-chat` model definition and its enhanced wrapper from `lib/ai/providers.ts`.
- **UI/UX Cleanup:**
    - Delete the `components/thinking-level-selector.tsx` component.
    - Remove any usage of `ThinkingLevelSelector` (e.g., in `components/chat-header.tsx`).
    - Remove references to "Thinking Level" in the Cookies information page (`app/cookies/page.tsx`).
- **Backend/API Cleanup:**
    - Delete the `app/api/set-thinking-level-cookie` directory and its route.
    - In `app/(chat)/api/chat/route.ts`:
        - Remove thinking level cookie retrieval and the `isGeminiModel` flag.
        - Remove the logic that skips PDF text extraction for Gemini models (ensure all models use standard extraction).
        - Remove Gemini-specific thought signature handling logic.
- **Dependency Management:**
    - Uninstall `@ai-sdk/google` if it is no longer used by any other part of the system.

## Non-Functional Requirements
- **Type Safety:** Ensure all TypeScript interfaces (e.g., `ChatModel`, `ProviderOptions`) are updated to reflect the removal of Gemini-specific fields if necessary.
- **Stability:** Ensure existing models (GLM-4.7, Grok-4.1) remain fully functional.

## Acceptance Criteria
- Gemini and GPT-5-Chat models are no longer visible or selectable in the application.
- The "Thinking Level" selector is removed from the UI.
- PDF files uploaded to the chat undergo text extraction regardless of the selected model.
- No console errors or build warnings related to missing Gemini/GPT-5 imports.

## Out of Scope
- Integration of new models to replace the removed ones.
- Modifying other Poe models like `grok-4.1-fast-reasoning`.
