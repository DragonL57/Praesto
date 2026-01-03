# Specification: Migration to Direct OpenAI-Compatible API (Poe Integration)

## Overview
This track involves a major architectural refactor to remove the dependency on the Vercel AI SDK and instead implement a direct, modular OpenAI-compatible API client. The primary immediate target is to integrate with the Poe API (via an OpenAI-compatible interface) while removing other legacy LLM providers. This change aims to streamline the API structure, reduce dependencies, and facilitate easier integration of future providers.

## Functional Requirements
- **Dependency Removal:**
    - Remove `ai` (Vercel AI SDK) and related packages (`@ai-sdk/*`) from the project.
    - Remove the `app/api/get_transcript` route (YouTube transcript feature).
    - Remove all existing LLM provider implementations dependent on Vercel AI SDK.

- **Backend Architecture:**
    - **`OpenAICompatibleClient`:** Create a modular, strongly-typed client class/module capable of interacting with any OpenAI-compatible API endpoint.
        - **Configuration:** Support dynamic Base URL and API Key configuration.
        - **Features:** Support chat completion endpoints, streaming responses (SSE), and message formatting.
    - **Poe Integration:** Configure an instance of `OpenAICompatibleClient` specifically for the Poe API.
    - **API Route Refactor:** Rewrite `app/api/chat/route.ts` to use the new client.
        - Ensure it handles authentication and request validation.
        - Stream raw OpenAI-format chunks back to the client.

- **Frontend Architecture:**
    - **Custom `useChat` Hook:** Develop a custom React hook to replace the Vercel `useChat`.
        - **State Management:** Handle `messages`, `input`, `isLoading`, and `error` states.
        - **Streaming:** Implement `fetch` logic to consume the streaming response, parse SSE events, and append tokens to the chat UI in real-time.
    - **UI Updates:** Update `components/chat.tsx` (and related components) to consume the new hook and data structures.

- **Tooling Preservation:**
    - Ensure existing tools (Calendar, Web Search, Weather, Website Content) are preserved.
    - *Note:* Since tool execution logic was likely tied to Vercel AI SDK, a lightweight "tool execution" layer or logic must be implemented to handle tool calls returned by the model (if supported by Poe's OpenAI interface) or client-side tool handling.

## Non-Functional Requirements
- **Performance:** Reduce overhead by removing the abstraction layer of the Vercel AI SDK.
- **Maintainability:** The new client should be framework-agnostic (pure TypeScript) where possible.
- **Type Safety:** Strict TypeScript interfaces for OpenAI request/response objects (e.g., `ChatCompletionRequest`, `ChatCompletionChunk`).

## Acceptance Criteria
- Vercel AI SDK is completely uninstalled.
- The application successfully connects to the Poe API using the new custom client.
- Chat functionality (sending messages, receiving streaming responses) works smoothly.
- The YouTube transcript API is removed.
- Existing tools (Weather, Search, etc.) either continue to function (if adapted) or are safely disabled/stubbed if their full adaptation is out of scope for this immediate refactor.

## Out of Scope
- Adding new features beyond the parity of the current chat experience.
- Complex retry logic or circuit breakers (basic error handling only).
