# Messages Components - Refactored Architecture

This directory contains a modular, streamlined implementation of message components for the chat interface.

## Architecture Overview

The messages components have been refactored from a monolithic structure into focused, single-responsibility modules:

```
messages/
├── index.ts                      # Central export point
├── message.tsx                   # Main orchestrator component
├── messages.tsx                  # Message list container
│
├── message-types.ts              # Shared TypeScript definitions
├── message-utils.ts              # Utility functions
├── message-hooks.ts              # Custom React hooks
│
├── message-content.tsx           # Text content rendering
├── message-attachments.tsx       # File attachments display
├── message-tools.tsx             # Tool result rendering (Weather, Calendar, etc.)
├── message-actions.tsx           # Assistant message actions (copy, delete)
├── message-user-actions.tsx      # User message actions (edit, retry, delete)
├── message-editor.tsx            # Message editing interface
├── message-reasoning.tsx         # Chain of thought display
├── user-text.tsx                 # User text with line breaks
└── site-pill.tsx                 # Site badge component
```

## Component Responsibilities

### Core Components

#### `message.tsx`
- **Purpose**: Main orchestrator for rendering a single message
- **Responsibilities**:
  - Coordinates all sub-components
  - Manages message state (view/edit modes)
  - Handles copy operations
  - Renders reasoning, content, attachments, tools, and actions
- **Props**: `PurePreviewMessageProps` (chatId, message, isLoading, setMessages, reload, append, isReadonly)

#### `messages.tsx`
- **Purpose**: Container for the message list
- **Responsibilities**:
  - Virtualization for performance (>20 messages)
  - Auto-scroll management
  - Message list iteration
- **Props**: `MessagesProps`

### Sub-Components

#### `message-content.tsx`
- **Purpose**: Renders text content with appropriate formatting
- **Responsibilities**:
  - User messages: Gradient backgrounds, line break preservation
  - Assistant messages: Markdown rendering with syntax highlighting
  - Copy event handling

#### `message-attachments.tsx`
- **Purpose**: Displays file attachments
- **Responsibilities**:
  - Extract file parts from AI SDK 5.x message structure
  - Render previews using `PreviewAttachment` component

#### `message-tools.tsx`
- **Purpose**: Renders tool call results (Weather, Calendar, etc.)
- **Responsibilities**:
  - Tool call skeletons during loading
  - Standalone tool results
  - Grouped tool results (related calls)
  - Filtering of reasoning tools

#### `message-actions.tsx`
- **Purpose**: Action buttons for assistant messages
- **Responsibilities**:
  - Copy message text
  - Delete message
  - Mobile/desktop visibility logic

#### `message-user-actions.tsx`
- **Purpose**: Action buttons for user messages
- **Responsibilities**:
  - Edit message
  - Retry generation
  - Copy message
  - Delete message

#### `message-reasoning.tsx`
- **Purpose**: Display chain of thought reasoning
- **Responsibilities**:
  - Render thinking process
  - Web search results
  - Fetched page info
  - Collapsible accordion UI

#### `user-text.tsx`
- **Purpose**: Preserve line breaks in user messages
- **Responsibilities**:
  - Split text by newlines
  - Maintain whitespace

### Utility Modules

#### `message-types.ts`
- **Purpose**: Centralized TypeScript type definitions
- **Contains**:
  - `WebSearchResult`, `WebSearchData`, `FetchedPageInfoData`
  - `ReasoningContentItem`, `EnhancedMessagePart`
  - Component prop types
  - Tool part interfaces

#### `message-utils.ts`
- **Purpose**: Pure utility functions
- **Contains**:
  - Tool detection: `isToolPart`, `extractToolName`, `getToolCallId`
  - Tool state: `isToolResultAvailable`, `getToolOutput`
  - Styling: `getGradientStyle`
  - Classification: `isReasoningTool`, `isCalendarTool`
  - Grouping: `shouldGroupTools`, `applyToolGrouping`

#### `message-hooks.ts`
- **Purpose**: Custom React hooks for message processing
- **Contains**:
  - `useReasoningElements`: Extract reasoning from message parts
  - `useProcessedParts`: Filter, clean, and group message parts

## Data Flow

