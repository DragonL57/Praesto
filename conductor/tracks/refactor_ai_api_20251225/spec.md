# Spec: Refactor AI Integration (Target: Z.AI / glm-4.7)

## Background
The current project uses the Vercel AI SDK. We are migrating to a direct API integration to reduce dependencies. The initial target for this migration is the **Z.AI** provider using the **glm-4.7** model.

## Goals
1.  **Remove Vercel AI SDK:** Uninstall `ai`, `@ai-sdk/openai`, etc.
2.  **Implement Z.AI Client:** Create a custom client to interact with `https://api.z.ai/api/coding/paas/v4`.
3.  **Model Standardization:** Hardcode the usage of `glm-4.7` for this initial refactor.
4.  **Preserve Core Chat:** Ensure standard chat functionality and streaming work correctly with the new API.

## Technical Requirements
- **Base URL:** `https://api.z.ai/api/coding/paas/v4`
- **Model:** `glm-4.7`
- **Streaming:** Implement logic to handle SSE streams from Z.AI.
- **Headers:** Ensure correct authorization headers are sent.

## Success Criteria
- The application sends chat requests to `https://api.z.ai/api/coding/paas/v4`.
- The `glm-4.7` model responds.
- Responses are streamed correctly to the frontend.
- No Vercel AI SDK code remains in the active code path.