```
message.tsx (orchestrator)
    ↓
├── useReasoningElements()          → Extract reasoning elements
├── useProcessedParts()             → Process & group parts
    ↓
├── MessageReasoning                → Display chain of thought
├── MessageAttachments              → Display files
├── MessageContent                  → Display text
│   └── UserTextWithLineBreaks     → (for user messages)
├── MessageTools                    → Display tool results
│   ├── ToolCallSkeleton           → (loading state)
│   ├── ToolResult                 → (standalone)
│   └── ToolGroup                  → (grouped)
├── MessageActions                  → (assistant actions)
└── MessageUserActions              → (user actions)
```

## Key Design Patterns

### 1. **Separation of Concerns**
Each component has a single, well-defined responsibility. No component does more than one job.

### 2. **Pure Functions**
Utility functions in `message-utils.ts` are pure and predictable, making them easy to test and reason about.

### 3. **Custom Hooks**
Complex processing logic is encapsulated in hooks (`useReasoningElements`, `useProcessedParts`), keeping components clean.

### 4. **Type Safety**
All shared types are defined in `message-types.ts`, ensuring consistency across components.

### 5. **Memoization**
Components use `React.memo` and `useMemo` to prevent unnecessary re-renders.

### 6. **Composability**
Components are small and composable, making it easy to rearrange or extend functionality.

## AI SDK 5.x Compatibility

This implementation is fully compatible with AI SDK 5.x:

- **Parts Array**: Uses `message.parts` instead of deprecated `experimental_attachments`
- **Tool States**: Handles `input-available` and `output-available` states
- **File Parts**: Extracts file attachments from parts array
- **Tool Output**: Reads `output` property directly from tool parts

## Usage Examples

### Basic Import
```typescript
import { PreviewMessage, Messages } from '@/components/messages';
```

### Using Utilities
```typescript
import { isToolPart, extractToolName, getGradientStyle } from '@/components/messages';

// Check if part is a tool
if (isToolPart(part)) {
  const toolName = extractToolName(part);
  // ...
}

// Get gradient style for user message
const gradient = getGradientStyle(message);
```

### Using Hooks
```typescript
import { useReasoningElements, useProcessedParts } from '@/components/messages';

function MyComponent({ message }) {
  const { reasoningElements, indicesToFilter } = useReasoningElements(message);
  const processedParts = useProcessedParts(message, indicesToFilter);
  // ...
}
```

### Using Types
```typescript
import type { EnhancedMessagePart, ReasoningContentItem } from '@/components/messages';

function processReasoningElement(item: ReasoningContentItem) {
  if (typeof item === 'string') {
    // Handle text reasoning
  } else if (item.type === 'webSearch') {
    // Handle web search
  }
}
```

## Benefits of Refactoring

### 1. **Maintainability**
- Smaller files are easier to understand and modify
- Clear separation makes debugging straightforward
- Changes to one feature don't affect others

### 2. **Reusability**
- Components can be used independently
- Utilities can be shared across features
- Hooks encapsulate reusable logic

### 3. **Testability**
- Pure functions are easy to unit test
- Components can be tested in isolation
- Mock dependencies are straightforward

### 4. **Performance**
- Targeted memoization prevents unnecessary renders
- Smaller components re-render less frequently
- Virtualization handles large message lists

### 5. **Developer Experience**
- Clear file names indicate purpose
- Central index file simplifies imports
- TypeScript provides excellent autocomplete

## Migration Guide

If migrating from the old monolithic structure:

1. **Update imports**: Use the central index file
   ```typescript
   // Old
   import { PreviewMessage } from './messages/message';
   
   // New
   import { PreviewMessage } from './messages';
   ```

2. **Use exported types**: Import types from the module
   ```typescript
   import type { EnhancedMessagePart } from './messages';
   ```

3. **Leverage utilities**: Replace inline logic with utilities
   ```typescript
   // Old
   const isToolCall = part.type.startsWith('tool-');
   
   // New
   import { isToolPart } from './messages';
   const isToolCall = isToolPart(part);
   ```

## Future Enhancements

Potential areas for improvement:

- [ ] Extract more tool-specific rendering logic
- [ ] Add unit tests for utilities and hooks
- [ ] Implement error boundaries for sub-components
- [ ] Add accessibility enhancements (ARIA labels)
- [ ] Create Storybook stories for each component
- [ ] Add performance monitoring

## Related Documentation

- Main project architecture: `/AGENTS.md`
- AI SDK documentation: `lib/ai/AGENTS.md`
- Database schema: `lib/db/AGENTS.md`
- UI components: `components/ui/AGENTS.md`
